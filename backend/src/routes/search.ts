import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const searchRouter = new Hono<{ Variables: Variables }>();

// GET /api/search/people?q=query
// Returns up to 10 candidates + 10 companies matching the query
searchRouter.get("/people", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) {
    return c.json({ data: { candidates: [], companies: [] } });
  }

  const [candidates, companies] = await Promise.all([
    prisma.candidateProfile.findMany({
      where: {
        profileVisibility: { not: "private" },
        fullName: { contains: q, mode: "insensitive" } as any,
      },
      select: {
        id: true,
        userId: true,
        fullName: true,
        headline: true,
        profilePhotoUrl: true,
        city: true,
        user: { select: { isVerified: true, isPremium: true } },
      },
      take: 10,
      orderBy: { fullName: "asc" },
    }),
    prisma.company.findMany({
      where: {
        companyName: { contains: q, mode: "insensitive" } as any,
      },
      select: {
        id: true,
        userId: true,
        companyName: true,
        sector: true,
        logoUrl: true,
        isVerified: true,
        contactName: true,
      },
      take: 10,
      orderBy: { companyName: "asc" },
    }),
  ]);

  return c.json({
    data: {
      candidates: candidates.map((c) => ({
        id: c.id,
        userId: c.userId,
        name: c.fullName,
        subtitle: c.headline ?? c.city ?? "",
        photoUrl: c.profilePhotoUrl ?? null,
        isVerified: c.user.isVerified,
        isPremium: c.user.isPremium,
        type: "candidate" as const,
      })),
      companies: companies.map((co) => ({
        id: co.id,
        userId: co.userId,
        name: co.companyName,
        subtitle: co.sector ?? "",
        photoUrl: co.logoUrl ?? null,
        isVerified: co.isVerified,
        type: "company" as const,
      })),
    },
  });
});

// GET /api/search/profile?userId=...&type=candidate|company
// Returns full profile for the profile-view screen
searchRouter.get("/profile", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const userId = c.req.query("userId");
  const type = c.req.query("type");

  if (!userId || !type) {
    return c.json({ error: { message: "Missing userId or type", code: "BAD_REQUEST" } }, 400);
  }

  if (type === "candidate") {
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId },
      include: {
        skills: { take: 10, orderBy: { endorsementCount: "desc" } },
        experiences: { orderBy: { startDate: "desc" }, take: 5 },
        education: { orderBy: { startYear: "desc" }, take: 3 },
        user: { select: { isVerified: true, createdAt: true } },
      },
    });

    if (!profile) {
      return c.json({ error: { message: "Profile not found", code: "NOT_FOUND" } }, 404);
    }

    return c.json({ data: { type: "candidate", profile } });
  }

  if (type === "company") {
    const company = await prisma.company.findUnique({
      where: { userId },
      include: {
        teamMembers: {
          orderBy: [{ isPinned: "desc" }, { order: "asc" }] as { isPinned?: "asc" | "desc"; order?: "asc" | "desc" }[],
        },
        jobListings: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 5,
          select: {
            id: true,
            title: true,
            contractType: true,
            locationCity: true,
            isUrgent: true,
            createdAt: true,
          },
        },
        user: { select: { isVerified: true } },
        _count: { select: { jobListings: true } },
      },
    });

    if (!company) {
      return c.json({ error: { message: "Company not found", code: "NOT_FOUND" } }, 404);
    }

    return c.json({ data: { type: "company", profile: company } });
  }

  return c.json({ error: { message: "Invalid type", code: "BAD_REQUEST" } }, 400);
});

export { searchRouter };
