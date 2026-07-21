import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// POST /api/follow/:userId - toggle follow/unfollow the target user
router.post("/:userId", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const targetId = c.req.param("userId");
  if (targetId === user.id) {
    return c.json({ error: { message: "Cannot follow yourself", code: "SELF_FOLLOW" } }, 400);
  }

  const existing = await prisma.follow.findUnique({
    where: { followerId_followingId: { followerId: user.id, followingId: targetId } },
  });

  if (existing) {
    await prisma.follow.delete({ where: { id: existing.id } });
    return c.json({ data: { following: false } });
  }

  await prisma.follow.create({ data: { followerId: user.id, followingId: targetId } });
  return c.json({ data: { following: true } });
});

// GET /api/follow/:userId - follower/following counts + whether I follow them
router.get("/:userId", async (c) => {
  const user = c.get("user");
  const targetId = c.req.param("userId");

  const [followers, following, mine] = await Promise.all([
    prisma.follow.count({ where: { followingId: targetId } }),
    prisma.follow.count({ where: { followerId: targetId } }),
    user
      ? prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: user.id, followingId: targetId } },
        })
      : Promise.resolve(null),
  ]);

  return c.json({ data: { followers, following, isFollowing: !!mine } });
});

export { router as followRouter };
