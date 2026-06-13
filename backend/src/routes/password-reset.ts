import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import bcryptjs from "bcryptjs";

const passwordResetRouter = new Hono();

// In-memory store: email (lowercased) -> { code, expiresAt }
const resetCodes = new Map<string, { code: string; expiresAt: number }>();

async function resolveIdentifierToEmail(identifier: string): Promise<string | null> {
  const id = identifier.trim();

  if (id.includes("@")) {
    const user = await prisma.user.findUnique({
      where: { email: id },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  if (/^\+?[\d\s\-().]{7,}$/.test(id)) {
    const normalized = id.replace(/[\s\-().]/g, "");
    const user = await prisma.user.findFirst({
      where: { phone: { contains: normalized } },
      select: { email: true },
    });
    return user?.email ?? null;
  }

  // Username / name lookup (case-insensitive)
  const user = await prisma.user.findFirst({
    where: { name: { equals: id.toLowerCase() } },
    select: { email: true },
  });
  return user?.email ?? null;
}

// POST /api/password-reset/request
passwordResetRouter.post(
  "/request",
  zValidator("json", z.object({ identifier: z.string().min(1) })),
  async (c) => {
    const { identifier } = c.req.valid("json");

    const email = await resolveIdentifierToEmail(identifier);

    // Always return success — don't leak user existence
    if (!email) {
      return c.json({ data: { message: "Code envoyé" } });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    resetCodes.set(email.toLowerCase(), { code, expiresAt });

    // In development, log reset code to terminal. Replace with Resend/SendGrid for production.
    console.log(`\n🔑 Password reset code for ${email}: ${code}\n`);

    return c.json({ data: { message: "Code envoyé" } });
  }
);

// POST /api/password-reset/confirm
passwordResetRouter.post(
  "/confirm",
  zValidator(
    "json",
    z.object({
      identifier: z.string().min(1),
      code: z.string().min(1),
      newPassword: z.string().min(8, "Le mot de passe doit contenir au moins 8 caractères"),
    })
  ),
  async (c) => {
    const { identifier, code, newPassword } = c.req.valid("json");

    const email = await resolveIdentifierToEmail(identifier);

    if (!email) {
      return c.json(
        { error: { message: "Code invalide ou expiré", code: "INVALID_CODE" } },
        400
      );
    }

    const key = email.toLowerCase();
    const stored = resetCodes.get(key);

    if (!stored || Date.now() > stored.expiresAt) {
      resetCodes.delete(key);
      return c.json(
        { error: { message: "Code invalide ou expiré", code: "INVALID_CODE" } },
        400
      );
    }

    if (stored.code !== code) {
      return c.json(
        { error: { message: "Code invalide ou expiré", code: "INVALID_CODE" } },
        400
      );
    }

    // One-time use — delete immediately after verification
    resetCodes.delete(key);

    // Find the user to get their ID
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (!user) {
      return c.json(
        { error: { message: "Utilisateur introuvable", code: "USER_NOT_FOUND" } },
        404
      );
    }

    // Hash the new password using bcryptjs
    const hashed = await bcryptjs.hash(newPassword, 10);

    // Update the credential account password
    await prisma.account.updateMany({
      where: { userId: user.id, providerId: "credential" },
      data: { password: hashed },
    });

    return c.json({ data: { success: true } });
  }
);

export { passwordResetRouter };
