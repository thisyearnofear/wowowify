/**
 * CommandRouter — orchestrator class that owns parse → acquire → compose →
 * archive for the @toka image pipeline.
 *
 * Decomposed from src/lib/services/image-service.ts (876 LOC) into:
 *   - text-renderer.ts        (text rasterization)
 *   - overlay-composer.ts     (canvas + overlay + preview)
 *   - grove-archiver.ts       (best-effort Grove upload)
 *   - result-archiver.ts      (memory store + Grove + history fill)
 *   - command-heuristics.ts   (parent/no-parent action decisions)
 *
 * This module owns the orchestration:
 *   parseCommand → processCommand → [handleGhiblify | acquire → compose → archiveResult]
 *
 * Public surface preserved (call sites untouched):
 *   - parseCommand(command, interfaceType, parentImageUrl?): ParsedCommand
 *   - processCommand(parsedCommand, baseUrl, walletAddress?, isFarcaster?): Promise<AgentResponse>
 *   - static validateOverlayMode(overlayMode?): void
 */

import { v4 as uuidv4 } from "uuid";

import type {
  AgentResponse,
  CampaignAsset,
  CampaignFormat,
  CampaignKitResponse,
  ParsedCommand,
} from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { InterfaceType, parseCommand } from "@/lib/command-parser/index";
import { ensureFontsAreRegistered } from "@/lib/image-processor";
import {
  DEFAULT_OVERLAY_PROMPTS,
  validateOverlayMode as validateOverlayModeUtil,
} from "@/lib/config/overlays";

import { composeImage } from "./overlay-composer";
import { archiveResult } from "./result-archiver";
import { downloadImage as fetchImageBuffer } from "./image-fetcher";
import { generateImage as callVenice } from "./venice-client";
import { ghibliService } from "./ghibli-service";
import {
  applyParentImageContext,
  resolveActionWithoutParent,
} from "./command-heuristics";

const TIMEOUT_MS = 30000;

export class CommandRouter {
  // -----------------------------------------------------------------------
  // Public API (consumed by ImageService facade + future callers)
  // -----------------------------------------------------------------------

  /**
   * Parse a command string into a structured ParsedCommand — delegates
   * action decisions to command-heuristics.ts.
   */
  public parseCommand(
    command: string,
    interfaceType: InterfaceType = "default",
    parentImageUrl?: string,
  ): ParsedCommand {
    const parsedCommand = parseCommand(command, interfaceType);

    logger.info("Initial parsed command", {
      action: parsedCommand.action,
      overlayMode: parsedCommand.overlayMode,
      prompt: parsedCommand.prompt
        ? parsedCommand.prompt.substring(0, 50) + "..."
        : "none",
      useParentImage: parsedCommand.useParentImage,
      interfaceType,
    });

    if (parentImageUrl) {
      applyParentImageContext(parsedCommand, parentImageUrl);
    } else {
      resolveActionWithoutParent(parsedCommand, command);
    }

    logger.info("Final parsed command", {
      action: parsedCommand.action,
      overlayMode: parsedCommand.overlayMode,
      prompt: parsedCommand.prompt
        ? parsedCommand.prompt.substring(0, 50) + "..."
        : "none",
      useParentImage: parsedCommand.useParentImage,
      baseImageUrl: parsedCommand.baseImageUrl ? "provided" : "not provided",
      interfaceType,
    });

    return parsedCommand;
  }

  /**
   * Static overlay-mode validator — referenced by command-parser.test.ts via
   * ImageService.validateOverlayMode (the façade delegates here).
   */
  public static validateOverlayMode(overlayMode?: string): void {
    validateOverlayModeUtil(overlayMode);
  }

