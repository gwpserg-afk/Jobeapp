import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// GET /api/users/:id — public profile info for viewing another user.
router.get("/:id", async (c) => {
  const me = c.get("user");
  if (!me) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const id = c.req.param("id");
  const u = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, username: true, image: true, bio: true, location: true,
      accountType: true, isVerified: true, isGoldVerified: true,
    },
  });
  if (!u) return c.json({ error: { message: "Not found", code: "NOT_FOUND" } }, 404);

  return c.json({ data: u });
});

export { router as usersRouter };
