import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const verificationRouter = new Hono<{ Variables: Variables }>();

// POST /api/verification/phone - User self-verifies by providing a phone number (blue checkmark)
verificationRouter.post(
  "/phone",
  zValidator("json", z.object({ phone: z.string().min(7).max(20) })),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { phone: c.req.valid("json").phone, isVerified: true },
    });

    return c.json({ data: { isVerified: true, phone: c.req.valid("json").phone } });
  }
);

// PATCH /api/verification/gold/:userId - Admin assigns/revokes gold badge
verificationRouter.patch("/gold/:userId", async (c) => {
  const adminKey = c.req.header("X-Admin-Key");
  const expectedKey = process.env.ADMIN_KEY;
  if (adminKey !== expectedKey) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  const { userId } = c.req.param();
  const targetUser = await prisma.user.findUnique({ where: { id: userId } });
  if (!targetUser) {
    return c.json({ error: { message: "User not found", code: "NOT_FOUND" } }, 404);
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: { isGoldVerified: !targetUser.isGoldVerified },
  });

  return c.json({ data: { isGoldVerified: updated.isGoldVerified } });
});

export { verificationRouter };
