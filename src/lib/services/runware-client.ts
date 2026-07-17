/**
 * RunwareClient — REST helper for Runware imageInference (sync delivery).
 *
 * Docs: https://runware.ai/docs/platform/introduction
 * Default model: FLUX.1 [schnell] (`runware:100@1`) — ~$0.0006 at 512², 4 steps.
 */

import { randomUUID } from "crypto";

import { logger } from "@/lib/logger";

const RUNWARE_API_URL = "https://api.runware.ai/v1";
export const RUNWARE_DEFAULT_MODEL = "runware:100@1";
export const RUNWARE_FLUX_SCHNELL_STEPS = 4;
export const RUNWARE_FLUX_SCHNELL_CFG = 3.5;

/** Campaign backgrounds: no embedded text or marks (Wowowify composes the logo). */
export const RUNWARE_NEGATIVE_PROMPT =
  "text, watermark, logo, signature, words, letters, blurry, low quality, distorted";

export interface RunwareGenerateOptions {
  width?: number;
  height?: number;
  model?: string;
}

interface RunwareImageResult {
  imageBase64Data?: string;
  imageURL?: string;
  cost?: number;
}

interface RunwareResponse {
  data?: RunwareImageResult[];
  errors?: Array<{ message?: string; code?: string }>;
}

function resolveModel(): string {
  return process.env.RUNWARE_MODEL?.trim() || RUNWARE_DEFAULT_MODEL;
}

function isFluxSchnell(model: string): boolean {
  return model === RUNWARE_DEFAULT_MODEL || model.includes("flux") && model.includes("schnell");
}

export async function generateImage(
  prompt: string,
  abortSignal: AbortSignal,
  options: RunwareGenerateOptions = {},
): Promise<{ buffer: Buffer; model: string; costUsd?: number }> {
  const apiKey = process.env.RUNWARE_API_KEY?.trim();
  if (!apiKey) {
    logger.error("RUNWARE_API_KEY is not configured");
    throw new Error("Server configuration error");
  }

  const width = options.width ?? 512;
  const height = options.height ?? 512;
  const model = options.model ?? resolveModel();
  const taskUUID = randomUUID();

  const body: Record<string, unknown> = {
    taskType: "imageInference",
    taskUUID,
    model,
    positivePrompt: prompt,
    negativePrompt: RUNWARE_NEGATIVE_PROMPT,
    width,
    height,
    deliveryMethod: "sync",
    outputType: "base64Data",
    outputFormat: "PNG",
    includeCost: true,
    safety: { checkContent: true },
  };

  if (isFluxSchnell(model)) {
    body.steps = RUNWARE_FLUX_SCHNELL_STEPS;
    body.CFGScale = RUNWARE_FLUX_SCHNELL_CFG;
  }

  logger.info("Generating image with Runware API", { model, width, height });

  const response = await fetch(RUNWARE_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify([body]),
    signal: abortSignal,
  });

  const payload = (await response.json()) as RunwareResponse;
  const apiError = payload.errors?.[0]?.message;
  const item = payload.data?.[0];

  if (!response.ok || apiError) {
    logger.error("Runware API error", {
      status: response.status,
      message: apiError,
    });
    throw new Error(apiError || `Runware API error: ${response.statusText}`);
  }

  if (item?.imageBase64Data) {
    return {
      buffer: Buffer.from(item.imageBase64Data, "base64"),
      model,
      costUsd: item.cost,
    };
  }

  if (item?.imageURL) {
    const imageResponse = await fetch(item.imageURL, { signal: abortSignal });
    if (!imageResponse.ok) {
      throw new Error(`Failed to download Runware image: ${imageResponse.statusText}`);
    }
    const arrayBuffer = await imageResponse.arrayBuffer();
    return {
      buffer: Buffer.from(arrayBuffer),
      model,
      costUsd: item.cost,
    };
  }

  throw new Error("No image generated");
}
