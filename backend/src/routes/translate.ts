import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import type { Variables } from "../types";

const router = new Hono<{ Variables: Variables }>();

const LANG_NAMES: Record<string, string> = {
  fr: "French",
  en: "English",
  zh: "Chinese (Simplified)",
};

// In-memory translation cache (text+lang -> translated). Cheap way to avoid
// re-translating the same post repeatedly. Bounded so it can't grow forever.
const cache = new Map<string, string>();
const MAX_CACHE = 2000;

// POST /api/translate — translate arbitrary text into the reader's language.
// Returns { translated, changed } where `changed` is false if the text was
// already in the target language (so the client can hide the toggle).
router.post(
  "/",
  zValidator("json", z.object({
    text: z.string().min(1).max(4000),
    targetLang: z.enum(["fr", "en", "zh"]),
  })),
  async (c) => {
    const user = c.get("user");
    if (!user) return c.json({ error: { message: "Unauthorized", code: "UNAUTHORIZED" } }, 401);

    const { text, targetLang } = c.req.valid("json");
    const key = `${targetLang}::${text}`;
    const cached = cache.get(key);
    if (cached !== undefined) {
      return c.json({ data: { translated: cached, changed: cached.trim() !== text.trim() } });
    }

    if (!process.env.OPENAI_API_KEY) {
      return c.json({ data: { translated: text, changed: false } });
    }

    try {
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              `You are a professional translator for a social app. Translate the user's text into ${LANG_NAMES[targetLang]}. ` +
              `If the text is ALREADY in ${LANG_NAMES[targetLang]}, return it EXACTLY unchanged. ` +
              `Preserve emojis, @mentions and #hashtags. Return ONLY the text, no quotes, no notes.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 1200,
        temperature: 0.1,
      });

      const translated = response.choices[0]?.message?.content?.trim() ?? text;
      if (cache.size >= MAX_CACHE) cache.clear();
      cache.set(key, translated);
      return c.json({ data: { translated, changed: translated.trim() !== text.trim() } });
    } catch {
      // Fail open — never break the feed because translation is down.
      return c.json({ data: { translated: text, changed: false } });
    }
  }
);

export { router as translateRouter };
