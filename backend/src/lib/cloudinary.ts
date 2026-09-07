import { createHash } from "node:crypto";
import { env } from "../env";

/** True when Cloudinary is fully configured. */
export function cloudinaryConfigured(): boolean {
  return !!(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  );
}

/** Is this value a base64 data URI (what the app currently sends)? */
export function isDataUri(v: string | null | undefined): boolean {
  return typeof v === "string" && v.startsWith("data:");
}

/**
 * Upload an image (data URI, remote URL, or base64) to Cloudinary and return
 * the hosted secure URL. Falls back to returning the input unchanged when
 * Cloudinary isn't configured, so nothing breaks before keys are set.
 */
export async function uploadImage(
  source: string,
  folder = "jobe"
): Promise<string> {
  if (!cloudinaryConfigured()) return source;
  // Already a hosted http(s) URL — nothing to do.
  if (/^https?:\/\//.test(source)) return source;

  const cloud = env.CLOUDINARY_CLOUD_NAME!;
  const apiKey = env.CLOUDINARY_API_KEY!;
  const apiSecret = env.CLOUDINARY_API_SECRET!;
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature = sha1 of the alphabetically-sorted params to sign + api_secret.
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = createHash("sha1")
    .update(toSign + apiSecret)
    .digest("hex");

  const form = new FormData();
  form.set("file", source);
  form.set("api_key", apiKey);
  form.set("timestamp", String(timestamp));
  form.set("folder", folder);
  form.set("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    { method: "POST", body: form }
  );
  if (!res.ok) {
    console.error("Cloudinary upload failed:", res.status, await res.text());
    // Fall back to the original so a post/avatar still saves (as base64).
    return source;
  }
  const data = (await res.json()) as { secure_url?: string };
  return data.secure_url ?? source;
}
