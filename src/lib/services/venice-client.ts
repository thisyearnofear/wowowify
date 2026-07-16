/**
 * VeniceClient — pure functional AI image-generation helper.
 *
 * Extracted from src/lib/services/command-router.ts to drop that module below
 * the 250-LOC budget. Pure functions — no class wrapper, no module state.
 *
 * Mirrors the image-fetcher.ts extraction pattern: a sibling network helper
 * that owns one HTTP contract, leaving the orchestrator to focus on flow.
 *
 * Scope: only the generate-image-by-prompt path. Venice URL + model +
 * dimensions are module-level constants (single source of truth).
 */

import { logger } from "@/lib/logger";

const VENICE_API_URL = "https://api.venice.ai/api/v1/image/generate";
const VENICE_MODEL = "stable-diffusion-3.5";
const VENICE_WIDTH = 512;
const VENICE_HEIGHT = 512;

/**
 * Generate an image from a text prompt via the Venice API. Returns the raw
 * PNG bytes as a Buffer.
 *
 * Throws when:
 *   - VENICE_API_KEY is missing (server-config error)
 *   - the API returns non-2xx status (Venice-side error)
 *   - the response payload has no images[0] (Venice returned no image)
 *
 * The caller (`CommandRouter.callVeniceApi` workflows) is responsible for
 * feeding errors back through `processCommand`'s try/catch.
 */
export async function generateImage(
  prompt: string,
  abortSignal: AbortSignal,
): Promise<Buffer> {
  if (!process.env.VENICE_API_KEY) {
    logger.error("VENICE_API_KEY is not configured");
    throw new Error("Server configuration error");
  }

  logger.info("Generating image with Venice API", {
    prompt,
    model: VENICE_MODEL,
  });

  const response = await fetch(VENICE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
    },
    body: JSON.stringify({
      prompt,
      model: VENICE_MODEL,
      hide_watermark: true,
      width: VENICE_WIDTH,
      height: VENICE_HEIGHT,
    }),
    signal: abortSignal,
  });

  if (!response.ok) {
    const text = await response.text();
    logger.error("Venice API error", {
      status: response.status,
      statusText: response.statusText,
      responseText: text,
    });
    throw new Error(`Failed to wowowify: ${response.statusText}`);
  }

  const data = (await response.json()) as { images?: string[] };
  if (!data.images?.[0]) {
    throw new Error("No image generated");
  }
  return Buffer.from(data.images[0], "base64");
}
