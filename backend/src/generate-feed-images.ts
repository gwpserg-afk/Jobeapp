/**
 * Script to generate realistic images for feed posts
 * Run this to create base64 images that will be embedded in demo data
 *
 * Usage: This is a helper utility - call generateAndStoreFeedImages() to generate all images at once
 */

import { FEED_IMAGE_PROMPTS } from "./image-generation-prompts";

interface GeneratedImage {
  key: string;
  prompt: string;
  base64: string;
  mimeType: string;
}

/**
 * Call the backend API to generate a single image
 */
async function generateSingleImage(
  prompt: string,
  apiBaseUrl: string
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/api/generate-images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      console.error(`Failed to generate image: ${response.statusText}`);
      return null;
    }

    const result = (await response.json()) as any;
    return {
      base64: result.data?.base64,
      mimeType: result.data?.mimeType || "image/png",
    };
  } catch (error) {
    console.error("Error generating image:", error);
    return null;
  }
}

/**
 * Generate all feed images
 * Returns an object with keys matching FEED_IMAGE_PROMPTS keys and base64 values
 */
export async function generateAllFeedImages(apiBaseUrl: string = "http://localhost:3000") {
  console.log("🎨 Starting image generation for feed posts...");
  console.log(`This will take approximately ${Object.keys(FEED_IMAGE_PROMPTS).length * 30} seconds\n`);

  const generatedImages: Record<string, string> = {};
  let successCount = 0;
  let failureCount = 0;

  for (const [key, prompt] of Object.entries(FEED_IMAGE_PROMPTS)) {
    console.log(`⏳ Generating image for "${key}"...`);
    const image = await generateSingleImage(prompt, apiBaseUrl);

    if (image?.base64) {
      generatedImages[key] = image.base64;
      successCount++;
      console.log(`✓ Successfully generated "${key}"\n`);
    } else {
      failureCount++;
      console.log(`✗ Failed to generate "${key}"\n`);
    }

    // Add delay between requests to avoid rate limiting
    if (Object.keys(FEED_IMAGE_PROMPTS).indexOf(key) < Object.keys(FEED_IMAGE_PROMPTS).length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`✓ Successful: ${successCount}`);
  console.log(`✗ Failed: ${failureCount}`);
  console.log(`\nGenerated images can now be added to DEMO_POSTS in demoData.ts`);

  return generatedImages;
}

/**
 * Format the generated images for use in demoData
 * Shows the structure needed for DEMO_POSTS
 */
export function formatImagesForDemoData(generatedImages: Record<string, string>) {
  console.log("\n📋 Use this structure in DEMO_POSTS:\n");

  const posts = [
    {
      id: "post-1",
      images: [generatedImages["food1"], generatedImages["food2"]],
    },
    {
      id: "post-2",
      images: [generatedImages["wood1"], generatedImages["wood2"], generatedImages["wood3"]],
    },
    {
      id: "post-3",
      images: [generatedImages["app1"]],
    },
    {
      id: "post-4",
      images: [generatedImages["office1"]],
    },
  ];

  console.log(JSON.stringify(posts, null, 2));
  console.log("\n💡 Note: Each image is a base64 string that can be used as:");
  console.log('   <Image source={{ uri: `data:image/png;base64,${imageString}` }} />');
}
