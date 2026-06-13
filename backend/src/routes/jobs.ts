import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";
import { env } from "../env";
import OpenAI from "openai";

const router = new Hono<{ Variables: Variables }>();

// GET /api/jobs - List jobs with filters
router.get("/", async (c) => {
  const user = c.get("user");
  const isPremium = user?.isPremium === true;

  const query = c.req.query();
  const page = Math.max(1, parseInt(query["page"] ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(query["limit"] ?? "20", 10)));
  const skip = (page - 1) * limit;

  // Build filter conditions
  const where: Record<string, unknown> = { isActive: true };

  if (query["q"]) {
    where["title"] = { contains: query["q"] };
  }
  if (query["category"]) {
    where["category"] = query["category"];
  }
  if (query["contractType"]) {
    where["contractType"] = query["contractType"];
  }
  if (query["city"]) {
    where["locationCity"] = query["city"];
  }
  if (query["workMode"]) {
    where["workMode"] = query["workMode"];
  }
  if (query["experience"]) {
    where["requiredExperience"] = query["experience"];
  }
  if (query["isUrgent"] === "true") {
    where["isUrgent"] = true;
  }
  if (query["companyId"]) {
    where["companyId"] = query["companyId"];
  }

  const [jobs, total] = await Promise.all([
    prisma.jobListing.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
      include: {
        requiredSkills: true,
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            sector: true,
            isVerified: true,
            userId: true,
          },
        },
        _count: { select: { applications: true } },
      },
    }),
    prisma.jobListing.count({ where }),
  ]);

  const mappedJobs = jobs.map((job) => ({
    ...job,
    applicantCount: (isPremium || (user && job.company?.userId === user.id)) ? (job._count?.applications ?? 0) : null,
  }));

  return c.json({
    data: {
      jobs: mappedJobs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    },
  });
});

// GET /api/jobs/recommendations - AI-powered job recommendations for the current candidate
router.get("/recommendations", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  if (user.accountType !== "candidate") {
    return c.json({ data: { jobs: [], reasons: {} } });
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    include: {
      skills: { select: { skillName: true } },
    },
  });

  const jobs = await prisma.jobListing.findMany({
    where: { isActive: true },
    take: 40,
    orderBy: [{ isBoosted: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      title: true,
      category: true,
      contractType: true,
      locationCity: true,
      workMode: true,
      salaryMin: true,
      salaryMax: true,
      salaryNegotiable: true,
      isBoosted: true,
      isUrgent: true,
      createdAt: true,
      requiredSkills: {
        select: { skillName: true, isRequired: true },
      },
      company: {
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          sector: true,
          isVerified: true,
        },
      },
      _count: { select: { applications: true } },
    },
  });

  const skillNames = profile?.skills.map((s) => s.skillName) ?? [];
  const headline = profile?.headline ?? null;
  const hasNoContext = skillNames.length === 0 && !headline;

  if (hasNoContext || !env.OPENAI_API_KEY) {
    const fallbackJobs = jobs.slice(0, 5);
    const reasons: Record<string, string> = {};
    for (const job of fallbackJobs) {
      reasons[job.id] = "Populaire en ce moment";
    }
    return c.json({ data: { jobs: fallbackJobs, reasons } });
  }

  const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const jobsForPrompt = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    contractType: j.contractType,
    locationCity: j.locationCity,
    requiredSkills: j.requiredSkills.map((s) => s.skillName),
    sector: j.company.sector,
  }));

  let recommendedIds: { id: string; reason: string }[] = [];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a career matching assistant. Respond ONLY with valid JSON, no markdown.",
        },
        {
          role: "user",
          content: `Candidate profile:\n- Skills: ${skillNames.length > 0 ? skillNames.join(", ") : "none listed"}\n- Headline: ${headline ?? "none"}\n\nJobs (JSON array): ${JSON.stringify(jobsForPrompt)}\n\nPick the 5 most relevant job IDs for this candidate and give a short 3-6 word reason in French for each.\nReturn ONLY this JSON: {"recommendations": [{"id": "job_id", "reason": "short reason"}]}`,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as {
      recommendations?: { id: string; reason: string }[];
    };
    recommendedIds = parsed.recommendations ?? [];
  } catch {
    const fallbackJobs = jobs.slice(0, 5);
    const reasons: Record<string, string> = {};
    for (const job of fallbackJobs) {
      reasons[job.id] = "Populaire en ce moment";
    }
    return c.json({ data: { jobs: fallbackJobs, reasons } });
  }

  const idToJob = new Map(jobs.map((j) => [j.id, j]));
  const selectedJobs = recommendedIds
    .map((r) => idToJob.get(r.id))
    .filter((j): j is (typeof jobs)[number] => j !== undefined);

  const reasons: Record<string, string> = {};
  for (const rec of recommendedIds) {
    if (idToJob.has(rec.id)) {
      reasons[rec.id] = rec.reason;
    }
  }

  return c.json({ data: { jobs: selectedJobs, reasons } });
});

