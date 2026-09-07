import { createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { env } from "../env";

/** True when Twilio is fully configured (SID + token + a sender). */
export function twilioConfigured(): boolean {
  return !!(
    env.TWILIO_ACCOUNT_SID &&
    env.TWILIO_AUTH_TOKEN &&
    (env.TWILIO_MESSAGING_SERVICE_SID || env.TWILIO_FROM_NUMBER)
  );
}

/** Cryptographically-random 6-digit code, zero-padded. */
export function generateOtp(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

/** Codes are stored hashed (HMAC-SHA256 with the app secret), never in plaintext. */
export function hashOtp(code: string): string {
  return createHmac("sha256", env.BETTER_AUTH_SECRET).update(code).digest("hex");
}

/** Timing-safe compare of a submitted code against a stored hash. */
export function otpMatches(code: string, hash: string): boolean {
  const a = Buffer.from(hashOtp(code));
  const b = Buffer.from(hash);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Send an SMS via Twilio. Prefers the Messaging Service (routes the right
 * sender per country: "Jobé" Sender ID for SN/West Africa, a number for US/FR).
 */
export async function sendSMS(
  to: string,
  body: string
): Promise<{ ok: boolean; error?: string }> {
  if (!twilioConfigured()) return { ok: false, error: "twilio_not_configured" };

  const sid = env.TWILIO_ACCOUNT_SID!;
  const token = env.TWILIO_AUTH_TOKEN!;
  const form = new URLSearchParams();
  form.set("To", to);
  form.set("Body", body);
  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    form.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
  } else {
    form.set("From", env.TWILIO_FROM_NUMBER!);
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization:
            "Basic " + Buffer.from(`${sid}:${token}`).toString("base64"),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: form.toString(),
      }
    );
    if (!res.ok) {
      console.error("Twilio send failed:", res.status, await res.text());
      return { ok: false, error: `twilio_${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    console.error("Twilio send threw:", e);
    return { ok: false, error: "twilio_network" };
  }
}

/** Localized OTP message body. */
export function otpMessage(code: string, lang: "fr" | "en" | "zh"): string {
  if (lang === "en")
    return `Jobé: your verification code is ${code}. It expires in 5 minutes.`;
  if (lang === "zh") return `Jobé：您的验证码是 ${code}，5 分钟内有效。`;
  return `Jobé : votre code de vérification est ${code}. Il expire dans 5 minutes.`;
}
