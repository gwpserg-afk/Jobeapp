import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { Variables } from "../types";

// Credit costs per duration
const DURATION_CREDITS: Record<number, number> = {
  3: 5,
  7: 10,
  14: 18,
  30: 30,
};

const promotionsRouter = new Hono<{ Variables: Variables }>();

// GET /api/promotions — public, returns all active (non-expired) promotions
promotionsRouter.get("/", async (c) => {
  const now = new Date();
  const promotions = await prisma.promotion.findMany({
    where: { expiresAt: { gt: now } },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          isVerified: true,
          isGoldVerified: true,
          isPremium: true,
        },
      },
    },
  });
  return c.json({ data: promotions });
});

// GET /api/promotions/my — authenticated, returns own promotions (including expired)
promotionsRouter.get("/my", async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const promotions = await prisma.promotion.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });
  return c.json({ data: promotions });
});

// POST /api/promotions — create a promotion (requires isPremium + sufficient credits)
promotionsRouter.post(
  "/",
  zValidator(
    "json",
    z.object({
      businessName: z.string().min(1).max(100),
      title: z.string().min(1).max(150),
      content: z.string().min(1).max(1000),
      imageUrl: z.string().url().optional().nullable(),
      websiteUrl: z.string().url().optional().nullable(),
      durationDays: z.union([
        z.literal(3),
        z.literal(7),
        z.literal(14),
        z.literal(30),
      ]),
    })
  ),
  async (c) => {
    const user = requireAuth(c);
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const body = c.req.valid("json");
    const creditCost = DURATION_CREDITS[body.durationDays] as number;

    // Check premium status and credits
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { isPremium: true, credits: true },
    });

    if (!fullUser?.isPremium) {
      return c.json(
        {
          error: {
            message: "A premium account is required to post promotions.",
            code: "PREMIUM_REQUIRED",
          },
        },
        403
      );
    }

    if ((fullUser.credits ?? 0) < creditCost) {
      return c.json(
        {
          error: {
            message: `Insufficient credits. This promotion requires ${creditCost} credits.`,
            code: "NO_CREDITS",
          },
        },
        402
      );
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + body.durationDays);

    const [promotion] = await prisma.$transaction([
      prisma.promotion.create({
        data: {
          userId: user.id,
          businessName: body.businessName,
          title: body.title,
          content: body.content,
          imageUrl: body.imageUrl ?? null,
          websiteUrl: body.websiteUrl ?? null,
          durationDays: body.durationDays,
          creditCost,
          expiresAt,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: creditCost } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: -creditCost,
          type: "spend",
          note: `Business promotion (${body.durationDays} days)`,
        },
      }),
    ]);

    return c.json({ data: promotion }, 201);
  }
);

// DELETE /api/promotions/:id — owner only
promotionsRouter.delete("/:id", async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const { id } = c.req.param();
  const promotion = await prisma.promotion.findUnique({ where: { id } });

  if (!promotion) return c.json({ error: { message: "Not found" } }, 404);
  if (promotion.userId !== user.id)
    return c.json({ error: { message: "Forbidden" } }, 403);

  await prisma.promotion.delete({ where: { id } });
  return c.body(null, 204);
});

export { promotionsRouter };
