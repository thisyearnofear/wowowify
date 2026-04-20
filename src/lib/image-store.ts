import { put, head } from "@vercel/blob";
import { logger } from "./logger";

// --- Types ---

interface ImageData {
  buffer: Buffer;
  contentType: string;
  createdAt: number;
}

// --- In-memory fallback (used when BLOB_READ_WRITE_TOKEN is absent) ---

const memoryStore = new Map<string, ImageData>();

// Track IDs that were *successfully* stored in Vercel Blob (so we can redirect
// instead of 404-ing, and distinguish from memory-fallback-then-evicted).
const blobStoredIds = new Set<string>();

const MAX_IMAGE_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

function cleanupMemoryStore(): void {
  const now = Date.now();
  let deleted = 0;
  memoryStore.forEach((data, id) => {
    if (now - data.createdAt > MAX_IMAGE_AGE_MS) {
      memoryStore.delete(id);
      deleted++;
    }
  });
  if (deleted > 0) logger.info("Cleaned up old in-memory images", { count: deleted });
}

// Periodic cleanup only applies to in-memory fallback
setInterval(cleanupMemoryStore, CLEANUP_INTERVAL_MS);

const hasBlobToken = !!process.env.BLOB_READ_WRITE_TOKEN;

/**
 * Store an image. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set,
 * otherwise falls back to in-memory (ephemeral, dev-only).
 *
 * Returns the URL at which the image can be retrieved.
 */
export async function storeImage(
  id: string,
  buffer: Buffer,
  contentType: string = "image/png"
): Promise<string> {
  if (hasBlobToken) {
    try {
      const blob = await put(`images/${id}.png`, buffer, {
        contentType,
        access: "public",
      });
      logger.info("Image stored in Vercel Blob", { id, url: blob.url });
      blobStoredIds.add(id);
      blobUrlMap.set(id, blob.url);
      return blob.url;
    } catch (error) {
      logger.error("Vercel Blob store failed, falling back to memory", {
        error: error instanceof Error ? error.message : String(error),
        id,
      });
      // Fall through to memory fallback
    }
  }

  // In-memory fallback
  memoryStore.set(id, { buffer, contentType, createdAt: Date.now() });
  logger.info("Image stored in memory (no blob token)", { id, contentType });
  // Return a local API URL that serves from memory
  return `/api/image?id=${id}`;
}

/**
 * Retrieve image data. For Blob-stored images, returns metadata needed
 * to redirect. For memory-stored images, returns the buffer directly.
 */
export function getImage(id: string): ImageData | undefined {
  return memoryStore.get(id);
}

/**
 * Check whether an image ID was *successfully* stored in Vercel Blob.
 * Uses an explicit Set rather than inferring from absence in memory,
 * so we correctly handle the case where Blob fails and falls back to memory
 * (and the memory entry is later evicted by cleanup).
 */
export function isStoredInBlob(id: string): boolean {
  return blobStoredIds.has(id);
}

/** Mapping from image ID → Blob URL for images successfully stored in Blob */
const blobUrlMap = new Map<string, string>();

/**
 * Get the Vercel Blob URL for an image that was stored in Blob.
 * Returns undefined if the image was not stored in Blob (or URL was not tracked).
 */
export function getBlobUrl(id: string): string | undefined {
  return blobUrlMap.get(id);
}

/**
 * Delete an image from memory store and Blob tracking set.
 * Blob-stored images are managed by Vercel Blob lifecycle.
 */
export function deleteImage(id: string): boolean {
  const deleted = memoryStore.delete(id);
  blobStoredIds.delete(id);
  blobUrlMap.delete(id);
  if (deleted) logger.info("Image deleted from memory", { id });
  return deleted;
}

/** Number of images currently in the in-memory fallback store */
export function getImageStoreSize(): number {
  return memoryStore.size;
}
