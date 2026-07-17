/**
 * Image generation with Venice primary + Runware fallback for ASP/Studio reliability.
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
  const flag = process.env.IMAGE_GEN_RUNWARE_FALLBACK?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return runwareConfigured();
}

/**
 * Generate a PNG buffer. Tries Venice first when configured; on failure falls back
 * to Runware when `RUNWARE_API_KEY` is set (unless `IMAGE_GEN_RUNWARE_FALLBACK=false`).
 */
export async function generateImageWithFallback(
  prompt: string,
  abortSignal: AbortSignal,
  options: GenerateImageOptions = {},
): Promise<GenerateImageResult> {
  const veniceError: Error[] = [];

  if (veniceConfigured()) {
    try {
      const buffer = await generateViaVenice(prompt, abortSignal);
      return { buffer, provider: "venice", model: "venice-sd35" };
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      veniceError.push(err);
      logger.warn("Venice image generation failed", { error: err.message });

      if (!fallbackEnabled()) {
        throw err;
      }
    }
  }

  if (runwareConfigured()) {
    try {
      const result = await generateViaRunware(prompt, abortSignal, options);
      logger.info("Image generated via Runware fallback", {
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
      const runwareErr = error instanceof Error ? error : new Error(String(error));
      logger.error("Runware image generation failed", { error: runwareErr.message });

      if (veniceError.length > 0) {
        throw new Error(
          `Image generation failed (Venice: ${veniceError[0].message}; Runware: ${runwareErr.message})`,
        );
      }
      throw runwareErr;
    }
  }

  if (veniceError.length > 0) {
    throw veniceError[0];
  }

  logger.error("No image generation provider configured");
  throw new Error("Server configuration error");
}
