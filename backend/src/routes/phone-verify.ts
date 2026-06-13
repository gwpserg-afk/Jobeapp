import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";

const TEXTBELT_KEY =
  "00125288205434ad4cf1c0cb80ffcdb419185816P73tlh6KDTh5YFiBClEFQbAQo";

const phoneVerifyRouter = new Hono();

// POST /api/phone-verify/check - Check if phone is already registered
phoneVerifyRouter.post(
  "/check",
  zValidator(
    "json",
    z.object({
      phone: z.string().min(8).max(20),
    })
  ),
  async (c) => {
    const { phone } = c.req.valid("json");
    const user = await prisma.user.findFirst({ where: { phone } });
    return c.json({ data: { exists: !!user } });
  }
);

// POST /api/phone-verify/send
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

    const message =
      "Your verification code is $OTP. Expires in 3 minutes.";

    const res = await fetch("https://textbelt.com/otp/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone,
        userid: phone,
        key: TEXTBELT_KEY,
        message,
      }),
    });

    const data = (await res.json()) as { success: boolean; error?: string; textId?: string };

    if (!data.success) {
      console.error("Textbelt send failed:", data.error);
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

    return c.json({ data: { success: true } });
  }
);

// POST /api/phone-verify/verify
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

    const res = await fetch(
      `https://textbelt.com/otp/verify?otp=${encodeURIComponent(otp)}&userid=${encodeURIComponent(phone)}&key=${TEXTBELT_KEY}`
    );

    const data = (await res.json()) as { isValidOtp: boolean; success: boolean; error?: string };

    if (!data.success) {
      console.error("Textbelt verify error:", data.error);
      return c.json(
        {
          error: {
            message:
              lang === "fr"
                ? "Erreur de vérification. Veuillez réessayer."
                : "Verification error. Please try again.",
            code: "SMS_SEND_ERROR",
          },
        },
        500
      );
    }

    if (!data.isValidOtp) {
      return c.json(
        {
          error: {
            message:
              lang === "fr"
                ? "Code incorrect ou expiré. Veuillez réessayer."
                : "Incorrect or expired code. Please try again.",
            code: "OTP_INVALID",
          },
        },
        400
      );
    }

    return c.json({ data: { success: true, verified: true } });
  }
);

export { phoneVerifyRouter };
