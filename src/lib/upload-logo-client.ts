/** Client-side logo upload to Vercel Blob via POST /api/upload-logo */

export async function uploadLogoFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("logo", file);

  const response = await fetch("/api/upload-logo", {
    method: "POST",
    body: formData,
  });

  const data = (await response.json()) as { logoUrl?: string; error?: string };
  if (!response.ok || !data.logoUrl) {
    throw new Error(data.error || "Logo upload failed");
  }

  return data.logoUrl;
}
