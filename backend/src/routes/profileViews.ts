import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const profileViewsRouter = new Hono<{ Variables: Variables }>();

// GET /api/profile-views/mine - Get who viewed my profile (last 30 days, deduplicated)
profileViewsRouter.get("/mine", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  // Check premium status
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPremium: true },
  });

  if (!fullUser?.isPremium) {
    return c.json({ error: { message: "Premium required", code: "PREMIUM_REQUIRED" } }, 403);
  }

  const views = await prisma.profileView.findMany({
    where: {
      viewedUserId: user.id,
      createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: "desc" },
    include: {
      viewer: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  // Deduplicate: keep only the most recent view per viewer
  const seen = new Set<string>();
  const unique = views.filter((v) => {
    if (seen.has(v.viewerId)) return false;
    seen.add(v.viewerId);
    return true;
  });

  const result = unique.map((v) => ({
    viewerId: v.viewerId,
    viewerName: v.viewer.name,
    viewerImage: v.viewer.image,
    viewedAt: v.createdAt.toISOString(),
  }));

  return c.json({ data: result });
});

// POST /api/profile-views/:userId - Record a profile view
profileViewsRouter.post("/:userId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const viewedUserId = c.req.param("userId");

  // Don't record self-views
  if (user.id === viewedUserId) {
    return c.json({ data: { recorded: false } });
  }

  // Check if this viewer already has a recent view (within last 24 hours) to avoid spam
  const recentView = await prisma.profileView.findFirst({
    where: {
      viewerId: user.id,
      viewedUserId,
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });

  if (!recentView) {
    await prisma.profileView.create({
      data: { viewerId: user.id, viewedUserId },
    });
  }

  return c.json({ data: { recorded: !recentView } });
});

export { profileViewsRouter };
