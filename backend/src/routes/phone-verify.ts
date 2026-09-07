import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import { env } from "../env";
import {
  generateOtp,
  hashOtp,
  otpMatches,
  otpMessage,
  sendSMS,
  twilioConfigured,
} from "../lib/sms";

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 30 * 1000; // 30s between sends per phone
const MAX_ATTEMPTS = 5;
const isDev = env.NODE_ENV !== "production";

const phoneVerifyRouter = new Hono();

// POST /api/phone-verify/check — is this phone already registered?
phoneVerifyRouter.post(
  "/check",
  zValidator("json", z.object({ phone: z.string().min(8).max(20) })),
  async (c) => {
    const { phone } = c.req.valid("json");
    const user = await prisma.user.findFirst({ where: { phone } });
    return c.json({ data: { exists: !!user } });
  }
);

// POST /api/phone-verify/send — generate + store a hashed code, send via Twilio.
phoneVerifyRouter.post(
  "/send",
  zValidator(
    "json",
    z.object({
      phone: z.string().min(8).max(20),
      lang: z.enum(["fr", "en", "zh"]).optional().default("fr"),
    })
  ),
  async (c) => {
    const { phone, lang } = c.req.valid("json");

    // Rate-limit: reject a resend within the cooldown window.
    const recent = await prisma.phoneOtp.findFirst({
      where: { phone, createdAt: { gt: new Date(Date.now() - RESEND_COOLDOWN_MS) } },
    });
    if (recent) {
      return c.json(
        {
          error: {
            message:
              lang === "fr"
                ? "Veuillez patienter avant de redemander un code."
                : "Please wait before requesting another code.",
            code: "OTP_COOLDOWN",
          },
        },
        429
      );
    }

    const code = generateOtp();
    // Replace any prior codes for this phone, then store the new hashed code.
    await prisma.phoneOtp.deleteMany({ where: { phone } });
    await prisma.phoneOtp.create({
      data: {
        phone,
        codeHash: hashOtp(code),
        expiresAt: new Date(Date.now() + OTP_TTL_MS),
      },
    });

    if (twilioConfigured()) {
      const sent = await sendSMS(phone, otpMessage(code, lang));
      if (!sent.ok) {
        return c.json(
          {
            error: {
              message:
                lang === "fr"
                  ? "Erreur d'envoi du SMS. Veuillez réessayer."
                  : "Failed to send SMS. Please try again.",
              code: "SMS_SEND_ERROR",
            },
          },
          500
        );
      }
    } else {
      // Dev fallback: no Twilio configured → log the code so it's testable
      // locally without sending a real SMS. Never happens in production.
      console.log(`[phone-verify] DEV code for ${phone}: ${code} (Twilio not configured)`);
    }

    return c.json({ data: { success: true } });
  }
);

// POST /api/phone-verify/verify — check the submitted code against the store.
phoneVerifyRouter.post(
  "/verify",
  zValidator(
    "json",
    z.object({
      phone: z.string().min(8).max(20),
      otp: z.string().length(6),
      lang: z.enum(["fr", "en", "zh"]).optional().default("fr"),
    })
  ),
  async (c) => {
    const { phone, otp, lang } = c.req.valid("json");

    // Dev convenience: when Twilio isn't set up, accept the universal test code.
    if (isDev && !twilioConfigured() && otp === "111111") {
      await prisma.phoneOtp.deleteMany({ where: { phone } });
      return c.json({ data: { success: true, verified: true } });
    }

    const record = await prisma.phoneOtp.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    const invalid = (msg: { fr: string; en: string }, code: string, status: 400 | 429) =>
      c.json({ error: { message: lang === "fr" ? msg.fr : msg.en, code } }, status);

    if (!record || record.expiresAt < new Date()) {
      if (record) await prisma.phoneOtp.delete({ where: { id: record.id } });
      return invalid(
        { fr: "Code expiré. Veuillez en demander un nouveau.", en: "Code expired. Please request a new one." },
        "OTP_EXPIRED",
        400
      );
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      await prisma.phoneOtp.delete({ where: { id: record.id } });
      return invalid(
        { fr: "Trop de tentatives. Veuillez redemander un code.", en: "Too many attempts. Please request a new code." },
        "OTP_TOO_MANY",
        429
      );
    }

    if (!otpMatches(otp, record.codeHash)) {
      await prisma.phoneOtp.update({
        where: { id: record.id },
        data: { attempts: { increment: 1 } },
      });
      return invalid(
        { fr: "Code incorrect. Veuillez réessayer.", en: "Incorrect code. Please try again." },
        "OTP_INVALID",
        400
      );
    }

    // Success — consume the code.
    await prisma.phoneOtp.delete({ where: { id: record.id } });
    return c.json({ data: { success: true, verified: true } });
  }
);

export { phoneVerifyRouter };
