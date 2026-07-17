import { isAspDeployment } from "@/lib/deployment";
import { hasKvRestEnv, kvGetStringWithFallback, kvIncrWithFallback } from "@/lib/kv-store";
import { logger } from "@/lib/logger";
import { executeWithTimeout, getRedisClient } from "@/lib/redis";
import { IS_PRODUCTION } from "@/lib/env";

const USAGE_PREFIX = "agent_usage:";
const DAY_SECONDS = 86_400;

function todayKey(suffix: string): string {
  const day = new Date().toISOString().slice(0, 10);
  return `${USAGE_PREFIX}${suffix}:${day}`;
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw?.trim()) return null;
  const value = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** Per-IP hourly cap for POST /api/agent (ASP defaults tighter during free launch). */
export function getAgentRateLimitMax(): number {
  return parsePositiveInt(process.env.AGENT_RATE_LIMIT_MAX) ?? (isAspDeployment() ? 10 : 20);
}

export function getAgentRateLimitWindowSeconds(): number {
  return parsePositiveInt(process.env.AGENT_RATE_LIMIT_WINDOW) ?? 3600;
}

/** Global daily generation cap across all callers (ASP only by default). */
export function getAgentDailyMax(): number | null {
  const explicit = parsePositiveInt(process.env.AGENT_DAILY_MAX);
  if (explicit) return explicit;
  return isAspDeployment() ? 100 : null;
}

async function readCounter(key: string): Promise<number> {
  const readViaRedisUrl = async (): Promise<string | null> => {
    if (!process.env.REDIS_URL?.trim()) return null;
    const redis = getRedisClient();
    return executeWithTimeout(() => redis.get(key), 3000);
  };

  const raw = hasKvRestEnv()
    ? await kvGetStringWithFallback(key, readViaRedisUrl)
    : await readViaRedisUrl();

  return raw ? Number.parseInt(String(raw), 10) || 0 : 0;
}

async function incrCounter(key: string, ttlSeconds: number): Promise<number> {
  const incrViaRedisUrl = async (): Promise<number> => {
    const redis = getRedisClient();
    const count = await executeWithTimeout(() => redis.incr(key), 3000);
    if (count === 1) {
      await executeWithTimeout(() => redis.expire(key, ttlSeconds), 3000);
    }
    return count;
  };

  if (hasKvRestEnv()) {
    return kvIncrWithFallback(key, ttlSeconds, incrViaRedisUrl);
  }

  if (process.env.REDIS_URL?.trim()) {
    return incrViaRedisUrl();
  }

  if (IS_PRODUCTION && isAspDeployment()) {
    throw new Error("Usage counters unavailable: configure KV REST or REDIS_URL");
  }

  return 0;
}

export async function checkAgentDailyCap(): Promise<{
  allowed: boolean;
  count: number;
  max: number | null;
}> {
  const max = getAgentDailyMax();
  if (!max) {
    return { allowed: true, count: 0, max: null };
  }

  try {
    const count = await readCounter(todayKey("completed"));
    const allowed = count < max;
    if (!allowed) {
      logger.warn("Agent daily cap exceeded", { count, max });
    }
    return { allowed, count, max };
  } catch (error) {
    logger.error("Agent daily cap check failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    if (IS_PRODUCTION && isAspDeployment()) {
      return { allowed: false, count: 0, max };
    }
    return { allowed: true, count: 0, max };
  }
}

export async function recordAgentCompletion(): Promise<void> {
  try {
    await incrCounter(todayKey("completed"), DAY_SECONDS);
  } catch (error) {
    logger.warn("Failed to record agent completion metric", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

export async function getAgentUsageSnapshot(): Promise<{
  dailyCap: number | null;
  completedToday: number;
  rateLimitMax: number;
}> {
  const dailyCap = getAgentDailyMax();
  let completedToday = 0;

  try {
    completedToday = await readCounter(todayKey("completed"));
  } catch {
    // snapshot is best-effort
  }

  return {
    dailyCap,
    completedToday,
    rateLimitMax: getAgentRateLimitMax(),
  };
}
