import { NextResponse } from "next/server";
import Replicate from "replicate";
import { logger } from "@/lib/logger";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import { registerPending } from "@/lib/predictions";
import { APP_URL } from "@/lib/env";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function POST(request: Request): Promise<Response> {
  try {
    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check rate limit
    const rateLimitInfo = await getRateLimitInfo(ip);

    // Add rate limit headers
    const responseHeaders = {
      "X-RateLimit-Limit": "20",
      "X-RateLimit-Remaining": rateLimitInfo.remaining?.toString() || "0",
      "X-RateLimit-Reset": rateLimitInfo.timeToReset.toString(),
    };

    if (!rateLimitInfo.isAllowed) {
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

    // Handle both FormData and JSON requests
    let dataUrl: string;
    let castHash: string | undefined;
    let account: string | undefined;
    let webhookUrl: string | undefined;
    const contentType = request.headers.get("content-type");

    if (contentType?.includes("multipart/form-data")) {
      // Handle FormData
      const formData = await request.formData();
      const imageFile = formData.get("image") as File;
      const meta = formData.get("meta");
      if (typeof meta === "string") {
        try {
          const parsed = JSON.parse(meta);
          castHash = parsed.castHash;
          account = parsed.account;
          webhookUrl = parsed.webhookUrl;
        } catch {
          // ignore — meta was malformed; proceed without webhook
        }
      }

      if (!imageFile) {
        return NextResponse.json(
          { error: "Image file is required" },
          { status: 400, headers: responseHeaders }
        );
      }

      const buffer = await imageFile.arrayBuffer();
      const base64Image = Buffer.from(buffer).toString("base64");
      dataUrl = `data:${imageFile.type};base64,${base64Image}`;
    } else {
      const body = await request.json();
      if (!body.imageUrl) {
        return NextResponse.json(
          { error: "Image URL is required" },
          { status: 400, headers: responseHeaders }
        );
      }
      castHash = body.castHash;
      account = body.account;
      // Webhook callback only applies to the Farcaster flow — the web UI has
      // no callback consumer and would orphan a Redis pending entry.
      webhookUrl = castHash
        ? body.webhookUrl ?? `${APP_URL}/api/replicate/webhook`
        : undefined;

      try {
        const imageResponse = await fetch(body.imageUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; WOWOWIFYAgent/1.0)",
            Accept: "image/*, */*",
          },
        });

        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image: ${imageResponse.statusText}`);
        }

        const buffer = await imageResponse.arrayBuffer();
        const base64Image = Buffer.from(buffer).toString("base64");
        const contentType =
          imageResponse.headers.get("content-type") || "image/jpeg";
        dataUrl = `data:${contentType};base64,${base64Image}`;
      } catch (error) {
        logger.error("Error downloading image:", {
          error: error instanceof Error ? error.message : "Unknown error",
          url: body.imageUrl,
        });
        return NextResponse.json(
          { error: "Failed to download image" },
          { status: 400, headers: responseHeaders }
        );
      }
    }

    logger.info("Starting Replicate prediction", {
      ip,
      contentType,
      hasWebhook: Boolean(webhookUrl),
      hasCastHash: Boolean(castHash),
    });

    // Webhook routing is one-line: the Farcaster flow gets a webhook URL,
    // the web UI gets nothing. Replicate fires its webhook (when configured)
    // to the canonical /api/replicate/webhook endpoint; our webhook handler
    // looks the castHash up in Redis and posts the Neynar reply.
    const webhookPredictionUrl = webhookUrl;

    const prediction = await replicate.predictions.create({
      version:
        "4b82bb7dbb3b153882a0c34d7f2cbc4f7012ea7eaddb4f65c257a3403c9b3253",
      input: {
        image: dataUrl,
        prompt: "Studio Ghibli style artwork",
        prompt_strength: 0.66,
        guidance_scale: 7.5,
        num_inference_steps: 50,
        lora_scale: 0.7,
      },
      ...(webhookPredictionUrl
        ? { webhook: webhookPredictionUrl, webhook_events_filter: ["completed"] }
        : {}),
    });

    // Post-creation: register prediction ↔ castHash mapping for callback lookup
    if (castHash) {
      try {
        await registerPending(prediction.id, {
          castHash,
          account,
          source: "farcaster",
        });
      } catch (error) {
        logger.error("Failed to register pending prediction in Redis — cancelling prediction", {
          error: error instanceof Error ? error.message : String(error),
          predictionId: prediction.id,
        });
        // Best-effort cancel so the orphan Replicate job doesn't callback into
        // /api/replicate/webhook without a Redis mapping. The orphan will also
        // self-clean via Replicate's job TTL, but cancelling short-circuits it.
        try {
          await replicate.predictions.cancel(prediction.id);
          logger.info("Cancelled orphan Replicate prediction", {
            predictionId: prediction.id,
          });
        } catch (cancelError) {
          logger.warn(
            "Failed to cancel orphan Replicate prediction — Replicate job TTL will reclaim it",
            {
              error:
                cancelError instanceof Error
                  ? cancelError.message
                  : String(cancelError),
              predictionId: prediction.id,
            },
          );
        }
        // Fail loud — caller needs to know callback routing is broken
        return NextResponse.json(
          {
            error:
              "Internal error: could not register prediction. Please retry.",
          },
          { status: 500, headers: responseHeaders },
        );
      }
    }

    logger.info("Created Replicate prediction", {
      id: prediction.id,
      status: prediction.status,
      webhook: Boolean(webhookPredictionUrl),
    });

    return NextResponse.json(
      {
        id: prediction.id,
        status: prediction.status,
      },
      { status: 202, headers: responseHeaders }
    );
  } catch (error) {
    logger.error("Error processing image with Replicate:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to process image with Ghibli style",
      },
      { status: 500 }
    );
  }
}

// Add GET endpoint to check prediction status
export async function GET(request: Request): Promise<Response> {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Prediction ID is required" },
        { status: 400 }
      );
    }

    const prediction = await replicate.predictions.get(id);

    if (prediction.error) {
      return NextResponse.json({ error: prediction.error }, { status: 400 });
    }

    // If the prediction is complete, return the output
    if (prediction.status === "succeeded") {
      return NextResponse.json({
        status: prediction.status,
        url: prediction.output?.[0],
      });
    }

    // Otherwise return the current status
    return NextResponse.json({
      status: prediction.status,
    });
  } catch (error) {
    logger.error("Error checking prediction status:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      {
        error: "Failed to check prediction status",
      },
      { status: 500 }
    );
  }
}
