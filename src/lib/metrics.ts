import { logger } from "./logger";
import { getRedisClient, executeWithTimeout } from "./redis";

const METRICS_KEY = "metrics:counters";
const RESET_INTERVAL_SECONDS = 86400; // 24 hours

// In-memory fallback for when Redis is unavailable
let fallbackTotalRequests = 0;
let fallbackFailedRequests = 0;
const fallbackLastReset = new Date().toISOString();

/** Increment total requests counter (Redis-first with in-memory fallback) */
export async function incrementTotalRequests(): Promise<void> {
  try {
    const redis = getRedisClient();
    await executeWithTimeout(
      () => redis.incr(`${METRICS_KEY}:totalRequests`),
      3000,
      undefined
    );
  } catch {
    fallbackTotalRequests++;
    logger.info("Total requests incremented (fallback)", { fallbackTotalRequests });
  }
}

/** Increment failed requests counter (Redis-first with in-memory fallback) */
export async function incrementFailedRequests(): Promise<void> {
  try {
    const redis = getRedisClient();
    await executeWithTimeout(
      () => redis.incr(`${METRICS_KEY}:failedRequests`),
      3000,
      undefined
    );
  } catch {
    fallbackFailedRequests++;
    logger.info("Failed requests incremented (fallback)", { fallbackFailedRequests });
  }
}

/** Get metrics from Redis with in-memory fallback */
export async function getMetrics(): Promise<{
  totalRequests: number;
  failedRequests: number;
  lastReset: string;
}> {
  try {
    const redis = getRedisClient();

    const [totalRequests, failedRequests, lastReset] = await executeWithTimeout(
      () =>
        Promise.all([
          redis.get(`${METRICS_KEY}:totalRequests`),
          redis.get(`${METRICS_KEY}:failedRequests`),
          redis.get(`${METRICS_KEY}:lastReset`),
        ]),
      3000,
      [null, null, null] as [string | null, string | null, string | null]
    );

    // If no lastReset is set, initialize it
    if (!lastReset) {
      const now = new Date().toISOString();
      await executeWithTimeout(
        () => redis.set(`${METRICS_KEY}:lastReset`, now, "EX", RESET_INTERVAL_SECONDS),
        3000,
        undefined
      );
      return {
        totalRequests: parseInt(totalRequests || "0", 10),
        failedRequests: parseInt(failedRequests || "0", 10),
        lastReset: now,
      };
    }

    return {
      totalRequests: parseInt(totalRequests || "0", 10),
      failedRequests: parseInt(failedRequests || "0", 10),
      lastReset,
    };
  } catch {
    return {
      totalRequests: fallbackTotalRequests,
      failedRequests: fallbackFailedRequests,
      lastReset: fallbackLastReset,
    };
  }
}

// Re-export ImageRecord and getImageHistory from image-history for backward compatibility
export type { ImageRecord } from "./image-history";
export { getImageHistory } from "./image-history";
