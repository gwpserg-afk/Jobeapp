type UploadResult = { id: string; url: string; originalFilename?: string; filename?: string; contentType: string; sizeBytes: number };

export async function uploadFile(uri: string, filename: string, mimeType: string): Promise<UploadResult> {
  const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL!;
  const formData = new FormData();
  formData.append("file", { uri, type: mimeType, name: filename } as any);

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/upload`, {
      method: "POST",
      body: formData,
      credentials: "include",
    });
  } catch (networkErr) {
    console.error("[uploadFile] Network error:", networkErr);
    throw new Error("Network error during upload");
  }

  let data: any;
  try {
    data = await response.json();
  } catch (parseErr) {
    console.error("[uploadFile] Failed to parse response:", parseErr, "status:", response.status);
    throw new Error("Invalid server response");
  }

  if (!response.ok) {
    console.error("[uploadFile] Upload failed:", response.status, data);
    throw new Error(data?.error || "Upload failed");
  }

  if (!data?.data) {
    console.error("[uploadFile] Empty data in response:", data);
    throw new Error("Upload failed");
  }

  return data.data as UploadResult;
}
