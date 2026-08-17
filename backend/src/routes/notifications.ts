import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// GET /api/notifications - Get user notifications
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const query = c.req.query();
  const page = Math.max(1, parseInt(query["page"] ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(query["limit"] ?? "20", 10)));
  const skip = (page - 1) * limit;
  const unreadOnly = query["unreadOnly"] === "true";

  const where: Record<string, unknown> = { userId: user.id };
  if (unreadOnly) {
    where["isRead"] = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: { userId: user.id, isRead: false },
    }),
  ]);

  return c.json({
    data: {
      notifications,
      unreadCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// POST /api/notifications/seed-demo - give a fresh account a few realistic demo
// notifications so the screen looks alive. Idempotent: only runs if the user has
// none. Uses real seed entrepreneurs as the "actors" (with their avatars).
router.post("/seed-demo", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const existing = await prisma.notification.count({ where: { userId: user.id } });
  if (existing > 0) {
    return c.json({ data: { seeded: false } });
  }

  const actors = await prisma.user.findMany({
    where: { username: { in: ["awa_ndiaye", "moussa_ba", "sokhna_mbaye", "fatou_sarr"] } },
    select: { id: true, name: true, username: true, image: true },
  });
  const byName = (u: string) => actors.find((a) => a.username === u);

  const rows: {
    type: string; title: string; body: string; hoursAgo: number;
    actor?: { id: string; name: string; username: string | null; image: string | null };
  }[] = [
    { type: "welcome", title: "Bienvenue sur Jobé 🎉", body: "Complète ton profil et publie ta première idée.", hoursAgo: 0.1 },
    { type: "follow", title: "Nouvel abonné", body: "a commencé à te suivre", hoursAgo: 2, actor: byName("awa_ndiaye") },
    { type: "like", title: "Nouveau j'aime", body: "a aimé ta publication", hoursAgo: 5, actor: byName("moussa_ba") },
    { type: "comment", title: "Nouveau commentaire", body: "a commenté ta publication", hoursAgo: 8, actor: byName("sokhna_mbaye") },
    { type: "follow", title: "Nouvel abonné", body: "a commencé à te suivre", hoursAgo: 26, actor: byName("fatou_sarr") },
  ];

  const now = Date.now();
  for (const r of rows) {
    await prisma.notification.create({
      data: {
        userId: user.id,
        type: r.type,
        title: r.title,
        body: r.actor ? `${r.actor.name} ${r.body}` : r.body,
        isRead: false,
        createdAt: new Date(now - r.hoursAgo * 3600_000),
        dataJson: JSON.stringify({
          actorId: r.actor?.id ?? null,
          actorName: r.actor?.name ?? null,
          actorUsername: r.actor?.username ?? null,
          actorImage: r.actor?.image ?? null,
        }),
      },
    });
  }

  return c.json({ data: { seeded: true, count: rows.length } });
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put("/:id/read", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const notifId = c.req.param("id");

  const notification = await prisma.notification.findFirst({
    where: { id: notifId, userId: user.id },
  });

  if (!notification) {
    return c.json(
      { error: { message: "Notification not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.notification.update({
    where: { id: notifId },
    data: { isRead: true },
  });

  return c.json({ data: { success: true } });
});

// PUT /api/notifications/read-all - Mark all notifications as read
router.put("/read-all", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  await prisma.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });

  return c.json({ data: { success: true } });
});

export { router as notificationsRouter };
