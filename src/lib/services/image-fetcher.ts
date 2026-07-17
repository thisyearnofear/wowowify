/**
 * ImageFetcher — pure functional network helper for buffer acquisition.
 *
 * Extracted from src/lib/services/command-router.ts to drop that module below
 * the 250-LOC budget. Pure functions — no class wrapper, no module state.
 *
 * Scope: remote-image downloads for base images and exact brand marks, with Farcaster
 * imagedelivery.net special-casing. Does not touch Venice, overlays, or canvas.
 *
 * Caller owns the AbortSignal composition (CommandRouter's processCommand
 * creates one and threads it down to this module).
 */

import { logger } from "@/lib/logger";

/**
 * Fetch an image from a URL as a Buffer. Special-cases Farcaster's
 * imagedelivery.net to request the /original variant for full resolution.
 *
 * Throws on:
 *   - non-2xx status from the upstream
 *   - buffer payload < 100 bytes (likely invalid)
 *   - URL special-casing arithmetic failure
 *
 * The caller is responsible for the
 * AbortSignal lifecycle + feeding errors back through `processCommand`'s
 * try/catch.
 */
export async function downloadImage(
  imageUrl: string,
  abortSignal: AbortSignal,
): Promise<Buffer> {
  try {
    const isFarcasterImage = imageUrl.includes("imagedelivery.net");
    const finalImageUrl =
      isFarcasterImage && !imageUrl.includes("/original")
        ? `${imageUrl.split("?")[0]}/original`
        : imageUrl;

    if (finalImageUrl !== imageUrl) {
      logger.info("Modified image URL to request original size", {
        originalUrl: imageUrl.substring(0, 100),
        modifiedUrl: finalImageUrl.substring(0, 100),
      });
    }

    const response = await fetch(finalImageUrl, {
      signal: abortSignal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; WOWOWIFYAgent/1.0)",
        Accept: "image/*, */*",
      },
    });
    if (!response.ok) {
      throw new Error(
        `Failed to download image: ${response.status} ${response.statusText}`,
      );
    }

    const contentType = response.headers.get("content-type");
    if (contentType && !contentType.includes("image")) {
      logger.warn("URL did not return an image content type", {
        contentType,
        url: finalImageUrl.substring(0, 100),
      });
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length < 100) {
      throw new Error("Downloaded image is too small or invalid");
    }
    logger.info("Successfully downloaded image", {
      size: buffer.length,
      url: finalImageUrl.substring(0, 100),
    });
    return buffer;
  } catch (error) {
    logger.error("Error downloading image", {
      error: error instanceof Error ? error.message : "Unknown error",
      url: imageUrl.substring(0, 100),
    });
    throw new Error(
      `Failed to download image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`,
    );
  }
}
