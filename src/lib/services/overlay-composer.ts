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

import type { CampaignFormat, ParsedCommand } from "@/lib/agent-types";
import { FORMAT_ASPECT_RATIOS } from "@/lib/campaign-formats";
import { logger } from "@/lib/logger";
import { OVERLAY_URLS } from "@/lib/config/overlays";
import { downloadImage } from "./image-fetcher";
import { renderText } from "./text-renderer";

const PREVIEW_MAX_WIDTH = 300;

function drawBaseImageForFormat(
  baseImage: Awaited<ReturnType<typeof loadImage>>,
  format?: CampaignFormat,
): Canvas {
  if (!format) {
    const canvas = createCanvas(baseImage.width, baseImage.height);
    canvas.getContext("2d").drawImage(baseImage, 0, 0);
    return canvas;
  }

  const targetRatio = FORMAT_ASPECT_RATIOS[format];
  const baseRatio = baseImage.width / baseImage.height;
  const width =
    baseRatio > targetRatio
      ? Math.round(baseImage.height * targetRatio)
      : baseImage.width;
  const height =
    baseRatio > targetRatio
      ? baseImage.height
      : Math.round(baseImage.width / targetRatio);
  const sourceWidth = baseRatio > targetRatio ? Math.round(baseImage.height * targetRatio) : baseImage.width;
  const sourceHeight = baseRatio > targetRatio ? baseImage.height : Math.round(baseImage.width / targetRatio);
  const sourceX = Math.max(0, Math.round((baseImage.width - sourceWidth) / 2));
  const sourceY = Math.max(0, Math.round((baseImage.height - sourceHeight) / 2));
  const canvas = createCanvas(width, height);
  canvas
    .getContext("2d")
    .drawImage(baseImage, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
  return canvas;
}

/**
 * Apply the chosen overlay image onto the canvas — or skip cleanly if 'wowowify'
 * is the chosen mode (the 'no-stamp' mode is just the base image unchanged).
 *
 * Preset fetch/rasterize failures remain best-effort for backward
 * compatibility. Custom-logo failures abort so callers never receive an
 * apparently successful but unbranded deliverable.
 */
async function applyOverlayToCanvas(
  ctx: CanvasRenderingContext2D,
  canvas: Canvas,
  parsedCommand: ParsedCommand,
  baseUrl: string,
  abortSignal: AbortSignal,
): Promise<void> {
  const overlayMode = parsedCommand.overlayMode;
  const configuredOverlayUrl = overlayMode ? OVERLAY_URLS[overlayMode] : undefined;
  const overlayUrl = parsedCommand.logoUrl || configuredOverlayUrl;
  if (!overlayUrl) return;

  if (overlayMode && !parsedCommand.logoUrl && !configuredOverlayUrl) {
    throw new Error(`Unsupported overlay mode: ${overlayMode}`);
  }

  const overlaySource = parsedCommand.logoUrl ? "custom-logo" : "preset";
  logger.info("Applying overlay", { overlayMode, overlaySource });

  const fullOverlayUrl = overlayUrl.startsWith("/")
    ? `${baseUrl}${overlayUrl}`
    : overlayUrl;

  logger.info("Fetching overlay", { url: fullOverlayUrl });

  try {
    const overlayBuffer = await downloadImage(fullOverlayUrl, abortSignal);
    const overlayImage = await loadImage(overlayBuffer);

    const scale = parsedCommand.controls?.scale || 1;
    const scaledWidth = overlayImage.width * scale;
    const scaledHeight = overlayImage.height * scale;
    const x =
      (canvas.width - scaledWidth) / 2 + (parsedCommand.controls?.x || 0);
    const y =
      (canvas.height - scaledHeight) / 2 + (parsedCommand.controls?.y || 0);

    ctx.drawImage(overlayImage, x, y, scaledWidth, scaledHeight);
    logger.info("Overlay applied successfully", {
      overlayMode,
      overlaySource,
      scale,
      x,
      y,
    });
  } catch (error) {
    logger.error("Error applying overlay", {
      error: error instanceof Error ? error.message : "Unknown error",
      overlayMode,
      overlaySource,
    });
    // A requested custom logo is part of the deliverable contract: never
    // silently return an unbranded result. Presets remain best-effort for
    // backward compatibility with the existing generation flow.
    if (parsedCommand.logoUrl) {
      throw error;
    }
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
  format?: CampaignFormat,
): Promise<{ resultBuffer: Buffer; previewBuffer: Buffer }> {
  const baseImage = await loadImage(baseImageBuffer);
  const canvas = drawBaseImageForFormat(baseImage, format);
  const ctx = canvas.getContext("2d");

  // 2. Color tint overlay
  const overlayAlpha = parsedCommand.controls?.overlayAlpha;
  if (overlayAlpha && overlayAlpha > 0) {
    ctx.fillStyle = parsedCommand.controls?.overlayColor || "#000000";
    ctx.globalAlpha = overlayAlpha;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalAlpha = 1;
  }

  // 3. Exact custom logo or preset overlay. A custom logo remains active even
  // when 'wowowify' is selected because that mode only suppresses preset stamps.
  if (
    parsedCommand.logoUrl ||
    (parsedCommand.overlayMode && parsedCommand.overlayMode !== "wowowify")
  ) {
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
