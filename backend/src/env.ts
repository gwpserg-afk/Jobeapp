import { z } from "zod";

/**
 * Environment variable schema using Zod
 * This ensures all required environment variables are present and valid
 */
const envSchema = z.object({
  // Server Configuration
  PORT: z.string().optional().default("3000"),
  NODE_ENV: z.string().optional(),

  // Database
  DATABASE_URL: z.string().default("file:./dev.db"),

  // Auth
  BETTER_AUTH_SECRET: z.string().min(1),

  // Backend URL (set by platform or defaults to empty)
  BACKEND_URL: z.string().optional().default(""),

  // OpenAI
  OPENAI_API_KEY: z.string().optional(),

  // Google API (Nano Banana)
  GOOGLE_API_KEY: z.string().optional(),

  // Google OAuth (Sign in with Google). Optional — social login is enabled
  // only when BOTH are present, so the app runs fine before they're set.
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

});

/**
 * Validate and parse environment variables
 */
function validateEnv() {
  try {
    const parsed = envSchema.parse(process.env);
    console.log("Environment variables validated successfully");
    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("Environment variable validation failed:");
      error.issues.forEach((err: any) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      console.error(
        "\nPlease check your .env file and ensure all required variables are set."
      );
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Validated and typed environment variables
 */
export const env = validateEnv();

// On Render (and similar hosts) the public URL is provided automatically.
// Use it as BACKEND_URL when we didn't set one explicitly, so Better Auth's
// baseURL is correct in production without hardcoding the deploy URL.
if (!env.BACKEND_URL && process.env.RENDER_EXTERNAL_URL) {
  env.BACKEND_URL = process.env.RENDER_EXTERNAL_URL;
}

/**
 * Type of the validated environment variables
 */
export type Env = z.infer<typeof envSchema>;

/**
 * Extend process.env with our environment variables
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    // eslint-disable-next-line import/namespace
    interface ProcessEnv extends z.infer<typeof envSchema> {}
  }
}
