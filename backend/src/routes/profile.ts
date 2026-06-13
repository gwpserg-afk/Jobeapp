import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";
import { containsProfanity, getProfanityError } from "../utils/profanityFilter";
import { env } from "../env";
import OpenAI from "openai";

const router = new Hono<{ Variables: Variables }>();

// GET /api/profile - Get current user's candidate profile
router.get("/", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);
  }

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    include: {
      user: {
        select: { isVerified: true, isGoldVerified: true, isPremium: true },
      },
      skills: {
        orderBy: { createdAt: "desc" },
      },
      experiences: {
        orderBy: { createdAt: "desc" },
      },
      education: {
        orderBy: { createdAt: "desc" },
      },
      languages: {
        orderBy: { createdAt: "desc" },
      },
      portfolio: {
        orderBy: { createdAt: "desc" },
      },
      recommendations: {
        where: { isApproved: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!profile) {
    return c.json(
      { error: { message: "Profile not found", code: "NOT_FOUND" } },
      404
    );
  }

  const { user: profileUser, ...profileData } = profile;
  return c.json({
    data: {
      ...profileData,
      isVerified: profileUser?.isVerified ?? false,
      isGoldVerified: profileUser?.isGoldVerified ?? false,
      isPremium: profileUser?.isPremium ?? false,
    },
  });
});

