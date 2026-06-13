import { Hono } from "hono";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// GET /api/candidates/search - Search candidates (for recruiters)
router.get("/search", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  if (user.accountType !== "recruiter" && user.accountType !== "admin") {
    return c.json(
      {
        error: {
          message: "Only recruiters can search candidates",
          code: "FORBIDDEN",
        },
      },
      403
    );
  }

  const query = c.req.query();
  const page = Math.max(1, parseInt(query["page"] ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(query["limit"] ?? "20", 10)));
  const skip = (page - 1) * limit;

  // Build search criteria
  const where: Record<string, unknown> = {
    profileVisibility: { not: "private" },
  };

  if (query["q"]) {
    where["OR"] = [
      { fullName: { contains: query["q"] } },
      { headline: { contains: query["q"] } },
      { bio: { contains: query["q"] } },
    ];
  }

  if (query["city"]) {
    where["city"] = query["city"];
  }

  if (query["availability"]) {
    where["availabilityStatus"] = query["availability"];
  }

  if (query["skill"]) {
    where["skills"] = {
      some: { skillName: { contains: query["skill"] } },
    };
  }

  if (query["hasCv"] === "true") {
    where["cvUrl"] = { not: null };
  }

  if (query["minExperiences"]) {
    const min = parseInt(query["minExperiences"], 10);
    if (min >= 1) {
      where["experiences"] = { some: {} };
    }
    // min === 0 means no filter (any number of experiences)
  }

  const [candidates, total] = await Promise.all([
    prisma.candidateProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ profileCompletePct: "desc" }, { updatedAt: "desc" }],
      select: {
        id: true,
        userId: true,
        fullName: true,
        profilePhotoUrl: true,
        city: true,
        neighborhood: true,
        headline: true,
        availabilityStatus: true,
        profileCompletePct: true,
        cvUrl: true,
        _count: { select: { experiences: true, skills: true } },
        skills: {
          take: 5,
          select: { skillName: true, skillLevel: true },
        },
        experiences: {
          take: 1,
          orderBy: { createdAt: "desc" },
          select: {
            companyName: true,
            roleTitle: true,
            isCurrent: true,
          },
        },
        languages: {
          select: { language: true, level: true },
        },
        updatedAt: true,
      },
    }),
    prisma.candidateProfile.count({ where }),
  ]);

  return c.json({
    data: {
      candidates,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// GET /api/candidates/:id - Get candidate profile (for recruiters)
router.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const candidateId = c.req.param("id");

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
    include: {
      skills: true,
      experiences: { orderBy: { createdAt: "desc" } },
      education: { orderBy: { createdAt: "desc" } },
      languages: true,
      portfolio: true,
      recommendations: { where: { isApproved: true } },
      user: {
        select: { name: true, image: true, isVerified: true, isGoldVerified: true, isPremium: true },
      },
    },
  });

  if (!candidate) {
    return c.json(
      { error: { message: "Candidate not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Check visibility
  if (candidate.profileVisibility === "private" && candidate.userId !== user.id) {
    return c.json(
      { error: { message: "This profile is private", code: "FORBIDDEN" } },
      403
    );
  }

  if (
    candidate.profileVisibility === "recruiters_only" &&
    user.accountType === "candidate" &&
    candidate.userId !== user.id
  ) {
    return c.json(
      {
        error: {
          message: "This profile is only visible to recruiters",
          code: "FORBIDDEN",
        },
      },
      403
    );
  }

  // Notify the candidate that their profile was viewed (only if viewed by a recruiter)
  if (
    user.accountType === "recruiter" &&
    candidate.userId !== user.id
  ) {
    await prisma.notification.create({
      data: {
        userId: candidate.userId,
        type: "profile_view",
        title: "Profil consulte",
        body: `Un recruteur a consulte votre profil`,
        dataJson: JSON.stringify({ viewerId: user.id }),
      },
    });
  }

  return c.json({ data: candidate });
});

// POST /api/candidates/:id/save - Save candidate (for recruiters)
router.post("/:id/save", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  if (user.accountType !== "recruiter" && user.accountType !== "admin") {
    return c.json(
      { error: { message: "Only recruiters can save candidates", code: "FORBIDDEN" } },
      403
    );
  }

  const company = await prisma.company.findUnique({
    where: { userId: user.id },
  });
  if (!company) {
    return c.json(
      { error: { message: "Company not found", code: "NOT_FOUND" } },
      404
    );
  }

  const candidateId = c.req.param("id");

  // Verify candidate exists
  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: candidateId },
  });
  if (!candidate) {
    return c.json(
      { error: { message: "Candidate not found", code: "NOT_FOUND" } },
      404
    );
  }

  const saved = await prisma.savedCandidate.upsert({
    where: {
      companyId_candidateId: {
        companyId: company.id,
        candidateId,
      },
    },
    update: {},
    create: {
      companyId: company.id,
      candidateId,
    },
  });

  return c.json({ data: saved }, 201);
});

// DELETE /api/candidates/:id/save - Unsave candidate
router.delete("/:id/save", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const company = await prisma.company.findUnique({
    where: { userId: user.id },
  });
  if (!company) {
    return c.json(
      { error: { message: "Company not found", code: "NOT_FOUND" } },
      404
    );
  }

  const candidateId = c.req.param("id");

  try {
    await prisma.savedCandidate.delete({
      where: {
        companyId_candidateId: {
          companyId: company.id,
          candidateId,
        },
      },
    });
  } catch {
    // Already not saved, that is fine
  }

  return c.json({ data: { success: true } });
});

// GET /api/candidates/saved/list - Get saved candidates
router.get("/saved/list", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const company = await prisma.company.findUnique({
    where: { userId: user.id },
  });
  if (!company) {
    return c.json({ data: [] });
  }

  const saved = await prisma.savedCandidate.findMany({
    where: { companyId: company.id },
    orderBy: { savedAt: "desc" },
    include: {
      candidate: {
        select: {
          id: true,
          fullName: true,
          profilePhotoUrl: true,
          city: true,
          headline: true,
          availabilityStatus: true,
          skills: {
            take: 5,
            select: { skillName: true },
          },
        },
      },
    },
  });

  return c.json({ data: saved });
});

export { router as candidatesRouter };
