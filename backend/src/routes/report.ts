import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// POST /api/report - Report a post, profile image, or comment
router.post(
  "/",
  zValidator(
    "json",
    z.object({
      type: z.enum(["post", "profile_image", "comment"]),
      targetId: z.string().min(1),
      reason: z.string().min(1).max(500),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    const { type, targetId, reason } = c.req.valid("json");

    await prisma.report.create({
      data: {
        reporterId: user.id,
        type,
        targetId,
        reason,
      },
    });

    return c.json({ data: { success: true } }, 201);
  }
);

export { router as reportRouter };
