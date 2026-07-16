/**
 * ResultArchiver — final-stage persistence for the image pipeline.
 *
 * Extracted from src/lib/services/command-router.ts to drop that module below
 * the 250-LOC budget. Pure functional: no class wrapper, no module state.
 *
 * Responsibility: persist the composed image to Vercel Blob (via image-store),
 * upload to Grove (via grove-archiver), and write the lookup URLs to history
 * (via image-history). Returns the final AgentResponse.
 *
 * Scope: only the "bookkeeping" leg of the pipeline — does NOT touch canvas,
 * parsing, Venice, or the parser facade.
 *
 * Note (reviewer fix #2): the original finalizeResult accepted a
 * `parsedCommand` parameter but never used it. This module accepts overlayMode
 * directly, which keeps the surface tight and removes the `void parsedCommand;`
 * dead-code smell.
 */

import { v4 as uuidv4 } from "uuid";

import type { AgentResponse } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { storeImage } from "@/lib/image-store";
import { storeImageUrl } from "@/lib/image-history";
import { archiveToGrove } from "./grove-archiver";

export interface ArchiveOptions {
  /** Buffer containing the composed final result (overlay + text + scaled). */
  resultBuffer: Buffer;
  /** Buffer containing the scaled-down preview image. */
  previewBuffer: Buffer;
  /** Overlay mode used to name the Grove file (e.g. 'ghiblify', 'degenify'). */
  overlayMode?: string;
  /** Base URL prepended to relative in-memory image paths (for Farcaster web flow). */
  baseUrl: string;
  /** Optional wallet address — drives Grove upload access scoping. */
  walletAddressForOverlay?: string;
  /** Farcaster paths get a one-shot Grove retry on transient failure. */
  isFarcaster?: boolean;
}

/**
 * Persist the composed buffers to all three stores, then build the final
 * AgentResponse. See design doc (roll-out #4) for the rationale on keeping
 * the three-id history fill inside this module rather than in GroveArchiver.
 */
export async function archiveResult(
  options: ArchiveOptions,
): Promise<AgentResponse> {
  const {
    resultBuffer,
    previewBuffer,
    overlayMode,
    baseUrl,
    walletAddressForOverlay,
    isFarcaster = false,
  } = options;

  const requestId = uuidv4();
  const resultId = uuidv4();
  const previewId = uuidv4();

  // 1. Memory store (Vercel Blob in production, in-memory fallback in dev).
  const [resultUrl, previewUrl] = await Promise.all([
    storeImage(resultId, resultBuffer, "image/png"),
    storeImage(previewId, previewBuffer, "image/png"),
  ]);

  // Prefix with baseUrl only when the store returned a relative path.
  const fullResultUrl = resultUrl.startsWith("/")
    ? `${baseUrl}${resultUrl}`
    : resultUrl;
  const fullPreviewUrl = previewUrl.startsWith("/")
    ? `${baseUrl}${previewUrl}`
    : previewUrl;

  // 2. Best-effort Grove upload (never throws — returns {undefined} on failure).
  const groveResult = await archiveToGrove(
    resultBuffer,
    resultId,
    overlayMode,
    walletAddressForOverlay,
    isFarcaster,
  );

  // 3. Three-id history fill so /api/image?id=<any of these> resolves to the URL
  //    after a cold start when the in-memory map has been replaced.
  await Promise.all([
    storeImageUrl(
      requestId,
      fullResultUrl,
      groveResult.groveUri,
      groveResult.groveUrl,
    ),
    storeImageUrl(
      resultId,
      fullResultUrl,
      groveResult.groveUri,
      groveResult.groveUrl,
    ),
    storeImageUrl(
      previewId,
      fullPreviewUrl,
      groveResult.groveUri,
      groveResult.groveUrl,
    ),
  ]);

  logger.info("Result archived", {
    requestId,
    resultId,
    previewId,
    groveUri: groveResult.groveUri,
  });

  return {
    id: requestId,
    status: "completed",
    resultUrl: fullResultUrl,
    previewUrl: fullPreviewUrl,
    groveUri: groveResult.groveUri,
    groveUrl: groveResult.groveUrl,
  };
}
