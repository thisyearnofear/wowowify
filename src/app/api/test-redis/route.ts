import { NextResponse } from "next/server";
import Redis from "ioredis";

let redis: Redis | null = null;

if (process.env.REDIS_URL) {
  const url = new URL(process.env.REDIS_URL);
  redis = new Redis({
    host: url.hostname,
    port: parseInt(url.port),
    username: "default",
    password: url.password,
    lazyConnect: true,
    retryStrategy(times: number): number {
      const delay = Math.min(times * 50, 2000);
      return delay;
    },
    maxRetriesPerRequest: 5,
  });

  redis.on("error", (err: Error) => {
    console.error("Redis Client Error:", err);
  });
}

export async function GET() {
  if (!redis) {
    return NextResponse.json({
      status: "disabled",
      redis: "not configured",
      message: "REDIS_URL environment variable not set",
    });
  }

  try {
    // Test write
    await redis.set("test-key", "test-value", "EX", 60);

    // Test read
    const value = await redis.get("test-key");

    return NextResponse.json({
      status: "success",
      redis: "connected",
      test_value: value,
    });
  } catch (error) {
    console.error("Redis test error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error",
        details: error instanceof Error ? error.cause : undefined,
      },
      { status: 500 },
    );
  }
}
