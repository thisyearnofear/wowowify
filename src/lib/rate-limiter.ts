import { logger } from "./logger";
import {
  getAgentRateLimitMax,
  getAgentRateLimitWindowSeconds,
} from "./agent-usage";
import { hasKvRestEnv, kvIncrWithFallback } from "./kv-store";
import { executeWithTimeout, getRedisClient } from "./redis";

export interface RateLimitInfo {
  isAllowed: boolean;
  timeToReset: number;
  remaining?: number;
  limit: number;
}

async function incrRateLimitKey(
  key: string,
  windowSeconds: number,
): Promise<number> {
  const incrViaRedisUrl = async (): Promise<number> => {
    const redis = getRedisClient();
    const count = await executeWithTimeout(() => redis.incr(key), 2000, 1);
    if (count === 1) {
      await executeWithTimeout(
        () => redis.expire(key, windowSeconds),
        2000,
      );
    }
    return count;
  };

  if (hasKvRestEnv()) {
    return kvIncrWithFallback(key, windowSeconds, incrViaRedisUrl);
  }

  return incrViaRedisUrl();
}

async function readRateLimitTtl(
  key: string,
  windowSeconds: number,
): Promise<number> {
  try {
    if (process.env.REDIS_URL?.trim()) {
      const redis = getRedisClient();
      const ttl = await executeWithTimeout(() => redis.ttl(key), 2000, windowSeconds);
      return ttl < 0 ? windowSeconds : ttl;
    }
  } catch {
    // fall through
  }
  return windowSeconds;
}

export async function getRateLimitInfo(ip: string): Promise<RateLimitInfo> {
  const key = `rate_limit:${ip}`;
  const maxRequests = getAgentRateLimitMax();
  const windowSeconds = getAgentRateLimitWindowSeconds();

  try {
    const count = await incrRateLimitKey(key, windowSeconds);
    const timeToReset = await readRateLimitTtl(key, windowSeconds);
    const isAllowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);

    logger.info("Rate limit check", {
      ip,
      count,
      remaining,
      timeToReset,
      maxRequests,
    });

    return {
      isAllowed,
      timeToReset,
      remaining,
      limit: maxRequests,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    logger.error("Rate limit check failed", {
      errorMessage,
      ip,
      timestamp: new Date().toISOString(),
    });
    return {
      isAllowed: true,
      timeToReset: windowSeconds,
      remaining: maxRequests,
      limit: maxRequests,
    };
  }
}
