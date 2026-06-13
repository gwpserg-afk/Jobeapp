import { Hono } from "hono";
import { env } from "../env";

const generateImagesRouter = new Hono();

interface GenerateImageRequest {
  prompt: string;
  aspectRatio?: "1:1" | "16:9" | "9:16";
  imageSize?: "1K" | "2K" | "4K";
}

// Generate a single image using Nano Banana API
generateImagesRouter.post("/", async (c) => {
  const body = await c.req.json<GenerateImageRequest>();

  if (!body.prompt) {
    return c.json({ error: { message: "Prompt is required", code: "INVALID_REQUEST" } }, 400);
  }

  if (!env.GOOGLE_API_KEY) {
    return c.json(
      { error: { message: "Image generation not configured", code: "NOT_CONFIGURED" } },
      500
    );
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
      {
        method: "POST",
        headers: {
          "x-goog-api-key": env.GOOGLE_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: body.prompt }] }],
          generationConfig: {
            responseModalities: ["Image"],
            imageConfig: {
              aspectRatio: body.aspectRatio || "16:9",
              imageSize: body.imageSize || "2K",
            },
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error("Image generation API error:", error);
      return c.json(
        { error: { message: "Failed to generate image", code: "GENERATION_FAILED" } },
        500
      );
    }

    const result = (await response.json()) as any;

    // Check if generation was successful
    if (!result.candidates || result.candidates.length === 0) {
      console.error("No candidates in response:", result);
      return c.json(
        { error: { message: "No image generated", code: "NO_CANDIDATES" } },
        500
      );
    }

    const imagePart = result.candidates[0]?.content?.parts?.find(
      (p: any) => p.inlineData
    );

    if (!imagePart?.inlineData?.data) {
      console.error("No image data in response:", result);
      return c.json(
        { error: { message: "No image data received", code: "NO_IMAGE_DATA" } },
        500
      );
    }

    return c.json({
      data: {
        base64: imagePart.inlineData.data,
        mimeType: imagePart.inlineData.mimeType || "image/png",
      },
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return c.json(
      { error: { message: "Image generation failed", code: "GENERATION_ERROR" } },
      500
    );
  }
});

// Batch generate images for feed posts
generateImagesRouter.post("/batch", async (c) => {
  const body = await c.req.json<{ prompts: string[] }>();

  if (!body.prompts || body.prompts.length === 0) {
    return c.json({ error: { message: "Prompts array is required", code: "INVALID_REQUEST" } }, 400);
  }

  const results: { prompt: string; base64?: string; error?: string }[] = [];

  for (const prompt of body.prompts) {
    try {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": env.GOOGLE_API_KEY || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["Image"],
              imageConfig: {
                aspectRatio: "16:9",
                imageSize: "2K",
              },
            },
          }),
        }
      );

      if (!response.ok) {
        results.push({ prompt, error: "API error" });
        continue;
      }

      const result = (await response.json()) as any;
      const imagePart = result.candidates?.[0]?.content?.parts?.find(
        (p: any) => p.inlineData
      );

      if (imagePart?.inlineData?.data) {
        results.push({ prompt, base64: imagePart.inlineData.data });
      } else {
        results.push({ prompt, error: "No image data" });
      }

      // Add delay between requests to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      results.push({ prompt, error: String(error) });
    }
  }

  return c.json({ data: results });
});

export { generateImagesRouter };