// PUT /api/profile - Update candidate profile
router.put(
  "/",
  zValidator(
    "json",
    z.object({
      fullName: z.string().optional(),
      profilePhotoUrl: z.string().nullable().optional(),
      dateOfBirth: z.string().nullable().optional(),
      city: z.string().optional(),
      neighborhood: z.string().nullable().optional(),
      headline: z.string().nullable().optional(),
      bio: z.string().nullable().optional(),
      availabilityStatus: z
        .enum(["available", "soon", "unavailable"])
        .optional(),
      availabilityDate: z.string().nullable().optional(),
      introVideoUrl: z.string().nullable().optional(),
      profileVisibility: z
        .enum(["public", "recruiters_only", "private"])
        .optional(),
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

    const data = c.req.valid("json");

    if (data.bio && containsProfanity(data.bio)) {
      return c.json({ error: { message: getProfanityError(), code: "PROFANITY" } }, 422);
    }

    const profile = await prisma.candidateProfile.upsert({
      where: { userId: user.id },
      update: data,
      create: {
        userId: user.id,
        ...data,
      },
      include: {
        skills: true,
        experiences: true,
        education: true,
        languages: true,
        portfolio: true,
        recommendations: { where: { isApproved: true } },
      },
    });

    // Calculate profile completion percentage
    const completePct = calculateProfileCompletion(profile);
    if (completePct !== profile.profileCompletePct) {
      await prisma.candidateProfile.update({
        where: { id: profile.id },
        data: { profileCompletePct: completePct },
      });
      (profile as any).profileCompletePct = completePct;
    }

    return c.json({ data: profile });
  }
);

// POST /api/profile/skills - Add skill
router.post(
  "/skills",
  zValidator(
    "json",
    z.object({
      skillName: z.string().min(1),
      skillLevel: z.enum(["beginner", "intermediate", "expert"]).default("intermediate"),
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

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json(
        { error: { message: "Profile not found", code: "NOT_FOUND" } },
        404
      );
    }

    const data = c.req.valid("json");
    const skill = await prisma.candidateSkill.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });

    return c.json({ data: skill });
  }
);

// DELETE /api/profile/skills/:id - Remove skill
router.delete("/skills/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const skillId = c.req.param("id");
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return c.json(
      { error: { message: "Profile not found", code: "NOT_FOUND" } },
      404
    );
  }

  // Verify the skill belongs to this user
  const skill = await prisma.candidateSkill.findFirst({
    where: { id: skillId, candidateId: profile.id },
  });
  if (!skill) {
    return c.json(
      { error: { message: "Skill not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.candidateSkill.delete({ where: { id: skillId } });
  return c.json({ data: { success: true } });
});

// POST /api/profile/experiences - Add experience
router.post(
  "/experiences",
  zValidator(
    "json",
    z.object({
      companyName: z.string().min(1),
      roleTitle: z.string().min(1),
      startDate: z.string().min(1),
      endDate: z.string().nullable().optional(),
      isCurrent: z.boolean().default(false),
      isInformal: z.boolean().default(false),
      description: z.string().nullable().optional(),
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

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json(
        { error: { message: "Profile not found", code: "NOT_FOUND" } },
        404
      );
    }

    const data = c.req.valid("json");
    const experience = await prisma.candidateExperience.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });

    return c.json({ data: experience });
  }
);

// DELETE /api/profile/experiences/:id - Remove experience
router.delete("/experiences/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const expId = c.req.param("id");
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return c.json(
      { error: { message: "Profile not found", code: "NOT_FOUND" } },
      404
    );
  }

  const exp = await prisma.candidateExperience.findFirst({
    where: { id: expId, candidateId: profile.id },
  });
  if (!exp) {
    return c.json(
      { error: { message: "Experience not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.candidateExperience.delete({ where: { id: expId } });
  return c.json({ data: { success: true } });
});

// POST /api/profile/education - Add education
router.post(
  "/education",
  zValidator(
    "json",
    z.object({
      institutionName: z.string().min(1),
      degreeLevel: z.string().min(1),
      fieldOfStudy: z.string().nullable().optional(),
      startYear: z.string().nullable().optional(),
      endYear: z.string().nullable().optional(),
      isCurrent: z.boolean().default(false),
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

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json(
        { error: { message: "Profile not found", code: "NOT_FOUND" } },
        404
      );
    }

    const data = c.req.valid("json");
    const education = await prisma.candidateEducation.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });

    return c.json({ data: education });
  }
);

// DELETE /api/profile/education/:id - Remove education
router.delete("/education/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const eduId = c.req.param("id");
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return c.json(
      { error: { message: "Profile not found", code: "NOT_FOUND" } },
      404
    );
  }

  const edu = await prisma.candidateEducation.findFirst({
    where: { id: eduId, candidateId: profile.id },
  });
  if (!edu) {
    return c.json(
      { error: { message: "Education not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.candidateEducation.delete({ where: { id: eduId } });
  return c.json({ data: { success: true } });
});

// POST /api/profile/languages - Add language
router.post(
  "/languages",
  zValidator(
    "json",
    z.object({
      language: z.string().min(1),
      level: z.enum(["beginner", "intermediate", "fluent", "native"]).default("intermediate"),
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

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json(
        { error: { message: "Profile not found", code: "NOT_FOUND" } },
        404
      );
    }

    const data = c.req.valid("json");
    const lang = await prisma.candidateLanguage.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });

    return c.json({ data: lang });
  }
);

// DELETE /api/profile/languages/:id - Remove language
router.delete("/languages/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const langId = c.req.param("id");
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return c.json(
      { error: { message: "Language not found", code: "NOT_FOUND" } },
      404
    );
  }

  const lang = await prisma.candidateLanguage.findFirst({
    where: { id: langId, candidateId: profile.id },
  });
  if (!lang) {
    return c.json(
      { error: { message: "Language not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.candidateLanguage.delete({ where: { id: langId } });
  return c.json({ data: { success: true } });
});

// POST /api/profile/portfolio - Add portfolio item
router.post(
  "/portfolio",
  zValidator(
    "json",
    z.object({
      imageUrl: z.string().min(1),
      caption: z.string().nullable().optional(),
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

    const profile = await prisma.candidateProfile.findUnique({
      where: { userId: user.id },
    });
    if (!profile) {
      return c.json(
        { error: { message: "Profile not found", code: "NOT_FOUND" } },
        404
      );
    }

    const data = c.req.valid("json");
    const item = await prisma.portfolioItem.create({
      data: {
        candidateId: profile.id,
        ...data,
      },
    });

    return c.json({ data: item });
  }
);

// DELETE /api/profile/portfolio/:id - Remove portfolio item
router.delete("/portfolio/:id", async (c) => {
  const user = c.get("user");
  if (!user) {
    return c.json(
      { error: { message: "Unauthorized", code: "UNAUTHORIZED" } },
      401
    );
  }

  const itemId = c.req.param("id");
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
  });
  if (!profile) {
    return c.json(
      { error: { message: "Profile not found", code: "NOT_FOUND" } },
      404
    );
  }

  const item = await prisma.portfolioItem.findFirst({
    where: { id: itemId, candidateId: profile.id },
  });
  if (!item) {
    return c.json(
      { error: { message: "Portfolio item not found", code: "NOT_FOUND" } },
      404
    );
  }

  await prisma.portfolioItem.delete({ where: { id: itemId } });
  return c.json({ data: { success: true } });
});

// PUT /api/profile/cv  — save CV url and file id after upload
router.put("/cv", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  const { cvUrl, cvFileId } = await c.req.json<{ cvUrl: string; cvFileId?: string }>();
  if (!cvUrl) return c.json({ error: { message: "cvUrl required", code: "VALIDATION_ERROR" } }, 400);

  const profile = await prisma.candidateProfile.upsert({
    where: { userId: user.id },
    create: { userId: user.id, cvUrl, cvFileId: cvFileId ?? null },
    update: { cvUrl, cvFileId: cvFileId ?? null },
  });

  return c.json({ data: profile });
});

// DELETE /api/profile/cv — remove CV
router.delete("/cv", async (c) => {
  const user = c.get("user");
  if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

  await prisma.candidateProfile.updateMany({
    where: { userId: user.id },
    data: { cvUrl: null, cvFileId: null },
  });

  return c.json({ data: { success: true } });
});

// POST /api/profile/suggest - AI-powered skill-to-title matching
router.post(
  "/suggest",
  zValidator(
    "json",
    z.object({
      skills: z.array(z.string()).min(1, "At least one skill is required").max(20, "Maximum 20 skills allowed"),
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

    const { skills } = c.req.valid("json");

    if (!env.OPENAI_API_KEY) {
      return c.json({ data: { titles: [], categories: [] } });
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    let result: { titles: string[]; categories: string[] };
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a career advisor for a job platform in Senegal/West Africa. Respond ONLY with valid JSON, no markdown, no explanation.",
          },
          {
            role: "user",
            content: `Based on these skills: [${skills.join(", ")}], suggest 6 relevant professional job titles and 4 job categories for a job seeker. Return ONLY this JSON format:\n{"titles":["Title 1","Title 2","Title 3","Title 4","Title 5","Title 6"],"categories":["Category 1","Category 2","Category 3","Category 4"]}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? "";
      try {
        result = JSON.parse(raw) as { titles: string[]; categories: string[] };
      } catch {
        return c.json(
          { error: { message: "Failed to parse AI response", code: "PARSE_ERROR" } },
          500
        );
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "OpenAI request failed";
      return c.json(
        { error: { message, code: "OPENAI_ERROR" } },
        500
      );
    }

    return c.json({ data: result });
  }
);

// POST /api/profile/improve-text - AI-powered text improvement for work experience descriptions
router.post(
  "/improve-text",
  zValidator(
    "json",
    z.object({
      text: z.string().max(1000),
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

    const { text } = c.req.valid("json");

    if (!text || text.trim().length === 0) {
      return c.json({ data: { improved: "" } });
    }

    if (!env.OPENAI_API_KEY) {
      return c.json({ data: { improved: text } });
    }

    const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a professional career coach helping job seekers in Senegal and West Africa improve their work experience descriptions. Improve the provided text to be more professional, concise, and impactful. Return only the improved text, nothing else.",
          },
          {
            role: "user",
            content: text,
          },
        ],
      });

      const improved = completion.choices[0]?.message?.content ?? text;
      return c.json({ data: { improved } });
    } catch {
      return c.json({ data: { improved: text } });
    }
  }
);

function calculateProfileCompletion(profile: {
  fullName: string;
  profilePhotoUrl: string | null;
  headline: string | null;
  bio: string | null;
  city: string;
  skills: unknown[];
  experiences: unknown[];
  education: unknown[];
  languages: unknown[];
}): number {
  let score = 0;
  const total = 8;

  if (profile.fullName && profile.fullName.length > 0) score++;
  if (profile.profilePhotoUrl) score++;
  if (profile.headline) score++;
  if (profile.bio) score++;
  if (profile.city) score++;
  if (profile.skills.length > 0) score++;
  if (profile.experiences.length > 0) score++;
  if (profile.education.length > 0 || profile.languages.length > 0) score++;

  return Math.round((score / total) * 100);
}

export { router as profileRouter };
