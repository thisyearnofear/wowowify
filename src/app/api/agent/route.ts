import { NextResponse } from "next/server";
import {
  CAMPAIGN_FORMATS,
  CampaignFormat,
  ParsedCommand,
} from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { incrementTotalRequests, incrementFailedRequests } from "@/lib/metrics";
import { getRateLimitInfo } from "@/lib/rate-limiter";
import { ensureFontsAreRegistered } from "@/lib/image-processor";
import { getImageService, InterfaceType } from "@/lib/services";
import { validateOverlayMode } from "@/lib/config/overlays";
import { getBrandKit, mergeBrandKitIntoCommand } from "@/lib/brand-kits";
import { getAgentCapabilityCard } from "@/lib/agent-capability-card";
import { saveCampaignDraft } from "@/lib/campaign-drafts";
import { checkAgentPayment } from "@/lib/x402";
import type { CampaignKitResponse } from "@/lib/agent-types";

// Mark the route as dynamic to prevent static optimization
export const dynamic = "force-dynamic";

/** Public service card used by agent marketplaces and integration checks. */
export function GET(): Response {
  return NextResponse.json(getAgentCapabilityCard(), {
    headers: {
      "Cache-Control": "public, max-age=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Timeout for image processing — 10s to stay within Vercel Hobby (10s) function limit
const TIMEOUT_MS = 10000;

async function persistReviewDraft(options: {
  command?: string;
  brandKitId?: string;
  formats?: CampaignFormat[] | null;
  parsedCommand: ParsedCommand;
  result: {
    status: string;
    previewUrl?: string;
    resultUrl?: string;
    assets?: CampaignKitResponse["assets"];
    error?: string;
  };
}) {
  if (options.result.status !== "completed") return null;
  const draft = await saveCampaignDraft({
    command: options.command || options.parsedCommand.prompt || "",
    brief: options.parsedCommand.prompt,
    brandKitId: options.brandKitId,
    logoUrl: options.parsedCommand.logoUrl,
    overlayMode: options.parsedCommand.overlayMode,
    text: options.parsedCommand.text,
    controls: options.parsedCommand.controls,
    formats: options.formats || undefined,
    previewUrl: options.result.previewUrl,
    resultUrl: options.result.resultUrl,
    assets: options.result.assets,
    status: "completed",
  });
  return { draftId: draft.id, studioReviewUrl: draft.studioReviewUrl };
}

// Valid API keys for external agents
const VALID_API_KEYS = {
  ADMIN: process.env.ADMIN_API_KEY || "",
  TELEGRAM: process.env.TELEGRAM_API_KEY || "", // Telegram agent API key
};

export async function POST(request: Request): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    incrementTotalRequests().catch(() => {});

    const paymentGate = checkAgentPayment(request);
    if (paymentGate) return paymentGate;

    // Ensure fonts are registered before processing
    await ensureFontsAreRegistered();

    // Get client IP for rate limiting
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      "unknown";

    // Check API key authentication for external agents
    const apiKey = request.headers.get("x-api-key");
    const isExternalAgent = request.headers.get("x-agent-type") === "external";

    // If this is marked as an external agent request, require API key
    if (isExternalAgent) {
      const isValidApiKey =
        apiKey === VALID_API_KEYS.ADMIN || apiKey === VALID_API_KEYS.TELEGRAM;

      if (!apiKey || !isValidApiKey) {
        logger.warn("Unauthorized external agent request", {
          ip,
          hasApiKey: !!apiKey,
          providedKey: apiKey?.substring(0, 5) + "..." || "none",
        });

        return NextResponse.json(
          {
            error: "Unauthorized. Valid API key required for external agents.",
          },
          { status: 401 }
        );
      }

      logger.info("Authorized external agent request", {
        ip,
        agent: apiKey === VALID_API_KEYS.TELEGRAM ? "Telegram" : "Admin",
      });
    }

    // Check rate limit
    const rateLimitInfo = await getRateLimitInfo(ip);

    // Always add rate limit headers
    const responseHeaders = {
      "X-RateLimit-Limit": "20",
      // remaining may be undefined when the rate-limiter has no entry yet;
      // collapse to 0 in that case so the response shape stays a string.
      "X-RateLimit-Remaining": String(rateLimitInfo.remaining ?? 0),
      "X-RateLimit-Reset": rateLimitInfo.timeToReset.toString(),
    };

    // For external agents with valid API keys, allow higher rate limits
    const hasValidApiKey =
      apiKey === VALID_API_KEYS.ADMIN || apiKey === VALID_API_KEYS.TELEGRAM;

    if (
      !rateLimitInfo.isAllowed &&
      (!hasValidApiKey || (rateLimitInfo.remaining ?? 0) < -50)
    ) {
      // External agents with valid API keys get 50 extra requests
      logger.warn("Rate limit exceeded", {
        ip,
        isExternalAgent,
        hasValidApiKey,
        agent:
          apiKey === VALID_API_KEYS.TELEGRAM
            ? "Telegram"
            : apiKey === VALID_API_KEYS.ADMIN
            ? "Admin"
            : "Unknown",
      });
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

    // Generate a unique ID for this request
    const requestId = uuidv4();

    // Get base URL for constructing image URLs
    const baseUrl = request.headers.get("x-forwarded-proto")
      ? `${request.headers.get("x-forwarded-proto")}://${request.headers.get(
          "x-forwarded-host"
        )}`
      : "";

    // Extract parameters from the request body
    const body = await request.json();
    const command = body.command;
    const providedParameters = body.parameters;
    // Extract wallet address for Grove storage
    const walletAddressForOverlay = body.walletAddress as string;
    const parentImageUrl = body.parentImageUrl; // Extract parent image URL
    const requestedFormats = providedParameters?.formats;
    let campaignFormats: CampaignFormat[] | null = null;

    if (requestedFormats !== undefined) {
      if (
        !Array.isArray(requestedFormats) ||
        requestedFormats.length === 0 ||
        requestedFormats.length > CAMPAIGN_FORMATS.length ||
        !requestedFormats.every((format) =>
          CAMPAIGN_FORMATS.includes(format as CampaignFormat),
        )
      ) {
        return NextResponse.json(
          { error: "formats must contain square, landscape, and/or portrait" },
          { status: 400, headers: responseHeaders },
        );
      }

      campaignFormats = [...new Set(requestedFormats)] as CampaignFormat[];
    }

    // Determine interface type based on request headers
    const isFarcaster = body.isFarcaster === true;
    const isTelegram = isExternalAgent && apiKey === VALID_API_KEYS.TELEGRAM;

    // If this is a special agent request, log it
    if (isFarcaster || isTelegram) {
      logger.info(
        `Processing request from ${isFarcaster ? "Farcaster" : "Telegram"}`,
        {
          ip,
          command: command?.substring(0, 100) || "No command",
          hasParentImage: !!parentImageUrl,
        }
      );
    }

    // Get the appropriate service for this interface
    let interfaceType: InterfaceType = "web";
    if (isFarcaster) {
      interfaceType = "farcaster";
    } else if (isTelegram) {
      interfaceType = "telegram";
    }

    const imageService = getImageService(interfaceType);

    // Parse natural language first, then apply structured parameters as
    // explicit overrides below. Parameter-only callers retain support.
    let parsedCommand: ParsedCommand;
    if (command) {
      parsedCommand = imageService.parseCommand(
        command,
        interfaceType,
        parentImageUrl
      );
    } else if (providedParameters) {
      parsedCommand = {
        action:
          providedParameters.action ||
          (providedParameters.baseImageUrl ? "overlay" : "generate"),
        ...providedParameters,
      } as ParsedCommand;
    } else {
      return NextResponse.json(
        { error: "No command or parameters provided" },
        { status: 400 }
      );
    }

    if (providedParameters?.brandKitId) {
      const kit = await getBrandKit(providedParameters.brandKitId);
      if (!kit) {
        return NextResponse.json(
          { error: "Brand kit not found" },
          { status: 404, headers: responseHeaders },
        );
      }
      parsedCommand = mergeBrandKitIntoCommand(parsedCommand, kit);
      if (!campaignFormats && kit.formats?.length) {
        campaignFormats = kit.formats;
      }
    }

    // Override with explicit parameters if provided
    if (body.parameters) {
      if (body.parameters.baseImageUrl) {
        parsedCommand.baseImageUrl = body.parameters.baseImageUrl;
      }
      if (body.parameters.logoUrl) {
        if (typeof body.parameters.logoUrl !== "string") {
          return NextResponse.json(
            { error: "logoUrl must be a public HTTP(S) image URL" },
            { status: 400, headers: responseHeaders }
          );
        }

        try {
          const logoUrl = new URL(body.parameters.logoUrl);
          if (logoUrl.protocol !== "http:" && logoUrl.protocol !== "https:") {
            throw new Error("Unsupported URL protocol");
          }
          parsedCommand.logoUrl = logoUrl.toString();
        } catch {
          return NextResponse.json(
            { error: "logoUrl must be a public HTTP(S) image URL" },
            { status: 400, headers: responseHeaders }
          );
        }
      }
      if (body.parameters.prompt) {
        parsedCommand.prompt = body.parameters.prompt;
      }
      if (body.parameters.overlayMode) {
        try {
          validateOverlayMode(body.parameters.overlayMode);
          parsedCommand.overlayMode = body.parameters.overlayMode;
        } catch (err) {
          logger.warn("Invalid overlay mode", {
            overlayMode: body.parameters.overlayMode,
            ip,
          });
          return NextResponse.json(
            {
              error: err instanceof Error ? err.message : "Invalid overlay mode",
            },
            { status: 400, headers: responseHeaders }
          );
        }
      }
      if (body.parameters.controls) {
        parsedCommand.controls = {
          ...parsedCommand.controls,
          ...body.parameters.controls,
        };
      }
      if (body.parameters.text) {
        parsedCommand.text = {
          ...parsedCommand.text,
          ...body.parameters.text,
        };
      }
      // Explicit action takes precedence over the inferred action.
      if (body.parameters.action) {
        parsedCommand.action = body.parameters.action;
      }
    }

    try {
      logger.info("Processing agent command", {
        requestId,
        action: parsedCommand.action,
        ip,
        baseImageUrl: parsedCommand.baseImageUrl ? "provided" : "not provided",
        logoUrl: parsedCommand.logoUrl ? "provided" : "not provided",
        useParentImage: parsedCommand.useParentImage,
        overlayMode: parsedCommand.overlayMode,
      });

      if (campaignFormats) {
        const result = await imageService.processCampaignKit(
          parsedCommand,
          campaignFormats,
          baseUrl,
        );
        const draftMeta =
          result.status === "completed"
            ? await persistReviewDraft({
                command,
                brandKitId: providedParameters?.brandKitId,
                formats: campaignFormats,
                parsedCommand,
                result,
              })
            : null;
        return NextResponse.json(
          draftMeta ? { ...result, ...draftMeta } : result,
          {
            status: result.status === "completed" ? 200 : 500,
            headers: responseHeaders,
          },
        );
      }

      // Process the command using our service
      const result = await imageService.processCommand(
        parsedCommand,
        baseUrl,
        walletAddressForOverlay,
        isFarcaster
      );

      const draftMeta = await persistReviewDraft({
        command,
        brandKitId: providedParameters?.brandKitId,
        formats: campaignFormats,
        parsedCommand,
        result,
      });

      return NextResponse.json(draftMeta ? { ...result, ...draftMeta } : result, {
        status: 200,
        headers: responseHeaders,
      });
    } catch (error) {
      logger.error("Error processing command", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        ip,
      });
      incrementFailedRequests().catch(() => {});

      return NextResponse.json(
        {
          id: requestId,
          status: "failed",
          error: error instanceof Error ? error.message : "Unknown error",
        },
        { status: 500, headers: responseHeaders }
      );
    }
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      logger.error("Request processing timed out", {
        error: "Timeout",
      });
      incrementFailedRequests().catch(() => {});
      return NextResponse.json(
        {
          status: "failed",
          error:
            "Request processing timed out. Please try again with a simpler prompt.",
        },
        { status: 504 }
      );
    }

    logger.error("Unexpected error in agent API", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    incrementFailedRequests().catch(() => {});

    return NextResponse.json(
      {
        status: "failed",
        error: "An unexpected error occurred. Please try again.",
      },
      { status: 500 }
    );
  } finally {
    clearTimeout(timeout);
  }
}