  /**
   * Full pipeline:
   *   1. ensureFontsAreRegistered (one-time, before canvas/text work).
   *   2. validate overlay mode.
   *   3. Ghiblify → fire-and-return (handled by Replicate webhook).
   *   4. acquire base image (download | Venice | overlay default).
   *   5. composeImage (canvas + overlay + text + preview).
   *   6. archiveResult (memory store + Grove + history URLs).
   */
  public async processCommand(
    parsedCommand: ParsedCommand,
    baseUrl: string = "",
    walletAddressForOverlay?: string,
    isFarcaster: boolean = false,
  ): Promise<AgentResponse> {
    const requestId = uuidv4();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      await ensureFontsAreRegistered();

      CommandRouter.validateOverlayMode(parsedCommand.overlayMode);

      logger.info("Processing command", {
        requestId,
        action: parsedCommand.action,
        baseImageUrl: parsedCommand.baseImageUrl ? "provided" : "not provided",
        useParentImage: parsedCommand.useParentImage,
        overlayMode: parsedCommand.overlayMode,
      });

      if (parsedCommand.overlayMode === "ghiblify") {
        return await this.handleGhiblify(parsedCommand, walletAddressForOverlay);
      }

      const baseImageBuffer = await this.acquireBaseImage(
        parsedCommand,
        controller.signal,
      );

      const { resultBuffer, previewBuffer } = await composeImage(
        parsedCommand,
        baseImageBuffer,
        baseUrl,
        controller.signal,
      );

      return await archiveResult({
        resultBuffer,
        previewBuffer,
        overlayMode: parsedCommand.overlayMode,
        baseUrl,
        walletAddressForOverlay,
        isFarcaster,
      });
    } catch (error) {
      logger.error("Error processing command", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      return {
        id: requestId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Generate the visual world once, then deterministically produce every
   * requested campaign format from that source image.
   */
  public async processCampaignKit(
    parsedCommand: ParsedCommand,
    formats: CampaignFormat[],
    baseUrl: string = "",
  ): Promise<CampaignKitResponse> {
    const requestId = uuidv4();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      if (parsedCommand.overlayMode === "ghiblify") {
        throw new Error("Campaign kits do not support asynchronous transformations");
      }

      await ensureFontsAreRegistered();
      CommandRouter.validateOverlayMode(parsedCommand.overlayMode);
      const baseImageBuffer = await this.acquireBaseImage(parsedCommand, controller.signal);
      const assets = await Promise.all(
        formats.map(async (format): Promise<CampaignAsset> => {
          const { resultBuffer, previewBuffer } = await composeImage(
            parsedCommand,
            baseImageBuffer,
            baseUrl,
            controller.signal,
            format,
          );
          const result = await archiveResult({
            resultBuffer,
            previewBuffer,
            overlayMode: parsedCommand.overlayMode,
            baseUrl,
            archiveToGrove: false,
          });
          return { ...result, format };
        }),
      );

      return { id: requestId, status: "completed", assets };
    } catch (error) {
      logger.error("Error processing campaign kit", {
        requestId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
      return {
        id: requestId,
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } finally {
      clearTimeout(timeout);
    }
  }

  // -----------------------------------------------------------------------
  // Private helpers (kept here because they're tightly bound to the
  // orchestrator's pipeline; if they grow further, split out.)
  // -----------------------------------------------------------------------

  /**
   * Ghiblify is fire-and-return — the slow Replicate poll is handled in
   * Replicate's cloud and surfaces via /api/replicate/webhook.
   */
  private async handleGhiblify(
    parsedCommand: ParsedCommand,
    walletAddress?: string,
  ): Promise<AgentResponse> {
    if (!parsedCommand.baseImageUrl) {
      throw new Error("Base image URL is required for ghiblify mode");
    }
    logger.info("Firing ghiblify request", {
      baseImageUrl: parsedCommand.baseImageUrl,
    });
    const { id: predictionId, status } = await ghibliService.startPrediction(
      parsedCommand.baseImageUrl,
      walletAddress ? { account: walletAddress } : {},
    );
    return {
      id: predictionId,
      status: "processing",
      pollUrl: `/api/replicate?id=${encodeURIComponent(predictionId)}`,
      message:
        status === "starting"
          ? "Ghiblify started. Polling."
          : `Ghiblify status: ${status}.`,
    };
  }

  /** Pick ONE source for the base image: URL > prompt > overlay default. */
  private async acquireBaseImage(
    parsedCommand: ParsedCommand,
    abortSignal: AbortSignal,
  ): Promise<Buffer> {
    if (parsedCommand.baseImageUrl) {
      return fetchImageBuffer(parsedCommand.baseImageUrl, abortSignal);
    }
    if (parsedCommand.prompt) {
      return callVenice(parsedCommand.prompt, abortSignal);
    }
    if (parsedCommand.overlayMode) {
      const defaultPrompt =
        DEFAULT_OVERLAY_PROMPTS[parsedCommand.overlayMode] ||
        "a simple background";
      return callVenice(defaultPrompt, abortSignal);
    }
    throw new Error("No base image URL or prompt provided");
  }
}
