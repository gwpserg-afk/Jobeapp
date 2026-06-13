import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import "./env";
import { auth } from "./auth";
import { authMiddleware } from "./middleware";
import { prisma } from "./prisma";
import type { Variables } from "./types";

// Route imports
import { profileRouter } from "./routes/profile";
import { companyRouter } from "./routes/company";
import { jobsRouter } from "./routes/jobs";
import { applicationsRouter } from "./routes/applications";
import { messagesRouter } from "./routes/messages";
import { notificationsRouter } from "./routes/notifications";
import { candidatesRouter } from "./routes/candidates";
import { onboardingRouter } from "./routes/onboarding";
import { savedJobsRouter } from "./routes/saved-jobs";
import { meRouter } from "./routes/me";
import { chatRouter } from "./routes/chat";
import { generateImagesRouter } from "./routes/generate-images";
import { phoneVerifyRouter } from "./routes/phone-verify";
import { searchRouter } from "./routes/search";
import { postsRouter } from "./routes/posts";
import { profileViewsRouter } from "./routes/profileViews";
import { reportsRouter } from "./routes/reports";
import { reportRouter } from "./routes/report";
import { verificationRouter } from "./routes/verification";
import { subscriptionRouter } from "./routes/subscription";
import { creditsRouter } from "./routes/credits";
import { promotionsRouter } from "./routes/promotions";
import { identityVerifyRouter } from "./routes/identity-verify";
import { resolveIdentifierRouter } from "./routes/resolve-identifier";
import { passwordResetRouter } from "./routes/password-reset";

const app = new Hono<{ Variables: Variables }>();

// CORS middleware - validates origin against allowlist
const allowed = [
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];

app.use(
  "*",
  cors({
    origin: (origin) =>
      origin && allowed.some((re) => re.test(origin)) ? origin : null,
    credentials: true,
  })
);

// Logging
app.use("*", logger());

// Auth middleware - populates user/session for all API routes except auth routes
app.use("/api/*", async (c, next) => {
  // Skip auth middleware for Better Auth routes - auth.handler handles its own auth
  if (c.req.path.startsWith("/api/auth")) {
    return next();
  }
  // Skip auth for phone verification (unauthenticated signup flow)
  if (c.req.path.startsWith("/api/phone-verify")) {
    return next();
  }
  // Skip auth for password reset (unauthenticated flow)
  if (c.req.path.startsWith("/api/password-reset")) {
    return next();
  }
  return authMiddleware(c, next);
});

// Health check endpoint
app.get("/health", (c) => c.json({ status: "ok" }));

// Pre-auth middleware: intercept sign-up to delete any existing user with the same email
// so re-registration always succeeds (delete-then-insert avoids unique constraint violation).
app.post("/api/auth/sign-up/email", async (c, next) => {
  try {
    const bodyText = await c.req.text();
    let email: string | undefined;
    try {
      const parsed = JSON.parse(bodyText) as Record<string, unknown>;
      if (typeof parsed.email === "string" && parsed.email) {
        email = parsed.email;
      }
    } catch {
      // body is not JSON — let Better Auth handle the error
    }

    if (email) {
      await prisma.user.deleteMany({ where: { email } });
    }

    // Restore the body so the Better Auth handler can read it again
    c.req.raw = new Request(c.req.url, {
      method: c.req.method,
      headers: c.req.raw.headers,
      body: bodyText,
    });
  } catch (err) {
    console.error("[sign-up middleware] error:", err);
    // Do not block the request even if something goes wrong
  }
  return next();
});

// Resolve identifier (pre-login lookup) — must be before the Better Auth catch-all
app.route("/api/auth/resolve-identifier", resolveIdentifierRouter);

// Password reset — unauthenticated, must be before the Better Auth catch-all
app.route("/api/password-reset", passwordResetRouter);

// Better Auth handler - handles all /api/auth/* routes
app.on(["GET", "POST"], "/api/auth/*", async (c) => {
  // Read body as text then construct a fresh Request so Better Auth can parse it
  let body: string | undefined;
  if (c.req.raw.method !== "GET" && c.req.raw.method !== "HEAD") {
    try {
      body = await c.req.text();
    } catch {
      body = undefined;
    }
  }
  const req = new Request(c.req.url, {
    method: c.req.method,
    headers: c.req.raw.headers,
    body,
  });
  return auth.handler(req);
});

// API Routes
app.route("/api/profile", profileRouter);
app.route("/api/company", companyRouter);
app.route("/api/jobs", jobsRouter);
app.route("/api/applications", applicationsRouter);
app.route("/api/messages", messagesRouter);
app.route("/api/notifications", notificationsRouter);
app.route("/api/candidates", candidatesRouter);
app.route("/api/onboarding", onboardingRouter);
app.route("/api/saved-jobs", savedJobsRouter);
app.route("/api/me", meRouter);
app.route("/api/chat", chatRouter);
app.route("/api/generate-images", generateImagesRouter);
app.route("/api/phone-verify", phoneVerifyRouter);
app.route("/api/search", searchRouter);
app.route("/api/posts", postsRouter);
app.route("/api/profile-views", profileViewsRouter);
app.route("/api/reports", reportsRouter);
app.route("/api/report", reportRouter);
app.route("/api/verification", verificationRouter);
app.route("/api/subscription", subscriptionRouter);
app.route("/api/credits", creditsRouter);
app.route("/api/promotions", promotionsRouter);
app.route("/api/identity-verify", identityVerifyRouter);

// Generic file upload endpoint — stores files locally under ./uploads/
app.post("/api/upload", async (c) => {
  let formData: FormData;
  try {
    formData = await c.req.formData();
  } catch (err) {
    console.error("[Upload] Failed to parse form data:", err);
    return c.json({ error: "Invalid form data" }, 400);
  }

  const file = formData.get("file");

  if (!file || typeof file === "string") {
    console.error("[Upload] No valid file provided, got:", typeof file);
    return c.json({ error: "No file provided" }, 400);
  }

  const blob = file as Blob;
  const ext = (blob.type.split("/")[1] ?? "bin").replace("jpeg", "jpg");
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const uploadsDir = new URL("../../uploads", import.meta.url).pathname;

  try {
    await Bun.write(`${uploadsDir}/${filename}`, blob);
  } catch (err) {
    console.error("[Upload] Write failed:", err);
    return c.json({ error: "Upload failed" }, 500);
  }

  const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 3000}`;
  const url = `${baseUrl}/uploads/${filename}`;

  return c.json({ data: { id: filename, url, name: filename, contentType: blob.type } });
});

// Serve uploaded files statically
app.get("/uploads/:filename", async (c) => {
  const { filename } = c.req.param();
  const uploadsDir = new URL("../../uploads", import.meta.url).pathname;
  const file = Bun.file(`${uploadsDir}/${filename}`);
  if (!(await file.exists())) return c.json({ error: "Not found" }, 404);
  return new Response(file);
});

const port = Number(process.env.PORT) || 3000;

export default {
  port,
  fetch: app.fetch,
};
