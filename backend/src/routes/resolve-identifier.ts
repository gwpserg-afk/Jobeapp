import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";

const resolveIdentifierRouter = new Hono();

resolveIdentifierRouter.post(
  "/",
  zValidator("json", z.object({ identifier: z.string().min(1) })),
  async (c) => {
    const { identifier } = c.req.valid("json");
    const id = identifier.trim();

    let user: { email: string } | null = null;

    if (id.includes("@")) {
      // Email — verify user exists
      user = await prisma.user.findUnique({
        where: { email: id },
        select: { email: true },
      });
    } else if (/^\+?[\d\s\-().]{7,}$/.test(id)) {
      // Phone number
      const normalized = id.replace(/[\s\-().]/g, "");
      user = await prisma.user.findFirst({
        where: { phone: { contains: normalized } },
        select: { email: true },
      });
    } else {
      // Name / username
      user = await prisma.user.findFirst({
        where: { name: { equals: id.toLowerCase() } },
        select: { email: true },
      });
    }

    if (!user) {
      return c.json(
        { error: { message: "Utilisateur introuvable", code: "USER_NOT_FOUND" } },
        404
      );
    }

    return c.json({ data: { email: user.email } });
  }
);

export { resolveIdentifierRouter };
