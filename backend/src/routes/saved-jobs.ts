import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// GET /api/saved-jobs - Get user's saved jobs
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const savedJobs = await prisma.savedJob.findMany({
    where: { userId: user.id },
    orderBy: { savedAt: "desc" },
    include: {
      job: {
        select: {
          id: true,
          title: true,
          contractType: true,
          locationCity: true,
          locationNeighborhood: true,
          workMode: true,
          salaryMin: true,
          salaryMax: true,
          isUrgent: true,
          createdAt: true,
          company: {
            select: {
              id: true,
              companyName: true,
              logoUrl: true,
              isVerified: true,
            },
          },
        },
      },
    },
  });

  return c.json({ data: savedJobs });
});

// POST /api/saved-jobs - Save a job
router.post(
  "/",
  zValidator(
    "json",
    z.object({
      jobId: z.string().min(1),
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

    const { jobId } = c.req.valid("json");

    // Verify job exists
    const job = await prisma.jobListing.findUnique({ where: { id: jobId } });
    if (!job) {
      return c.json(
        { error: { message: "Job not found", code: "NOT_FOUND" } },
        404
      );
    }

    const saved = await prisma.savedJob.upsert({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId,
        },
      },
      update: {},
      create: {
        userId: user.id,
        jobId,
      },
    });

    return c.json({ data: saved }, 201);
  }
);

// DELETE /api/saved-jobs/:jobId - Unsave a job
router.delete("/:jobId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const jobId = c.req.param("jobId");

  try {
    await prisma.savedJob.delete({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId,
        },
      },
    });
  } catch {
    // Already not saved, that is fine
  }

  return c.json({ data: { success: true } });
});

// GET /api/saved-jobs/check/:jobId - Check if a job is saved
router.get("/check/:jobId", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const jobId = c.req.param("jobId");

  const saved = await prisma.savedJob.findUnique({
    where: {
      userId_jobId: {
        userId: user.id,
        jobId,
      },
    },
  });

  return c.json({ data: { isSaved: !!saved } });
});

export { router as savedJobsRouter };