// GET /api/jobs/mine - Get recruiter's own job listings (active and inactive)
router.get("/mine", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  if (user.accountType !== "recruiter") {
    return c.json(
      { error: { message: "Only recruiters can access this endpoint", code: "FORBIDDEN" } },
      403
    );
  }

  const company = await prisma.company.findUnique({
    where: { userId: user.id },
  });

  if (!company) {
    return c.json({ data: { jobs: [] } });
  }

  const jobs = await prisma.jobListing.findMany({
    where: { companyId: company.id },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    include: {
      requiredSkills: true,
      _count: { select: { applications: true } },
      company: {
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          sector: true,
          isVerified: true,
        },
      },
    },
  });

  const mappedJobs = jobs.map((job) => ({
    ...job,
    applicantCount: job._count?.applications ?? 0,
  }));

  return c.json({ data: { jobs: mappedJobs } });
});

// GET /api/jobs/:id - Get single job
router.get("/:id", async (c) => {
  const jobId = c.req.param("id");

  const job = await prisma.jobListing.findUnique({
    where: { id: jobId },
    include: {
      requiredSkills: true,
      company: {
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          sector: true,
          isVerified: true,
          description: true,
          sizeRange: true,
          website: true,
        },
      },
      _count: { select: { applications: true } },
    },
  });

  if (!job) {
    return c.json(
      { error: { message: "Job not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Increment view count
  await prisma.jobListing.update({
    where: { id: jobId },
    data: { viewCount: { increment: 1 } },
  });

  return c.json({ data: job });
});

// POST /api/jobs - Create job listing (recruiter only)
router.post(
  "/",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1),
      category: z.string().nullable().optional(),
      contractType: z
        .enum(["cdi", "cdd", "stage", "freelance", "temps_partiel"])
        .default("cdd"),
      locationCity: z.string().default("Dakar"),
      locationNeighborhood: z.string().nullable().optional(),
      workMode: z
        .enum(["presentiel", "hybride", "teletravail"])
        .default("presentiel"),
      salaryMin: z.number().nullable().optional(),
      salaryMax: z.number().nullable().optional(),
      salaryNegotiable: z.boolean().default(true),
      description: z.string().min(1),
      requiredExperience: z.string().nullable().optional(),
      requiredEducation: z.string().nullable().optional(),
      deadline: z.string().nullable().optional(),
      maxApplicants: z.number().nullable().optional(),
      isUrgent: z.boolean().default(false),
      requiredSkills: z
        .array(
          z.object({
            skillName: z.string().min(1),
            isRequired: z.boolean().default(true),
          })
        )
        .default([]),
    })
  ),
  async (c) => {
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
            message: "Only recruiters can create job listings",
            code: "FORBIDDEN",
          },
        },
        403
      );
    }

    const company = await prisma.company.findUnique({
      where: { userId: user.id },
    });
    if (!company) {
      return c.json(
        {
          error: {
            message: "You must create a company profile first",
            code: "COMPANY_REQUIRED",
          },
        },
        400
      );
    }

    const { requiredSkills, ...jobData } = c.req.valid("json");

    const job = await prisma.jobListing.create({
      data: {
        ...jobData,
        companyId: company.id,
        requiredSkills: {
          create: requiredSkills,
        },
      },
      include: {
        requiredSkills: true,
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            sector: true,
            isVerified: true,
          },
        },
      },
    });

    return c.json({ data: job }, 201);
  }
);

// PUT /api/jobs/:id - Update job listing (owner only)
router.put(
  "/:id",
  zValidator(
    "json",
    z.object({
      title: z.string().min(1).optional(),
      category: z.string().nullable().optional(),
      contractType: z
        .enum(["cdi", "cdd", "stage", "freelance", "temps_partiel"])
        .optional(),
      locationCity: z.string().optional(),
      locationNeighborhood: z.string().nullable().optional(),
      workMode: z
        .enum(["presentiel", "hybride", "teletravail"])
        .optional(),
      salaryMin: z.number().nullable().optional(),
      salaryMax: z.number().nullable().optional(),
      salaryNegotiable: z.boolean().optional(),
      description: z.string().min(1).optional(),
      requiredExperience: z.string().nullable().optional(),
      requiredEducation: z.string().nullable().optional(),
      deadline: z.string().nullable().optional(),
      maxApplicants: z.number().nullable().optional(),
      isUrgent: z.boolean().optional(),
      isActive: z.boolean().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        401
      );
    }

    const jobId = c.req.param("id");
    const job = await prisma.jobListing.findUnique({
      where: { id: jobId },
      include: { company: true },
    });

    if (!job) {
      return c.json(
        { error: { message: "Job not found", code: "NOT_FOUND" } },
        404
      );
    }

    if (job.company.userId !== user.id && user.accountType !== "admin") {
      return c.json(
        { error: { message: "Not authorized to edit this job", code: "FORBIDDEN" } },
        403
      );
    }

    const data = c.req.valid("json");
    const updated = await prisma.jobListing.update({
      where: { id: jobId },
      data,
      include: {
        requiredSkills: true,
        company: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            sector: true,
            isVerified: true,
          },
        },
      },
    });

    return c.json({ data: updated });
  }
);

