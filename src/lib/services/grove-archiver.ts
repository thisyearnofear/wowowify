/**
 * GroveArchiver — pure functional upload helper for image persistence to Grove.
 *
 * Extracted from src/lib/services/image-service.ts.
 *
 * Responsibility: hand a buffer to Grove via @/lib/grove-storage; on Farcaster
 * requests, retry once before giving up. Never throws on failure — best-effort
 * pattern lets the orchestrator continue with the Vercel Blob URL even when
 * Grove is unreachable.
 *
 * Scope: only talks to Grove. Does not touch image-store (Vercel Blob),
 * image-history (Redis), or any canvas work.
 */

import { logger } from "@/lib/logger";
import { uploadToGrove } from "@/lib/grove-storage";

/**
 * Attempt ONE copy on retry path, no further retries. Returns null on failure
 * so the orchestrator can decide whether to surface a degraded response.
 */
async function retryArchive(
  resultBuffer: Buffer,
  resultId: string,
  overlayMode?: string,
): Promise<{ groveUri: string; groveUrl: string } | null> {
  try {
    const retryFileName = `retry-${overlayMode || "generated"}-${resultId}.png`;
    const retryResult = await uploadToGrove(resultBuffer, retryFileName);
    if (retryResult.uri && retryResult.gatewayUrl) {
      logger.info("Successfully stored image in Grove on retry", {
        groveUri: retryResult.uri,
        groveUrl: retryResult.gatewayUrl,
      });
      return { groveUri: retryResult.uri, groveUrl: retryResult.gatewayUrl };
    }
    return null;
  } catch (error) {
    logger.error("Failed to store image in Grove on retry", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Persist a finished image to Grove. Best-effort.
 *
 * Behavior:
 *   - For Farcaster requests, retries once if the initial fill returns no URI/URL.
 *   - All other requests get a single attempt.
 *   - On any error, logs and returns `{ groveUri: undefined, groveUrl: undefined }`.
 *
 * The orchestrator decides how to render a degraded response.
 */
export async function archiveToGrove(
  resultBuffer: Buffer,
  resultId: string,
  overlayMode?: string,
  walletAddress?: string,
  isFarcaster: boolean = false,
): Promise<{ groveUri?: string; groveUrl?: string }> {
  let groveUri: string | undefined;
  let groveUrl: string | undefined;

  logger.info(`Storing ${overlayMode || "generated"} image in Grove`);

  try {
    const fileName = `${overlayMode || "generated"}-${resultId}.png`;

    if (isFarcaster) {
      logger.info("Request is from Farcaster, prioritizing Grove storage");
    }

    const groveResult = await uploadToGrove(resultBuffer, fileName, walletAddress);

    if (groveResult.uri && groveResult.gatewayUrl) {
      groveUri = groveResult.uri;
      groveUrl = groveResult.gatewayUrl;
      logger.info("Successfully stored image in Grove", {
        groveUri,
        groveUrl,
        walletAddress: walletAddress || "none",
        isFarcaster,
      });
    } else {
      logger.warn("Grove storage returned empty URI or URL", {
        uri: groveResult.uri,
        gatewayUrl: groveResult.gatewayUrl,
        walletAddress: walletAddress || "none",
      });

      if (isFarcaster) {
        const retryResult = await retryArchive(resultBuffer, resultId, overlayMode);
        if (retryResult) {
          groveUri = retryResult.groveUri;
          groveUrl = retryResult.groveUrl;
        }
      }
    }
  } catch (error) {
    logger.error("Failed to store image in Grove", {
      error: error instanceof Error ? error.message : String(error),
      walletAddress: walletAddress || "none",
    });
  }

  return { groveUri, groveUrl };
}
