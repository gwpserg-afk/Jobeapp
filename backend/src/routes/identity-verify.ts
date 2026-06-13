import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// GET /api/identity-verify - Get current verification status
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const record = await prisma.identityVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  return c.json({
    data: {
      status: record?.status ?? null,
      createdAt: record?.createdAt ?? null,
      isVerified: user.isVerified,
    },
  });
});

// POST /api/identity-verify - Submit identity verification
router.post(
  "/",
  zValidator(
    "json",
    z.object({
      nationalIdNumber: z.string().min(1).max(50),
      nationalIdPhotoUrl: z.string().optional(),
      nationalIdBackPhotoUrl: z.string().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const { nationalIdNumber, nationalIdPhotoUrl, nationalIdBackPhotoUrl } = c.req.valid("json");

    // Check for existing pending request
    const existing = await prisma.identityVerification.findFirst({
      where: { userId: user.id, status: "pending" },
    });
    if (existing) {
      return c.json({ error: { message: "Verification already pending", code: "ALREADY_PENDING" } }, 409);
    }

    const record = await prisma.identityVerification.create({
      data: {
        userId: user.id,
        nationalIdNumber,
        nationalIdPhotoUrl: nationalIdPhotoUrl ?? null,
        nationalIdBackPhotoUrl: nationalIdBackPhotoUrl ?? null,
        status: "pending",
      },
    });

    return c.json({ data: { id: record.id, status: record.status } }, 201);
  }
);

// PATCH /api/identity-verify/:id - Admin: approve/reject (requires X-Admin-Key header)
router.patch("/:id", async (c) => {
  const adminKey = c.req.header("X-Admin-Key");
  if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
    return c.json({ error: { message: "Forbidden", code: "FORBIDDEN" } }, 403);
  }

  const id = c.req.param("id");
  const body = await c.req.json();
  const status = body.status as "verified" | "rejected";

  if (!["verified", "rejected"].includes(status)) {
    return c.json({ error: { message: "Invalid status", code: "INVALID_STATUS" } }, 400);
  }

  const record = await prisma.identityVerification.update({
    where: { id },
    data: { status, reviewedAt: new Date() },
  });

  // If verified, set user.isVerified = true
  if (status === "verified") {
    await prisma.user.update({
      where: { id: record.userId },
      data: { isVerified: true },
    });
  }

  return c.json({ data: { id: record.id, status: record.status } });
});

export { router as identityVerifyRouter };
