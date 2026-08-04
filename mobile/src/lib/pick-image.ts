import * as ImagePicker from "expo-image-picker";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";

/**
 * Opens the photo library, lets the user crop, then RESIZES + compresses the
 * image before returning a base64 data URI. Resizing is essential: a raw phone
 * photo as base64 is 1-3MB and React Native's <Image> fails to render such huge
 * data URIs ("photos didn't load"). We downscale to <=1080px wide + JPEG q0.5,
 * which keeps it small enough to render reliably and store in the DB.
 * Swap for a real image host (Cloudinary/S3) when scaling.
 */
export async function pickImageAsDataUri(aspect?: [number, number]): Promise<string | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  // Only force cropping when an aspect is required (e.g. square avatar). For
  // regular posts (no aspect) allow the full uncropped image.
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: !!aspect,
    aspect,
    quality: 1,
  });

  const asset = res.canceled ? null : res.assets?.[0];
  if (!asset?.uri) return null;

  try {
    const manipulated = await manipulateAsync(
      asset.uri,
      [{ resize: { width: 1080 } }],
      { compress: 0.5, format: SaveFormat.JPEG, base64: true }
    );
    if (!manipulated.base64) return null;
    return `data:image/jpeg;base64,${manipulated.base64}`;
  } catch {
    return null;
  }
}
