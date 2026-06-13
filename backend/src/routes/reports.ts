import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const reportsRouter = new Hono<{ Variables: Variables }>();

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

    // Check if already reported by this user
    const existing = await prisma.report.findFirst({
      where: { reporterId: user.id, type, targetId }
    });

    if (existing) {
      return c.json({ data: { alreadyReported: true } });
    }

    await prisma.report.create({
      data: { reporterId: user.id, type, targetId, reason }
    });

    // If reporting a post, hide it immediately
    if (type === "post") {
      await prisma.post.update({
        where: { id: targetId },
        data: { isHidden: true }
      }).catch(() => {}); // ignore if post not found
    }

    return c.json({ data: { reported: true } }, 201);
  }
);

export { reportsRouter };
