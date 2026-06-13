/**
 * Image generation prompts for feed posts
 * These are realistic food photography and professional images
 */

export const FEED_IMAGE_PROMPTS = {
  // Post 1: Thiéboudienne for 50 people
  food1: "Professional food photography of a large dish of Thiéboudienne (Senegalese rice with fish), served for 50 people, colorful with vegetables, tomatoes, carrots, in a restaurant kitchen setting, bright studio lighting, appetizing professional food photo, high quality",
  food2: "Close-up professional food photography of Thiéboudienne rice dish with perfectly cooked fish, garnished with fresh vegetables, golden rice, steaming hot, appetizing presentation, restaurant quality, studio lighting",

  // Post 2: Custom wooden furniture
  wood1: "Professional furniture photography of a custom-made wooden cabinet or shelving unit, beautiful craftsmanship, solid wood construction, finished with natural stain, modern design, sitting in a bright living room, high quality product photography",
  wood2: "Detailed close-up of hand-crafted wooden furniture showing intricate woodworking details, joinery, and natural wood grain, professional lighting highlighting the craftsmanship, beautiful wood finishing",
  wood3: "Full room setting with custom wooden furniture installation, modern minimalist design, wooden furniture in a contemporary living space, professional interior photography, well-lit, showing the complete project",

  // Post 3: React Native app
  app1: "Professional UI/UX screenshot mockup of a React Native expense tracking app for businesses, clean modern interface, dashboard with charts and graphs, professional app design, showing financial data visualization, mobile app screen",

  // Post 4: New job at SG Sénégal
  office1: "Professional office environment at a modern financial company, bright corporate workspace, professional business setting with colleagues, modern office interior design, welcoming business atmosphere, professional photography",
};

export type FeedImageKey = keyof typeof FEED_IMAGE_PROMPTS;

/**
 * Generate all feed images via backend API
 */
export async function generateFeedImages() {
  const prompts = Object.values(FEED_IMAGE_PROMPTS);

  try {
    const response = await fetch("/api/generate-images/batch", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompts }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate images: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    return result.data;
  } catch (error) {
    console.error("Error generating feed images:", error);
    throw error;
  }
}

/**
 * Generate a single image
 */
export async function generateImage(prompt: string) {
  try {
    const response = await fetch("/api/generate-images", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ prompt }),
    });

    if (!response.ok) {
      throw new Error(`Failed to generate image: ${response.statusText}`);
    }

    const result = (await response.json()) as any;
    return result.data;
  } catch (error) {
    console.error("Error generating image:", error);
    throw error;
  }
}
