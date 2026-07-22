import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";
import { containsProfanity, moderateAI } from "../utils/profanityFilter";

const reportsRouter = new Hono<{ Variables: Variables }>();

// Tiered auto-hide. Never on a single report (avoids false flags / trolling).
//  - If AI RE-FLAGS the reported content as bad → hide once a few people agree.
//  - If AI judges it CLEAN (e.g. spam/scam the AI can't detect) → only hide on
//    strong community consensus.
// The worst content (explicit/hate/violence/profanity) never gets here — it's
// blocked at post-creation. Everything reported still shows in the dashboard.
const AI_FLAGGED_THRESHOLD = 3;   // AI + 3 reporters agree → hide
const CONSENSUS_THRESHOLD = 10;   // AI-clean, but 10 reporters → hide (spam backstop)

reportsRouter.post(
  "/",
  zValidator("json", z.object({
    type: z.enum(["post", "profile_image", "comment"]),
    targetId: z.string(),
    reason: z.string().min(1).max(500),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const { type, targetId, reason } = c.req.valid("json");

    // One report per user per target
    const existing = await prisma.report.findFirst({
      where: { reporterId: user.id, type, targetId },
    });
    if (existing) {
      return c.json({ data: { alreadyReported: true } });
    }

    await prisma.report.create({
      data: { reporterId: user.id, type, targetId, reason },
    });

    // Smart moderation for posts: a single report must NOT nuke a good post.
    // Re-analyze the content; hide only if AI/filter confirms it's bad, OR the
    // report count crosses the community-consensus threshold.
    let hidden = false;
    if (type === "post") {
      const post = await prisma.post.findUnique({ where: { id: targetId } }).catch(() => null);
      if (post && !post.isHidden) {
        const aiFlagged =
          containsProfanity(post.content) ||
          (await moderateAI({ text: post.content, imageUrl: post.imageUrl ?? undefined }));
        const reportCount = await prisma.report.count({ where: { type: "post", targetId } });

        const threshold = aiFlagged ? AI_FLAGGED_THRESHOLD : CONSENSUS_THRESHOLD;
        if (reportCount >= threshold) {
          await prisma.post.update({ where: { id: targetId }, data: { isHidden: true } }).catch(() => {});
          hidden = true;
        }
      }
    }

    return c.json({ data: { reported: true, hidden } }, 201);
  }
);

// GET /api/reports?key=ADMIN_KEY — admin: list all reports for the dashboard.
// Protected by ADMIN_KEY (not a user session) so the internal dashboard can read it.
reportsRouter.get("/", async (c) => {
  const key = c.req.query("key") ?? c.req.header("x-admin-key");
  if (!process.env.ADMIN_KEY || key !== process.env.ADMIN_KEY) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  const reports = await prisma.report.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      reporter: { select: { id: true, name: true, username: true } },
    },
  });

  // Enrich with a snippet of what was reported
  const enriched = await Promise.all(
    reports.map(async (r) => {
      let snippet = "";
      let author = "";
      if (r.type === "post" || r.type === "comment") {
        const row = r.type === "post"
          ? await prisma.post.findUnique({ where: { id: r.targetId }, include: { user: { select: { name: true, username: true } } } })
          : await prisma.postComment.findUnique({ where: { id: r.targetId }, include: { user: { select: { name: true, username: true } } } });
        snippet = (row as { content?: string } | null)?.content?.slice(0, 140) ?? "(deleted)";
        author = (row as { user?: { name?: string } } | null)?.user?.name ?? "";
      }
      return {
        id: r.id, type: r.type, targetId: r.targetId, reason: r.reason,
        createdAt: r.createdAt, reporter: r.reporter, snippet, author,
      };
    })
  );

  return c.json({ data: { reports: enriched } });
});

export { reportsRouter };
