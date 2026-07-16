/**
 * OverlayComposer — pure functional image composition + overlay rasterization.
 *
 * Extracted from src/lib/services/image-service.ts.
 *
 * Responsibility: take a base image buffer + ParsedCommand, compose the chosen
 * overlay (color tint + overlay image, or none for 'wowowify') onto a canvas,
 * optionally burn text via the TextRenderer, and return both the full-size
 * result buffer AND a scaled-down preview buffer.
 *
 * Scope: only talks to canvas, overlays config, and TextRenderer. Does NOT
 * touch Venice API, Ghibli, Grove, or image-history.
 *
 * Preview is generated ONCE from the FINAL result buffer (after text), so the
 * previewCanvas mutation pattern that previously lived inside the orchestrator
 * is gone.
 */

import { Canvas, CanvasRenderingContext2D, createCanvas, loadImage } from "canvas";

import type { ParsedCommand } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { OVERLAY_URLS } from "@/lib/config/overlays";
import { renderText } from "./text-renderer";

const PREVIEW_MAX_WIDTH = 300;

/**
 * Apply the chosen overlay image onto the canvas — or skip cleanly if 'wowowify'
 * is the chosen mode (the 'no-stamp' mode is just the base image unchanged).
 *
 * Errors during the overlay image fetch/rasterize are logged and swallowed so
 * the composition continues without the overlay rather than aborting the
 * whole pipeline.
 */
async function applyOverlayToCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: Canvas,
  parsedCommand: ParsedCommand,
  baseUrl: string,
  abortSignal: AbortSignal,
): Promise<void> {
  const overlayMode = parsedCommand.overlayMode;
  if (!overlayMode) return;

  logger.info("Applying overlay", { overlayMode });

  const overlayUrl = OVERLAY_URLS[overlayMode];
  if (!overlayUrl) {
    throw new Error(`Unsupported overlay mode: ${overlayMode}`);
  }

  const fullOverlayUrl = overlayUrl.startsWith("/")
    ? `${baseUrl}${overlayUrl}`
    : overlayUrl;

  logger.info("Fetching overlay", { url: fullOverlayUrl });

  try {
    const overlayResponse = await fetch(fullOverlayUrl, { signal: abortSignal });
    if (!overlayResponse.ok) {
      throw new Error(
        `Failed to download overlay: ${overlayResponse.statusText}`,
      );
    }

    const overlayBuffer = Buffer.from(await overlayResponse.arrayBuffer());
    const overlayImage = await loadImage(overlayBuffer);

    const scale = parsedCommand.controls?.scale || 1;
    const scaledWidth = overlayImage.width * scale;
    const scaledHeight = overlayImage.height * scale;
    const x =
      (canvas.width - scaledWidth) / 2 + (parsedCommand.controls?.x || 0);
    const y =
      (canvas.height - scaledHeight) / 2 + (parsedCommand.controls?.y || 0);

    ctx.drawImage(overlayImage, x, y, scaledWidth, scaledHeight);
    logger.info("Overlay applied successfully", { overlayMode, scale, x, y });
  } catch (error) {
    logger.error("Error applying overlay", {
      error: error instanceof Error ? error.message : "Unknown error",
      overlayMode,
    });
    // Per design: continue without the overlay rather than failing completely.
  }
}

/**
 * Compose: base image → optional color tint → optional overlay image →
 * optional text → final result buffer + scaled preview buffer.
 *
 * The text conditional lives HERE (not inside TextRenderer) so TextRenderer
 * can be invoked only when text actually needs to be drawn.
 */
export async function composeImage(
  parsedCommand: ParsedCommand,
  baseImageBuffer: Buffer,
  baseUrl: string,
  abortSignal: AbortSignal,
): Promise<{ resultBuffer: Buffer; previewBuffer: Buffer }> {
  const baseImage = await loadImage(baseImageBuffer);
  const canvas = createCanvas(baseImage.width, baseImage.height);
  const ctx = canvas.getContext("2d");

  // 1. Draw base image
  ctx.drawImage(baseImage, 0, 0);

  // 2. Color tint overlay
  const overlayAlpha = parsedCommand.controls?.overlayAlpha;
  if (overlayAlpha && overlayAlpha > 0) {
    ctx.fillStyle = parsedCommand.controls?.overlayColor || "#000000";
    ctx.globalAlpha = overlayAlpha;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  // 3. Overlay image (skip for 'wowowify' = "no stamp")
  if (parsedCommand.overlayMode && parsedCommand.overlayMode !== "wowowify") {
    await applyOverlayToCanvas(ctx, canvas, parsedCommand, baseUrl, abortSignal);
  }

  // 4. Text overlay (text conditional lives here, by design).
  const compositedBuffer = canvas.toBuffer("image/png");
  const resultBuffer =
    parsedCommand.text && parsedCommand.text.content
      ? await renderText(compositedBuffer, parsedCommand)
      : compositedBuffer;

  // 5. Preview — always re-rasterize from the FINAL buffer (preserves text).
  const finalImage = await loadImage(resultBuffer);
  const previewCanvas = createCanvas(
    PREVIEW_MAX_WIDTH,
    PREVIEW_MAX_WIDTH * (finalImage.height / finalImage.width),
  );
  const previewCtx = previewCanvas.getContext("2d");
  previewCtx.drawImage(
    finalImage,
    0,
    0,
    finalImage.width,
    finalImage.height,
    0,
    0,
    previewCanvas.width,
    previewCanvas.height,
  );
  const previewBuffer = previewCanvas.toBuffer("image/png");

  return { resultBuffer, previewBuffer };
}
