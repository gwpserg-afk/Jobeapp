import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { requireAuth } from "../middleware";
import type { Variables } from "../types";

const creditsRouter = new Hono<{ Variables: Variables }>();

// GET /api/credits - Get current credit balance
creditsRouter.get("/", async (c) => {
  const user = requireAuth(c);
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  });

  return c.json({ data: { credits: fullUser?.credits ?? 0 } });
});

// POST /api/credits/purchase - Purchase credits (mock — payment integration comes later)
// Packages: 10, 25, 50, or 100 credits
creditsRouter.post(
  "/purchase",
  zValidator(
    "json",
    z.object({
      package: z.enum(["10", "25", "50", "100"]),
    })
  ),
  async (c) => {
    const user = requireAuth(c);
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const amount = parseInt(c.req.valid("json").package, 10);

    const [updated] = await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { increment: amount } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount,
          type: "purchase",
          note: `Purchased ${amount} credits`,
        },
      }),
    ]);

    return c.json({ data: { credits: updated.credits } });
  }
);

// POST /api/credits/spend - Deduct 1 credit from the authenticated user
creditsRouter.post("/spend", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  });

  if ((fullUser?.credits ?? 0) <= 0) {
    return c.json(
      { error: { message: "Insufficient credits", code: "INSUFFICIENT_CREDITS" } },
      402
    );
  }

  const [updated] = await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { credits: { decrement: 1 } },
    }),
    prisma.creditTransaction.create({
      data: {
        userId: user.id,
        amount: -1,
        type: "spend",
        note: "Demo job application",
      },
    }),
  ]);

  return c.json({ data: { credits: updated.credits } });
});

export { creditsRouter };
