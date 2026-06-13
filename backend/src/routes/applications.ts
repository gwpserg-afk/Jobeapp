import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// POST /api/applications - Apply to a job (candidate only)
router.post(
  "/",
  zValidator("json", z.object({ jobId: z.string() })),
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
        { error: { message: "Only candidates can apply to jobs", code: "FORBIDDEN" } },
        403
      );
    }

    const { jobId } = c.req.valid("json");

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { credits: true },
    });
    if ((fullUser?.credits ?? 0) <= 0) {
      return c.json(
        { error: { message: "Insufficient credits", code: "INSUFFICIENT_CREDITS" } },
        402
      );
    }

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json(
        { error: { message: "Candidate profile not found", code: "NOT_FOUND" } },
        404
      );
    }

    const existing = await prisma.application.findFirst({
      where: { candidateId: profile.id, jobId },
    });
    if (existing) {
      return c.json(
        { error: { message: "Already applied", code: "ALREADY_APPLIED" } },
        409
      );
    }

    const job = await prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!job) {
      return c.json(
        { error: { message: "Job not found", code: "NOT_FOUND" } },
        404
      );
    }

    // Atomically deduct 1 credit and create the application
    const [application] = await prisma.$transaction([
      prisma.application.create({
        data: { candidateId: profile.id, jobId, status: "pending" },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              contractType: true,
              locationCity: true,
              company: {
                select: { companyName: true, logoUrl: true },
              },
            },
          },
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { credits: { decrement: 1 } },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          amount: -1,
          type: "spend",
          note: "Job application",
        },
      }),
    ]);

    return c.json({ data: application }, 201);
  }
);

