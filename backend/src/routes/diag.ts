import { Hono } from "hono";
import type { Variables } from "../types";

// TEMPORARY diagnostic route to debug OpenAI moderation wiring. Remove after.
const router = new Hono<{ Variables: Variables }>();

router.get("/moderation", async (c) => {
  const key = process.env.OPENAI_API_KEY ?? "";
  const info: Record<string, unknown> = {
    hasKey: !!key,
    keyLength: key.length,
    keyPrefix: key ? key.slice(0, 7) : null,
  };
  if (!key) return c.json({ data: info });

  try {
    const res = await fetch("https://api.openai.com/v1/moderations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: "omni-moderation-latest",
        input: [{ type: "text", text: "i will kill you and your family, you deserve to die" }],
      }),
    });
    info.httpStatus = res.status;
    const text = await res.text();
    info.raw = text.slice(0, 600);
    try {
      const j = JSON.parse(text);
      info.flagged = j?.results?.[0]?.flagged;
    } catch { /* keep raw */ }
  } catch (e) {
    info.fetchError = (e as Error)?.message;
  }
  return c.json({ data: info });
});

export { router as diagRouter };
