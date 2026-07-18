/**
 * Image generation with Runware primary + Venice fallback for ASP/Studio reliability.
 */

import { logger } from "@/lib/logger";

import { generateImage as generateViaRunware } from "./runware-client";
import { generateImage as generateViaVenice } from "./venice-client";

export type ImageGenProvider = "venice" | "runware";

export interface GenerateImageOptions {
  width?: number;
  height?: number;
}

export interface GenerateImageResult {
  buffer: Buffer;
  provider: ImageGenProvider;
  model: string;
  costUsd?: number;
}

function veniceConfigured(): boolean {
  return Boolean(process.env.VENICE_API_KEY?.trim());
}

function runwareConfigured(): boolean {
  return Boolean(process.env.RUNWARE_API_KEY?.trim());
}

function fallbackEnabled(): boolean {
  const legacy = process.env.IMAGE_GEN_RUNWARE_FALLBACK?.trim().toLowerCase();
  if (legacy === "false" || legacy === "0") return false;

  const flag = process.env.IMAGE_GEN_FALLBACK_ENABLED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}

/**
 * Generate a PNG buffer. Tries Runware first when configured; on failure falls back
 * to Venice when `VENICE_API_KEY` is set (unless fallback is disabled via env).
 */
export async function generateImageWithFallback(
  prompt: string,
  abortSignal: AbortSignal,
  options: GenerateImageOptions = {},
): Promise<GenerateImageResult> {
  const primaryError: Error[] = [];

  if (runwareConfigured()) {
    try {
      const result = await generateViaRunware(prompt, abortSignal, options);
      logger.info("Image generated via Runware", {
        model: result.model,
        costUsd: result.costUsd,
      });
      return {
        buffer: result.buffer,
        provider: "runware",
        model: result.model,
        costUsd: result.costUsd,
      };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      primaryError.push(err);
      logger.warn("Runware image generation failed", { error: err.message });

      if (!fallbackEnabled() || !veniceConfigured()) {
        throw err;
      }
    }
  }

  if (veniceConfigured()) {
    try {
      const buffer = await generateViaVenice(prompt, abortSignal);
      logger.info("Image generated via Venice fallback");
      return { buffer, provider: "venice", model: "venice-sd35" };
    } catch (error) {
      const veniceErr = error instanceof Error ? error : new Error(String(error));
      logger.error("Venice image generation failed", { error: veniceErr.message });

      if (primaryError.length > 0) {
        throw new Error(
          `Image generation failed (Runware: ${primaryError[0].message}; Venice: ${veniceErr.message})`,
        );
      }
      throw veniceErr;
    }
  }

  if (primaryError.length > 0) {
    throw primaryError[0];
  }

  logger.error("No image generation provider configured");
  throw new Error("Server configuration error");
}
