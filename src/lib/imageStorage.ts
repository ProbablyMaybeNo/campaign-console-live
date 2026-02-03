import { supabase } from "@/integrations/supabase/client";

const BUCKET_NAME = "campaign-images";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

export interface UploadResult {
  url: string;
  path: string;
}

export class ImageUploadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageUploadError";
  }
}

/**
 * Validates the file before upload
 */
export function validateImageFile(file: File): void {
  if (file.size > MAX_FILE_SIZE) {
    throw new ImageUploadError(
      `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new ImageUploadError(
      `Invalid file type. Allowed types: ${ALLOWED_TYPES.join(", ")}`
    );
  }
}

/**
 * Uploads an image to the campaign-images storage bucket
 */
export async function uploadCampaignImage(
  campaignId: string,
  file: File,
  subfolder: "widgets" | "maps" = "widgets"
): Promise<UploadResult> {
  validateImageFile(file);

  const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const fileName = `${Date.now()}-${crypto.randomUUID()}.${fileExt}`;
  const filePath = `${campaignId}/${subfolder}/${fileName}`;

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new ImageUploadError(`Upload failed: ${error.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(data.path);

  return {
    url: urlData.publicUrl,
    path: data.path,
  };
}

/**
 * Deletes an image from the campaign-images storage bucket
 */
export async function deleteCampaignImage(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET_NAME).remove([path]);

  if (error) {
    console.error("Failed to delete image:", error);
    // Don't throw - deletion failures shouldn't block the UI
  }
}

/**
 * Checks if a URL is a base64 data URL
 */
export function isBase64Image(url: string): boolean {
  return url?.startsWith("data:image/");
}

/**
 * Gets the storage path from a public URL
 */
export function getPathFromUrl(url: string): string | null {
  if (!url || isBase64Image(url)) return null;
  
  const match = url.match(/campaign-images\/(.+)$/);
  return match ? match[1] : null;
}
