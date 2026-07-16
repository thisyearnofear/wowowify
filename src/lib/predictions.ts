/**
 * Replicate prediction cross-route state.
 *
 * Used by the Farcaster webhook ↔ /api/replicate/webhook callback flow so
 * that the slow Replicate prediction (can take 5+ min on the cold Ghibli
 * LoRA queue) survives across Vercel serverless invocations.
 *
 * IMPORTANT: NO in-memory fallback here. Serverless function instances
 * never share memory — an in-Map fallback would silently lose state
 * across route boundaries and cause "ghost" failures. We fail loud
 * instead, so the parent webhook can mark the request as retriable.
 *
 * Maintainer note (register-first vs create-first):
 *   This module deliberately calls registerPending AFTER predictions.create
 *   (i.e. only after the prediction id is known). Orphan-on-Redis-failure
 *   is the canonical fail-loud. The orphan Replicate job self-cleans via:
 *     1. predictions.cancel(id) — best effort from /api/replicate when
 *        registerPending throws (the surrounding route catches and calls it).
 *     2. The 30-min pending-key TTL.
 *     3. Replicate's own job TTL.
 *   Moving registerPending BEFORE predictions.create would commit the
 *   pending record before the prediction id exists, requiring either a
 *   placeholder key + two-phase commit or an extra round-trip — not
 *   worth the complexity for this call rate.
 */

import { getRedisClient } from "./redis";
import { logger } from "./logger";

export interface PendingPrediction {
  /** Farcaster cast hash the bot will reply to when the image is ready */
  castHash: string;
  /** Optional wallet address for Grove upload (Farcaster users only) */
  account?: string;
  /** Source channel — for analytics + future channels */
  source: "farcaster" | "web";
  /** When the prediction started, ms epoch */
  createdAt: number;
}

/** Default TTL — Replicate cold queue can sit 5+ min for the Ghibli LoRA */
const DEFAULT_TTL_SECONDS = 1800; // 30 minutes

function keyFor(predictionId: string): string {
  return `ghibli:pending:${predictionId}`;
}

/**
 * Raised when Redis is unreachable vs. when the key is legitimately absent.
 * Callers can use `instanceof RedisUnavailableError` to decide between a
 * 200 "already idempotent" response vs. a 500 "tell Replicate to retry".
 */
export class RedisUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RedisUnavailableError";
  }
}

/**
 * Persist a pending prediction. Called from /api/replicate and
 * /api/farcaster/webhook before we hand off to Replicate.
 */
export async function registerPending(
  predictionId: string,
  payload: Omit<PendingPrediction, "createdAt">,
  ttlSeconds: number = DEFAULT_TTL_SECONDS,
): Promise<void> {
  const client = getRedisClient();
  const value: PendingPrediction = { ...payload, createdAt: Date.now() };
  await client.set(keyFor(predictionId), JSON.stringify(value), "EX", ttlSeconds);
  logger.info("Registered pending prediction", {
    predictionId,
    source: payload.source,
    castHash: payload.castHash,
  });
}

/**
 * Atomically claim (read & delete) a pending prediction.
 *
 * Returns:
 *   - the PendingPrediction record (first wins)
 *   - null if the record was already consumed, expired (TTL elapsed), or was
 *     never registered (e.g. orphan Replicate job with no castHash)
 *
 * Throws RedisUnavailableError if both GETDEL and MULTI/EXEC fallback
 * fail — so the webhook handler can pick 500 (let Replicate retry) vs.
 * treating the absence as a benign idempotent 200.
 */
export async function consumePending(
  predictionId: string,
): Promise<PendingPrediction | null> {
  const client = getRedisClient();
  const key = keyFor(predictionId);

  // Path 1: GETDEL — Redis 6.2+ atomic
  let raw: string | null = null;
  let getdelThrew = false;
  try {
    raw = await client.getdel(key);
  } catch (error) {
    getdelThrew = true;
    logger.warn("Redis GETDEL failed, falling back to pipeline", {
      error: error instanceof Error ? error.message : String(error),
      predictionId,
    });
  }

  // Path 2: MULTI/EXEC — Redis < 6.2 + transient failure recovery
  if (raw === null) {
    try {
      const pipeline = client.multi();
      pipeline.get(key);
      pipeline.del(key);
      const results = await pipeline.exec();
      if (!results) {
        // exec returns null when commands were buffered but not executed
        // (e.g. socket already gone). Treat as Redis unavailable.
        throw new RedisUnavailableError("MULTI/EXEC returned null");
      }
      const value = results[0]?.[1];
      if (typeof value === "string") {
        raw = value;
      } else if (value !== null && value !== undefined) {
        throw new RedisUnavailableError(
          `Unexpected MULTI/EXEC result type: ${typeof value}`,
        );
      }
    } catch (error) {
      if (error instanceof RedisUnavailableError) {
        logger.error("Redis MULTI/EXEC failed for consumePending", {
          error: error.message,
          predictionId,
        });
        throw error;
      }
      logger.error("Redis MULTI/EXEC threw for consumePending", {
        error: error instanceof Error ? error.message : String(error),
        predictionId,
      });
      throw new RedisUnavailableError(
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  // Both paths reachable AND returned no value → key is genuinely absent
  // (consumed already, expired, or never registered). NOT a Redis failure.
  if (!raw) {
    logger.warn("Pending prediction already consumed or expired", {
      predictionId,
      getdelThrew,
    });
    return null;
  }

  try {
    return JSON.parse(raw) as PendingPrediction;
  } catch (error) {
    logger.error("Failed to parse pending prediction payload", {
      predictionId,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
