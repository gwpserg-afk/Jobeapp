import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// GET /api/me - Get current user info
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  // Check if user has a profile (candidate or company)
  let hasProfile = false;
  let profilePhotoUrl: string | null = null;

  if (user.accountType === "candidate") {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, profilePhotoUrl: true },
    });
    hasProfile = !!profile;
    profilePhotoUrl = profile?.profilePhotoUrl ?? null;
  } else if (user.accountType === "recruiter") {
    const company = await prisma.company.findUnique({
      where: { userId: user.id },
      select: { id: true, logoUrl: true },
    });
    hasProfile = !!company;
    profilePhotoUrl = company?.logoUrl ?? null;
  }

  // Update last active
  await prisma.user.update({
    where: { id: user.id },
    data: { lastActiveAt: new Date() },
  });

  // Get full user data including credits
  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { credits: true },
  });

  // Get unread notification count
  const unreadNotifications = await prisma.notification.count({
    where: { userId: user.id, isRead: false },
  });

  // Get unread message count
  const unreadMessages = await prisma.message.count({
    where: { receiverId: user.id, isRead: false },
  });

  return c.json({
    data: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      accountType: user.accountType,
      phone: user.phone,
      isVerified: user.isVerified,
      isGoldVerified: user.isGoldVerified,
      isPremium: user.isPremium,
      languagePreference: user.languagePreference,
      isActive: user.isActive,
      hasProfile,
      profilePhotoUrl,
      unreadNotifications,
      unreadMessages,
      credits: fullUser?.credits ?? 0,
    },
  });
});

// PUT /api/me - Update user settings
router.put("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await c.req.json()) as Record<string, unknown>;
  } catch {
    return c.json(
      { error: { message: "Invalid JSON", code: "VALIDATION_ERROR" } },
      400
    );
  }

  const allowedFields = ["name", "phone", "languagePreference", "image"];
  const updateData: Record<string, unknown> = {};

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return c.json(
      { error: { message: "No valid fields to update", code: "VALIDATION_ERROR" } },
      400
    );
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: updateData,
  });

  return c.json({
    data: {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      image: updated.image,
      accountType: updated.accountType,
      phone: updated.phone,
      isVerified: updated.isVerified,
      isGoldVerified: updated.isGoldVerified,
      isPremium: updated.isPremium,
      languagePreference: updated.languagePreference,
      isActive: updated.isActive,
    },
  });
});

export { router as meRouter };
