import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const subscriptionRouter = new Hono<{ Variables: Variables }>();

// POST /api/subscription/subscribe - Subscribe to premium
subscriptionRouter.post("/subscribe", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  // Grant 20 premium recharge credits alongside activating premium
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { isPremium: true, premiumExpiresAt: null, credits: { increment: 20 } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 20,
        type: "premium_recharge",
        note: "Premium subscription credit recharge",
      },
    }),
  ]);

  return c.json({ data: { isPremium: updated.isPremium } });
});

// POST /api/subscription/cancel - Cancel premium
subscriptionRouter.post("/cancel", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isPremium: false },
  });

  return c.json({ data: { isPremium: updated.isPremium } });
});

// GET /api/subscription/status - Get current subscription status
subscriptionRouter.get("/status", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPremium: true, premiumExpiresAt: true },
  });

  return c.json({
    data: {
      isPremium: fullUser?.isPremium ?? false,
      premiumExpiresAt: fullUser?.premiumExpiresAt?.toISOString() ?? null,
    },
  });
});

// POST /api/subscription/recharge - Monthly credit recharge for premium users
subscriptionRouter.post("/recharge", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  // Get current user with premium status
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isPremium: true, premiumExpiresAt: true },
  });

  if (!fullUser?.isPremium) {
    return c.json({ error: { message: "Premium required", code: "NOT_PREMIUM" } }, 403);
  }

  // Check if already recharged this month (look at credit transactions)
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const recentRecharge = await prisma.creditTransaction.findFirst({
    where: {
      userId: user.id,
      type: "premium_recharge",
      createdAt: { gte: startOfMonth },
    },
  });

  if (recentRecharge) {
    return c.json({ error: { message: "Already recharged this month", code: "ALREADY_RECHARGED" } }, 409);
  }

  // Grant 20 credits
  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { increment: 20 } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: 20,
        type: "premium_recharge",
        note: "Monthly premium credit recharge",
      },
    }),
  ]);

  return c.json({ data: { credits: updated.credits } });
});

export { subscriptionRouter };