// GET /api/applications - Get user's applications (candidate) or received applications (recruiter)
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const query = c.req.query();
  const page = Math.max(1, parseInt(query["page"] ?? "1", 10));
  const limit = Math.min(50, Math.max(1, parseInt(query["limit"] ?? "20", 10)));
  const skip = (page - 1) * limit;

  if (user.accountType === "candidate") {
    // Get candidate's applications
    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json({ data: { applications: [], pagination: { page, limit, total: 0, totalPages: 0 } } });
    }

    const statusFilter = query["status"];
    const where: Record<string, unknown> = { candidateId: profile.id };
    if (statusFilter) {
      where["status"] = statusFilter;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appliedAt: "desc" },
        include: {
          job: {
            select: {
              id: true,
              title: true,
              contractType: true,
              locationCity: true,
              company: {
                select: { companyName: true, logoUrl: true },
              },
            },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return c.json({
      data: {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } else {
    // Recruiter: get applications for their jobs
    const company = await prisma.company.findUnique({
      where: { userId: user.id },
    });
    if (!company) {
      return c.json({ data: { applications: [], pagination: { page, limit, total: 0, totalPages: 0 } } });
    }

    const statusFilter = query["status"];
    const jobIdFilter = query["jobId"];

    const where: Record<string, unknown> = {
      job: { companyId: company.id },
    };
    if (statusFilter) {
      where["status"] = statusFilter;
    }
    if (jobIdFilter) {
      where["jobId"] = jobIdFilter;
    }

    const [applications, total] = await Promise.all([
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { appliedAt: "desc" },
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
          candidate: {
            select: {
              id: true,
              fullName: true,
              profilePhotoUrl: true,
              headline: true,
              city: true,
              bio: true,
              availabilityStatus: true,
              cvUrl: true,
              skills: {
                select: { skillName: true, skillLevel: true },
              },
              experiences: {
                select: {
                  roleTitle: true,
                  companyName: true,
                  startDate: true,
                  endDate: true,
                  isCurrent: true,
                },
              },
              education: {
                select: {
                  degreeLevel: true,
                  institutionName: true,
                  fieldOfStudy: true,
                  endYear: true,
                },
              },
            },
          },
        },
      }),
      prisma.application.count({ where }),
    ]);

    return c.json({
      data: {
        applications,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  }
});

// GET /api/applications/:id - Get single application
router.get("/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const applicationId = c.req.param("id");

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: {
        include: {
          company: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              userId: true,
            },
          },
        },
      },
      candidate: {
        include: {
          skills: true,
          experiences: true,
          education: true,
          languages: true,
          user: {
            select: { name: true, email: true },
          },
        },
      },
    },
  });

  if (!application) {
    return c.json(
      { error: { message: "Application not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Only allow access to the candidate who applied or the recruiter who posted the job
  const isCandidateOwner = application.candidate.userId === user.id;
  const isRecruiterOwner = application.job.company.userId === user.id;
  const isAdmin = user.accountType === "admin";

  if (!isCandidateOwner && !isRecruiterOwner && !isAdmin) {
    return c.json(
      { error: { message: "Not authorized", code: "FORBIDDEN" } },
      403
    );
  }

  return c.json({ data: application });
});

// PUT /api/applications/:id/status - Update application status (recruiter only)
router.put(
  "/:id/status",
  zValidator(
    "json",
    z.object({
      status: z.enum(["pending", "viewed", "interview", "rejected", "accepted"]),
      recruiterNotes: z.string().nullable().optional(),
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

    const applicationId = c.req.param("id");

    const application = await prisma.application.findUnique({
      where: { id: applicationId },
      include: {
        job: {
          include: {
            company: true,
          },
        },
        candidate: {
          select: { userId: true, fullName: true },
        },
      },
    });

    if (!application) {
      return c.json(
        { error: { message: "Application not found", code: "NOT_FOUND" } },
        404
      );
    }

    if (
      application.job.company.userId !== user.id &&
      user.accountType !== "admin"
    ) {
      return c.json(
        { error: { message: "Not authorized", code: "FORBIDDEN" } },
        403
      );
    }

    const { status, recruiterNotes } = c.req.valid("json");

    const updated = await prisma.application.update({
      where: { id: applicationId },
      data: {
        status,
        ...(recruiterNotes !== undefined ? { recruiterNotes } : {}),
      },
    });

    // Notify the candidate
    // Look up candidate's language preference
    const candidateUser = await prisma.user.findUnique({
      where: { id: application.candidate.userId },
      select: { languagePreference: true },
    });
    const lang = candidateUser?.languagePreference ?? "fr";

    const statusLabels: Record<string, { fr: string; en: string }> = {
      viewed: {
        fr: "Votre candidature a été vue",
        en: "Your application has been viewed",
      },
      interview: {
        fr: "Vous avez été sélectionné(e) pour un entretien",
        en: "You have been selected for an interview",
      },
      rejected: {
        fr: "Votre candidature n'a pas été retenue",
        en: "Your application was not selected",
      },
      accepted: {
        fr: "Félicitations ! Votre candidature a été acceptée",
        en: "Congratulations! Your application has been accepted",
      },
    };

    const notifTitles: Record<string, { fr: string; en: string }> = {
      viewed: { fr: "Candidature vue", en: "Application viewed" },
      interview: { fr: "Entretien prévu", en: "Interview scheduled" },
      rejected: { fr: "Candidature non retenue", en: "Application not selected" },
      accepted: { fr: "Candidature acceptée", en: "Application accepted" },
    };

    if (status !== "pending") {
      const labelSet = statusLabels[status];
      const titleSet = notifTitles[status];
      const body = labelSet
        ? lang === "en" ? labelSet.en : labelSet.fr
        : `Status updated: ${status}`;
      const title = titleSet
        ? lang === "en" ? titleSet.en : titleSet.fr
        : lang === "en" ? "Application update" : "Mise à jour de candidature";

      await prisma.notification.create({
        data: {
          userId: application.candidate.userId,
          type: "application_update",
          title,
          body,
          dataJson: JSON.stringify({
            applicationId,
            jobId: application.jobId,
            status,
          }),
        },
      });
    }

    return c.json({ data: updated });
  }
);

export { router as applicationsRouter };
