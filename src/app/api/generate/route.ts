import { NextResponse } from "next/server";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import { logger } from "@/lib/logger";
import { headers } from "next/headers";
import { incrementTotalRequests, incrementFailedRequests } from "@/lib/metrics";
import { generateImageWithFallback } from "@/lib/services/image-generation";

const ALLOWED_MODELS = ["venice-sd35", "flux-2-pro", "hidream"] as const;
const DEFAULT_MODEL = "venice-sd35";
const TIMEOUT_MS = 10000; // 10 seconds timeout - Vercel has 10s limit

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    incrementTotalRequests().catch(() => {});

    // Get client IP
    const headersList = await headers();
    const forwardedFor = headersList.get("x-forwarded-for");
    const realIp = headersList.get("x-real-ip");
    const ip = forwardedFor?.split(",")[0] || realIp || "unknown";

    // Check rate limit
    const rateLimitInfo = await getRateLimitInfo(ip);

    // Always add rate limit headers
    const responseHeaders = {
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Remaining": rateLimitInfo.remaining?.toString() || "0",
      "X-RateLimit-Reset": rateLimitInfo.timeToReset.toString(),
    };

    if (!rateLimitInfo.isAllowed) {
      logger.warn("Rate limit exceeded", { ip });
      incrementFailedRequests().catch(() => {});
      return NextResponse.json(
        {
          error: `Rate limit exceeded. Try again in ${rateLimitInfo.timeToReset} seconds`,
        },
        {
          status: 429,
          headers: responseHeaders,
        }
      );
    }

    const hasVenice = Boolean(process.env.VENICE_API_KEY?.trim());
    const hasRunware = Boolean(process.env.RUNWARE_API_KEY?.trim());
    if (!hasVenice && !hasRunware) {
      logger.error("No image generation provider configured");
      incrementFailedRequests().catch(() => {});
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch (error) {
      logger.warn("Invalid JSON in request body", {
        ip,
        error: error instanceof Error ? error.message : "Unknown parsing error",
      });
      incrementFailedRequests().catch(() => {});
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400, headers: responseHeaders }
      );
    }

    const { prompt, model = DEFAULT_MODEL, hide_watermark = true } = body;

    if (!prompt) {
      logger.warn("Missing prompt in request", { ip });
      incrementFailedRequests().catch(() => {});
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400, headers: responseHeaders }
      );
    }

    if (!ALLOWED_MODELS.includes(model)) {
      logger.warn("Invalid model requested", { ip, model });
      incrementFailedRequests().catch(() => {});
      return NextResponse.json(
        {
          error: `Invalid model. Allowed models are: ${ALLOWED_MODELS.join(
            ", "
          )}`,
        },
        { status: 400, headers: responseHeaders }
      );
    }

    logger.info("Starting image generation", {
      ip,
      model,
      promptLength: prompt.length,
    });

    try {
      const result = await generateImageWithFallback(prompt, controller.signal, {
        width: 768,
        height: 768,
      });

      clearTimeout(timeout);

      logger.info("Image generation successful", {
        ip,
        provider: result.provider,
        model: result.model,
        costUsd: result.costUsd,
      });

      return NextResponse.json(
        {
          images: [result.buffer.toString("base64")],
          provider: result.provider,
          model: result.model,
          ...(result.costUsd != null ? { costUsd: result.costUsd } : {}),
          // Legacy field for Studio UI (still requests venice-sd35)
          requestedModel: model,
          hide_watermark,
        },
        { headers: responseHeaders },
      );
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        logger.error("Request timeout", { ip });
        incrementFailedRequests().catch(() => {});
        return NextResponse.json(
          {
            error:
              "Image generation timed out. Please try again with a simpler prompt.",
          },
          { status: 504, headers: responseHeaders }
        );
      }

      logger.error("Image generation error", {
        error: error instanceof Error ? error.message : "Unknown error",
        ip,
      });
      incrementFailedRequests().catch(() => {});
      return NextResponse.json(
        { error: "Failed to generate image. Please try again." },
        { status: 500, headers: responseHeaders }
      );
    }
  } catch (error) {
    logger.error("Unexpected error", {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    incrementFailedRequests();

    return NextResponse.json(
      {
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
