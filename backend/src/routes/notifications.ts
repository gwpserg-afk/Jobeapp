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