// DELETE /api/jobs/:id - Delete job listing (owner only)
router.delete("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const jobId = c.req.param("id");
  const job = await prisma.jobListing.findUnique({
    where: { id: jobId },
    include: { company: true },
  });

  if (!job) {
    return c.json(
      { error: { message: "Job not found", code: "NOT_FOUND" } },
      404
    );
  }

  if (job.company.userId !== user.id && user.accountType !== "admin") {
    return c.json(
      { error: { message: "Not authorized to delete this job", code: "FORBIDDEN" } },
      403
    );
  }

  await prisma.jobListing.delete({ where: { id: jobId } });
  return c.json({ data: { success: true } });
});

// POST /api/jobs/:id/apply - Apply to a job
router.post(
  "/:id/apply",
  zValidator(
    "json",
    z.object({
      coverMessage: z.string().nullable().optional(),
    })
  ),
  async (c) => {
    const user = c.get("user");
    if (!user) {
      return c.json(
        { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
        401
      );
    }

    if (user.accountType !== "candidate") {
      return c.json(
        {
          error: {
            message: "Only candidates can apply to jobs",
            code: "FORBIDDEN",
          },
        },
        403
      );
    }

    const jobId = c.req.param("id");

    // Get job
    const job = await prisma.jobListing.findUnique({
      where: { id: jobId },
    });
    if (!job || !job.isActive) {
      return c.json(
        { error: { message: "Job not found or inactive", code: "NOT_FOUND" } },
        404
      );
    }

    // Check max applicants
    if (job.maxApplicants) {
      const count = await prisma.application.count({ where: { jobId } });
      if (count >= job.maxApplicants) {
        return c.json(
          {
            error: {
              message: "This job has reached maximum applicants",
              code: "MAX_APPLICANTS",
            },
          },
          400
        );
      }
    }

    // Get candidate profile
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json(
        {
          error: {
            message: "You must complete your profile before applying",
            code: "PROFILE_REQUIRED",
          },
        },
        400
      );
    }

    // Check for duplicate application
    const existing = await prisma.application.findFirst({
      where: { jobId, candidateId: profile.id },
    });
    if (existing) {
      return c.json(
        {
          error: {
            message: "You have already applied to this job",
            code: "DUPLICATE_APPLICATION",
          },
        },
        409
      );
    }

    // Check credits
    const applicant = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    });
    if (!applicant || applicant.credits <= 0) {
      return c.json(
        {
          error: {
            message: "Insufficient credits. Please purchase more credits to apply.",
            code: "NO_CREDITS",
          },
        },
        402
      );
    }

    // Deduct 1 credit and create transaction atomically
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } },
      }),
      prisma.creditTransaction.create({
        data: { userId: user.id, amount: -1, type: "spend", note: "Job application" },
      }),
    ]);

    const { coverMessage } = c.req.valid("json");

    const application = await prisma.application.create({
      data: {
        jobId,
        candidateId: profile.id,
        coverMessage: coverMessage ?? null,
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: {
              select: { companyName: true, logoUrl: true },
            },
          },
        },
      },
    });

    // Create notification for the recruiter
    const jobWithCompany = await prisma.jobListing.findUnique({
      where: { id: jobId },
      include: { company: true },
    });
    if (jobWithCompany) {
      await prisma.notification.create({
        data: {
          userId: jobWithCompany.company.userId,
          type: "application_update",
          title: "Nouvelle candidature",
          body: `${profile.fullName || user.name} a postule pour "${jobWithCompany.title}"`,
          dataJson: JSON.stringify({
            applicationId: application.id,
            jobId,
          }),
        },
      });
    }

    return c.json({ data: application }, 201);
  }
);

// GET /api/jobs/my/listings - Get recruiter's own job listings
router.get("/my/listings", async (c) => {
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
    return c.json({ data: { jobs: [], total: 0 } });
  }

  const jobs = await prisma.jobListing.findMany({
    where: { companyId: company.id },
    orderBy: { createdAt: "desc" },
    include: {
      requiredSkills: true,
      _count: { select: { applications: true } },
    },
  });

  return c.json({ data: { jobs, total: jobs.length } });
});

export { router as jobsRouter };
