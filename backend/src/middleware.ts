import type { Context, Next } from "hono";
import { auth } from "./auth";
import type { Variables } from "./types";

/**
 * Middleware that populates user and session from the request.
 * Does NOT reject unauthenticated requests - use requireAuth for that.
 */
export async function authMiddleware(
  c: Context<{ Variables: Variables }>,
  next: Next
) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session) {
    c.set("user", session.user as Variables["user"]);
    c.set("session", session.session as Variables["session"]);
  } else {
    c.set("user", null);
    c.set("session", null);
  }

  await next();
}

/**
 * Helper that returns 401 if user is not authenticated.
 * Use in individual route handlers:
 *   const user = requireAuth(c);
 *   if (!user) return;
 */
export function requireAuth(c: Context<{ Variables: Variables }>) {
  const user = c.get("user");
  if (!user) {
    return null;
  }
  return user;
}
