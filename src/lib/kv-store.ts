import { Redis } from "@upstash/redis";
import { logger } from "@/lib/logger";

let restClient: Redis | null = null;

/** True when Vercel Upstash integration injected REST credentials. */
export function hasKvRestEnv(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL?.trim() &&
      process.env.KV_REST_API_TOKEN?.trim(),
  );
}

function getRestClient(): Redis {
  const url = process.env.KV_REST_API_URL?.trim();
  const token = process.env.KV_REST_API_TOKEN?.trim();
  if (!url || !token) {
    throw new Error("KV REST credentials are not configured");
  }
  if (!restClient) {
    restClient = new Redis({ url, token });
  }
  return restClient;
}

export async function kvGetString(key: string): Promise<string | null> {
  const value = await getRestClient().get<string>(key);
  return value ?? null;
}

export async function kvSetString(
  key: string,
  value: string,
  ttlSeconds: number,
): Promise<void> {
  await getRestClient().set(key, value, { ex: ttlSeconds });
}

export async function kvGetStringWithFallback(
  key: string,
  fallback: () => Promise<string | null>,
): Promise<string | null> {
  if (!hasKvRestEnv()) {
    return fallback();
  }
  try {
    return await kvGetString(key);
  } catch (error) {
    logger.warn("KV REST read failed, falling back to Redis URL", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback();
  }
}

export async function kvSetStringWithFallback(
  key: string,
  value: string,
  ttlSeconds: number,
  fallback: () => Promise<void>,
): Promise<void> {
  if (!hasKvRestEnv()) {
    await fallback();
    return;
  }
  try {
    await kvSetString(key, value, ttlSeconds);
  } catch (error) {
    logger.warn("KV REST write failed, falling back to Redis URL", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    await fallback();
  }
}

export async function kvIncrWithFallback(
  key: string,
  ttlSeconds: number,
  fallback: () => Promise<number>,
): Promise<number> {
  if (!hasKvRestEnv()) {
    return fallback();
  }
  try {
    const client = getRestClient();
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, ttlSeconds);
    }
    return count;
  } catch (error) {
    logger.warn("KV REST incr failed, falling back to Redis URL", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    return fallback();
  }
}

export async function kvDecrWithFallback(
  key: string,
  fallback: () => Promise<void>,
): Promise<void> {
  if (!hasKvRestEnv()) {
    await fallback();
    return;
  }
  try {
    await getRestClient().decr(key);
  } catch (error) {
    logger.warn("KV REST decr failed, falling back to Redis URL", {
      key,
      error: error instanceof Error ? error.message : String(error),
    });
    await fallback();
  }
}
