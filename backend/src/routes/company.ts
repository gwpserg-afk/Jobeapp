import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

const COMPANY_INCLUDE = {
  teamMembers: {
    orderBy: [{ isPinned: "desc" as const }, { order: "asc" as const }] as { isPinned?: "asc" | "desc"; order?: "asc" | "desc" }[],
  },
  jobListings: {
    where: { isActive: true },
    orderBy: { createdAt: "desc" as const },
    take: 10,
    select: {
      id: true,
      title: true,
      contractType: true,
      locationCity: true,
      isUrgent: true,
      isActive: true,
      createdAt: true,
      isBoosted: true,
      _count: { select: { applications: true } },
    },
  },
  _count: {
    select: { jobListings: true },
  },
} as const;

// GET /api/company — current user's company
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const company = await prisma.company.findUnique({
    where: { userId: user.id },
    include: COMPANY_INCLUDE,
  });

  if (!company) return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);
  return c.json({ data: company });
});

// GET /api/company/:id/posts — public posts by company
router.get("/:id/posts", async (c) => {
  const companyId = c.req.param("id");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { userId: true },
  });

  if (!company) return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);

  const posts = await prisma.post.findMany({
    where: { userId: company.userId, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
          accountType: true,
          isVerified: true,
          isGoldVerified: true,
        },
      },
      _count: {
        select: {
          likes: true,
          comments: true,
          reposts: true,
        },
      },
    },
  });

  return c.json({ data: posts });
});

// GET /api/company/:id — public company by ID
router.get("/:id", async (c) => {
  const companyId = c.req.param("id");

  const company = await prisma.company.findUnique({
    where: { id: companyId },
    include: COMPANY_INCLUDE,
  });

  if (!company) return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);
  return c.json({ data: company });
});

// PUT /api/company — update company profile
router.put(
  "/",
  zValidator(
    "json",
    z.object({
      companyName: z.string().min(1).optional(),
      logoUrl: z.string().nullable().optional(),
      bannerUrl: z.string().nullable().optional(),
      sector: z.string().nullable().optional(),
      sizeRange: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      website: z.string().nullable().optional(),
      contactName: z.string().nullable().optional(),
      location: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    if (user.accountType !== "recruiter" && user.accountType !== "admin") {
      return c.json({ error: { message: "Only recruiters can manage companies", code: "FORBIDDEN" } }, 403);
    }

    const data = c.req.valid("json");

    const company = await prisma.company.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        companyName: data.companyName ?? "Mon Entreprise",
        ...data,
      },
      include: COMPANY_INCLUDE,
    });

    return c.json({ data: company });
  }
);

// POST /api/company/team-members — add a team member
router.post(
  "/team-members",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1),
      role: z.string().nullable().optional(),
      photoUrl: z.string().nullable().optional(),
      linkedUserId: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const company = await prisma.company.findUnique({ where: { userId: user.id } });
    if (!company) return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);

    const data = c.req.valid("json");
    const maxOrder = await prisma.companyTeamMember.count({ where: { companyId: company.id } });

    const member = await prisma.companyTeamMember.create({
      data: {
        companyId: company.id,
        name: data.name,
        role: data.role ?? null,
        photoUrl: data.photoUrl ?? null,
        linkedUserId: data.linkedUserId ?? null,
        order: maxOrder,
      },
    });

    return c.json({ data: member }, 201);
  }
);

// PUT /api/company/team-members/:memberId — update a team member
router.put(
  "/team-members/:memberId",
  zValidator(
    "json",
    z.object({
      name: z.string().min(1).optional(),
      role: z.string().nullable().optional(),
      photoUrl: z.string().nullable().optional(),
      linkedUserId: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const memberId = c.req.param("memberId");
    const company = await prisma.company.findUnique({ where: { userId: user.id } });
    if (!company) return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);

    const existing = await prisma.companyTeamMember.findFirst({
      where: { id: memberId, companyId: company.id },
    });
    if (!existing) return c.json({ error: { message: "Member not found", code: "NOT_FOUND" } }, 404);

    const data = c.req.valid("json");
    const member = await prisma.companyTeamMember.update({ where: { id: memberId }, data });
    return c.json({ data: member });
  }
);

// PATCH /api/company/team-members/:memberId/pin — toggle pin on a team member
router.patch("/team-members/:memberId/pin", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const memberId = c.req.param("memberId");
  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);

  const existing = await prisma.companyTeamMember.findFirst({
    where: { id: memberId, companyId: company.id },
  });
  if (!existing) return c.json({ error: { message: "Member not found", code: "NOT_FOUND" } }, 404);

  // If currently unpinned, check if we'd exceed the 3-pinned limit
  if (!existing.isPinned) {
    const pinnedCount = await prisma.companyTeamMember.count({
      where: { companyId: company.id, isPinned: true },
    });
    if (pinnedCount >= 3) {
      return c.json(
        { error: { message: "Maximum 3 members can be pinned", code: "MAX_PINNED" } },
        400
      );
    }
  }

  const updatedMember = await prisma.companyTeamMember.update({
    where: { id: memberId },
    data: { isPinned: !existing.isPinned },
  });

  return c.json({ data: updatedMember });
});

// DELETE /api/company/team-members/:memberId — remove a team member
router.delete("/team-members/:memberId", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const memberId = c.req.param("memberId");
  const company = await prisma.company.findUnique({ where: { userId: user.id } });
  if (!company) return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);

  const existing = await prisma.companyTeamMember.findFirst({
    where: { id: memberId, companyId: company.id },
  });
  if (!existing) return c.json({ error: { message: "Member not found", code: "NOT_FOUND" } }, 404);

  await prisma.companyTeamMember.delete({ where: { id: memberId } });
  return new Response(null, { status: 204 });
});

export { router as companyRouter };
