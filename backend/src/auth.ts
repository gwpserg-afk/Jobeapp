import { betterAuth } from "better-auth";
import { expo } from "@better-auth/expo";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { prisma } from "./prisma";
import { env } from "./env";

// Enable "Sign in with Google" only when the OAuth credentials are configured,
// so the backend runs fine before they're added on the host.
const socialProviders =
  env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
    ? {
        google: {
          clientId: env.GOOGLE_CLIENT_ID,
          clientSecret: env.GOOGLE_CLIENT_SECRET,
        },
      }
    : undefined;

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "sqlite" }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BACKEND_URL,
  emailAndPassword: {
    enabled: true,
  },
  socialProviders,
  trustedOrigins: [
    "jobe://*/*",
    "exp://*/*",
    "http://localhost:*",
    "http://127.0.0.1:*",
    "https://*.trycloudflare.com",
    "https://*.onrender.com",
    "https://*.expo.dev",
    "https://*.exp.direct",
  ],
  plugins: [
    expo(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // In development, log OTP to terminal. Replace with Resend/SendGrid for production.
        console.log(`\n📧 OTP for ${email}: ${otp} (type: ${type})\n`);
      },
    }),

  ],
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: false,
        input: true,
      },
      bio: {
        type: "string",
        required: false,
        input: true,
      },
      location: {
        type: "string",
        required: false,
        input: true,
      },
      instagram: {
        type: "string",
        required: false,
        input: true,
      },
      accountType: {
        type: "string",
        defaultValue: "candidate",
        input: true,
      },
      phone: { type: "string", required: false, input: true },
      isVerified: { type: "boolean", defaultValue: false },
      isGoldVerified: { type: "boolean", defaultValue: false },
      isPremium: { type: "boolean", defaultValue: false },
      premiumExpiresAt: { type: "date", required: false },
      languagePreference: { type: "string", defaultValue: "fr", input: true },
      isActive: { type: "boolean", defaultValue: true },
      lastActiveAt: { type: "date", required: false },
    },
  },
  advanced: {
    trustedProxyHeaders: true,
    disableCSRFCheck: true,
    defaultCookieAttributes: {
      sameSite: "none",
      secure: true,
      partitioned: true,
    },
  },
});
