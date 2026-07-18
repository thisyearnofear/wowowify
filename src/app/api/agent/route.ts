import { NextResponse } from "next/server";
import {
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
import { getBrandKit, getBrandKitByRef, mergeBrandKitIntoCommand, parseBrandKitRef } from "@/lib/brand-kits";
import { getAgentCapabilityCard } from "@/lib/agent-capability-card";
import { finalizeCompletedAgentRun } from "@/lib/agent-completion";
import { checkAgentPayment } from "@/lib/x402";
import {
  checkAgentDailyCap,
  recordAgentCompletion,
} from "@/lib/agent-usage";
import {
  enforceBrandKitAgentContract,
  isBrandKitContractEnabled,
  normalizeCampaignFormats,
} from "@/lib/brand-kit-contract";

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

// Align with command-router pipeline (campaign kits + Runware/Venice fallback)
export const maxDuration = 30;

const TIMEOUT_MS = 30000;

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

    const dailyCap = await checkAgentDailyCap();
    if (!dailyCap.allowed) {
      return NextResponse.json(
        {
          error: `Daily generation cap reached (${dailyCap.count}/${dailyCap.max}). Try again tomorrow or contact the operator for a higher limit.`,
        },
        { status: 429 },
      );
    }

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
      "X-RateLimit-Limit": String(rateLimitInfo.limit),
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
    const normalizedFormats = normalizeCampaignFormats(requestedFormats);
    if (normalizedFormats !== null && "ok" in normalizedFormats && normalizedFormats.ok === false) {
      return NextResponse.json(
        { error: normalizedFormats.error },
        { status: normalizedFormats.status, headers: responseHeaders },
      );
    }
    let campaignFormats: CampaignFormat[] | null = null;
    if (Array.isArray(normalizedFormats)) {
      campaignFormats = normalizedFormats;
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

    const brandKitRef = providedParameters?.brandKitId as string | undefined;
    let resolvedBrandKitId: string | undefined;
    const loadedKit = brandKitRef ? await getBrandKitByRef(brandKitRef) : null;

    if (loadedKit) {
      parsedCommand = mergeBrandKitIntoCommand(parsedCommand, loadedKit);
      if (!campaignFormats && loadedKit.formats?.length) {
        campaignFormats = loadedKit.formats;
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

    const brandKitContractEnabled = isBrandKitContractEnabled();
    if (brandKitContractEnabled) {
      const kitForContract =
        loadedKit ??
        (brandKitRef ? await getBrandKit(parseBrandKitRef(brandKitRef).id) : null);
      const contract = enforceBrandKitAgentContract({
        brandKitRef,
        kit: kitForContract,
        parsedCommand,
        requestedFormats: campaignFormats,
        enforcementEnabled: true,
      });
      if (!contract.ok) {
        incrementFailedRequests().catch(() => {});
        return NextResponse.json(
          { error: contract.error },
          { status: contract.status, headers: responseHeaders },
        );
      }
      campaignFormats = contract.formats;
      resolvedBrandKitId = contract.brandKitId;
    } else if (brandKitRef) {
      resolvedBrandKitId = parseBrandKitRef(brandKitRef).id;
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
            ? await finalizeCompletedAgentRun({
                command,
                brandKitId: resolvedBrandKitId ?? brandKitRef,
                formats: campaignFormats,
                parsedCommand,
                result,
              })
            : null;
        if (result.status === "completed") {
          await recordAgentCompletion();
        }
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

      const draftMeta = await finalizeCompletedAgentRun({
        command,
        brandKitId: resolvedBrandKitId ?? brandKitRef,
        formats: campaignFormats,
        parsedCommand,
        result,
      });

      if (result.status === "completed") {
        await recordAgentCompletion();
      }

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
