import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { prisma } from "../prisma";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

// POST /api/onboarding - Complete onboarding
router.post(
  "/",
  zValidator(
    "json",
    z.object({
      accountType: z.enum(["candidate", "recruiter"]),
      // Candidate fields
      fullName: z.string().optional(),
      city: z.string().optional(),
      headline: z.string().optional(),
      // Recruiter fields
      companyName: z.string().optional(),
      sector: z.string().optional(),
      contactName: z.string().optional(),
      // Shared
      languagePreference: z.enum(["fr", "en", "zh", "wo"]).optional(),
      phone: z.string().optional(),
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

    // Update user account type and optional fields
    await prisma.user.update({
      where: { id: user.id },
      data: {
        accountType: data.accountType,
        ...(data.languagePreference
          ? { languagePreference: data.languagePreference }
          : {}),
        ...(data.phone ? { phone: data.phone } : {}),
        ...(data.fullName ? { name: data.fullName } : {}),
      },
    });

    if (data.accountType === "candidate") {
      // Create or update candidate profile
      const profile = await prisma.candidateProfile.upsert({
        where: { userId: user.id },
        update: {
          fullName: data.fullName ?? user.name,
          city: data.city ?? "Dakar",
          headline: data.headline ?? null,
        },
        create: {
          userId: user.id,
          fullName: data.fullName ?? user.name,
          city: data.city ?? "Dakar",
          headline: data.headline ?? null,
        },
        include: {
          skills: true,
          experiences: true,
          education: true,
          languages: true,
          portfolio: true,
          recommendations: true,
        },
      });

      return c.json({
        data: {
          accountType: "candidate",
          profile,
        },
      });
    } else {
      // Create or update company
      if (!data.companyName) {
        return c.json(
          {
            error: {
              message: "Company name is required for recruiter accounts",
              code: "VALIDATION_ERROR",
            },
          },
          400
        );
      }

      const company = await prisma.company.upsert({
        where: { userId: user.id },
        update: {
          companyName: data.companyName,
          sector: data.sector ?? null,
          contactName: data.contactName ?? user.name,
        },
        create: {
          userId: user.id,
          companyName: data.companyName,
          sector: data.sector ?? null,
          contactName: data.contactName ?? user.name,
        },
      });

      return c.json({
        data: {
          accountType: "recruiter",
          company,
        },
      });
    }
  }
);

export { router as onboardingRouter };
