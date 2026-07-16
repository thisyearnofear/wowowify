/**
 * GhibliService — kicked-off Replicate prediction for image transforms.
 *
 * Historical note: this class used to poll /api/replicate every 10s for up
 * to 10 minutes after firing. That polling was invoked from inside the
 * Farcaster webhook handler, which would overrun Vercel's function timeout
 * (10s on Hobby). The polling has been replaced by a fire-and-return
 * pattern:
 *
 *   - Farcaster webhook calls POST /api/replicate with castHash + Replicate
 *     is configured with a `webhook` parameter pointing at
 *     /api/replicate/webhook.
 *   - Replicate processes in its own queue and POSTs the final result
 *     back to our /api/replicate/webhook handler when complete.
 *   - Web UI users still poll /api/replicate's GET endpoint from the
 *     browser (no serverless timeout there).
 *
 * This module is kept as a thin client to /api/replicate for any callers
 * that need a fire-and-return handle from outside the webhook.
 */

import { logger } from "../logger";
import { APP_URL } from "../env";

export class GhibliService {
  private endToEndUrl: string;

  constructor() {
    this.endToEndUrl = `${APP_URL}/api/replicate`;
    logger.info("Initialized GhibliService", {
      endpoint: this.endToEndUrl,
    });
  }

  /**
   * Fire-and-return: starts a Replicate prediction. Returns the prediction
   * ID immediately; callers awaiting `waitForResult` should NOT be used
   * inside Vercel serverless functions (use the webhook callback path).
   */
  async startPrediction(
    imageUrl: string,
    options?: { castHash?: string; account?: string },
  ): Promise<{ id: string; status: string }> {
    const finalImageUrl = imageUrl.includes("imagedelivery.net") &&
      !imageUrl.includes("/original")
      ? `${imageUrl.split("?")[0]}/original`
      : imageUrl;

    const response = await fetch(this.endToEndUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageUrl: finalImageUrl,
        ...(options?.castHash ? { castHash: options.castHash } : {}),
        ...(options?.account ? { account: options.account } : {}),
      }),
    });

    if (!response.ok) {
      const err = await response
        .json()
        .catch(() => ({ error: response.statusText }));
      throw new Error(err.error ?? `Replicate ${response.status}`);
    }

    const { id, status } = (await response.json()) as {
      id: string;
      status: string;
    };
    if (!id) throw new Error("No prediction ID received");
    logger.info("Started prediction", { predictionId: id, status });
    return { id, status };
  }
}

export const ghibliService = new GhibliService();
