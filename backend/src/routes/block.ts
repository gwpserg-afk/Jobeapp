import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// POST /api/block/:userId — toggle block/unblock
router.post("/:userId", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const targetId = c.req.param("userId");
  if (targetId === user.id) {
    return c.json({ error: { message: "Cannot block yourself", code: "SELF_BLOCK" } }, 400);
  }

  const existing = await prisma.block.findUnique({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId: targetId } },
  });

  if (existing) {
    await prisma.block.delete({ where: { id: existing.id } });
    return c.json({ data: { blocked: false } });
  }

  await prisma.block.create({ data: { blockerId: user.id, blockedId: targetId } });
  // Also drop any follow relationship both ways when blocking.
  await prisma.follow.deleteMany({
    where: {
      OR: [
        { followerId: user.id, followingId: targetId },
        { followerId: targetId, followingId: user.id },
      ],
    },
  }).catch(() => {});
  return c.json({ data: { blocked: true } });
});

// GET /api/block — list ids I've blocked
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  const rows = await prisma.block.findMany({ where: { blockerId: user.id }, select: { blockedId: true } });
  return c.json({ data: { blockedIds: rows.map((r) => r.blockedId) } });
});

export { router as blockRouter };
