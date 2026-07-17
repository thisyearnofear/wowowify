/**
 * /api/replicate/webhook — receives Replicate completion callbacks.
 *
 * Replaces the 10-minute self-recursive background poll that used to run
 * inside /api/farcaster/webhook. Vercel's function timeout would have
 * killed it; now the slow work happens in Replicate's queue and we
 * receive the final image URL via this route when it's done.
 *
 * Flow:
 *   1. Farcaster webhook detects "ghiblify" → POSTs to /api/replicate
 *      with `webhookUrl` + `predictionId` (placeholder) so /api/replicate
 *      can `registerPending` in Redis BEFORE Replicate starts.
 *   2. Replicate processes the image (5+ min on cold queue).
 *   3. Replicate calls us back at /api/replicate/webhook with the final
 *      image URL.
 *   4. We atomically `consumePending(predictionId)` for idempotency,
 *      download the image, upload to Grove if account is present, and
 *      post a Neynar reply to the original castHash.
 */

import { NextResponse } from "next/server";
import { NeynarAPIClient } from "@neynar/nodejs-sdk";
import { logger } from "@/lib/logger";
import { consumePending, RedisUnavailableError } from "@/lib/predictions";
import { downloadImage } from "@/lib/image-processor";
import { uploadToGrove } from "@/lib/grove-storage";

export const dynamic = "force-dynamic";

interface ReplicateWebhookPayload {
  id: string;
  status: "succeeded" | "failed" | "canceled" | string;
  output?: string[];
  error?: string;
}

const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY;
const SIGNER_UUID = process.env.FARCASTER_SIGNER_UUID;

function getNeynarClient() {
  if (!NEYNAR_API_KEY) {
    throw new Error("NEYNAR_API_KEY is not defined");
  }
  return new NeynarAPIClient({ apiKey: NEYNAR_API_KEY });
}

async function replyToCast(parentHash: string, text: string, imageUrl?: string) {
  if (!NEYNAR_API_KEY || !SIGNER_UUID) {
    throw new Error("Missing Neynar env vars");
  }
  const neynar = getNeynarClient();
  await neynar.publishCast({
    signerUuid: SIGNER_UUID,
    text,
    parent: parentHash,
    embeds: imageUrl ? [{ url: imageUrl }] : undefined,
  });
  logger.info("Posted Ghibli completion reply", { parentHash, hasImage: !!imageUrl });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const payload = (await request.json()) as ReplicateWebhookPayload;
    logger.info("Replicate webhook received", {
      id: payload.id,
      status: payload.status,
    });

    if (!payload.id) {
      return NextResponse.json({ error: "missing id" }, { status: 400 });
    }

    // Atomic claim — duplicate calls (Replicate retries) return null after
    // the first wins, so we ack with 200 immediately without re-posting.
    // RedisUnavailableError (typed) → 500 so Replicate retries; anything else
    // → 500 too (outer catch), but with a different log line for forensics.
    let pending: Awaited<ReturnType<typeof consumePending>>;
    try {
      pending = await consumePending(payload.id);
    } catch (error) {
      if (error instanceof RedisUnavailableError) {
        logger.error(
          "Redis unavailable during consumePending — returning 500 to trigger Replicate retry",
          {
            error: error.message,
            predictionId: payload.id,
          },
        );
        return NextResponse.json(
          { error: "redis_unavailable" },
          { status: 500 },
        );
      }
      throw error; // bubble to outer catch
    }

    if (payload.status === "failed" || payload.status === "canceled") {
      if (pending) {
        await replyToCast(
          pending.castHash,
          `Sorry — your ghiblify failed: ${payload.error ?? payload.status}. Please try again.`,
        );
      } else {
        logger.warn("Replicate webhook for already-consumed prediction (failed)", {
          id: payload.id,
        });
      }
      // Still 200 — Replicate should not retry.
      return NextResponse.json({ status: "acknowledged" });
    }

    if (payload.status !== "succeeded") {
      // Unknown intermediate status — ack anyway so Replicate doesn't retry
      logger.warn("Unknown Replicate status", { id: payload.id, status: payload.status });
      return NextResponse.json({ status: "acknowledged" });
    }

    // Success path
    if (!pending) {
      logger.warn(
        "Replicate success webhook arrived without a pending record (already consumed?)",
        { id: payload.id },
      );
      return NextResponse.json({ status: "acknowledged" });
    }

    const resultUrl = payload.output?.[0];
    if (!resultUrl) {
      await replyToCast(
        pending.castHash,
        "Sorry — ghiblify finished but no image was returned. Please try again.",
      );
      return NextResponse.json({ status: "acknowledged" });
    }

    // Download → optionally upload to Grove → reply
    let imageUrl = resultUrl;
    try {
      const buffer = await downloadImage(resultUrl);
      if (pending.account) {
        const upload = await uploadToGrove(buffer, pending.account);
        imageUrl = upload.uri;
      }
    } catch (error) {
      logger.error("Failed to download/upload Ghibli result", {
        error: error instanceof Error ? error.message : String(error),
        id: payload.id,
      });
      // Continue with the raw Replicate URL — still better than nothing
    }

    await replyToCast(
      pending.castHash,
      "Here's your Ghibli-style image! ✨\n\nWowowify what do you see?\n\npowered by Venice AI & Grove",
      imageUrl,
    );

    return NextResponse.json({ status: "completed" });
  } catch (error) {
    logger.error("Replicate webhook handler failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    // 500 → Replicate retries. That's usually OK because consumePending
    // already deleted the key; the next call will see null and 200 early-exit.
    return NextResponse.json(
      { error: "internal error" },
      { status: 500 },
    );
  }
}

/**
 * Replicate also issues GET during verification of webhook setup.
 * Return 200.
 */
export async function GET(): Promise<Response> {
  return NextResponse.json({ status: "ok" });
}
