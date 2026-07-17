/**
 * ImageService — thin façade over CommandRouter.
 *
 * This file replaces the previous 876-LOC monolith. The bulk of the image
 * pipeline now lives in:
 *   - command-router.ts (orchestration + heuristics + finalize)
 *   - overlay-composer.ts (canvas + overlay + preview)
 *   - text-renderer.ts (text rasterization)
 *   - grove-archiver.ts (best-effort Grove upload)
 *
 * The class surface is intentionally unchanged so call sites (service-factory,
 * /api/agent, /api/farcaster/webhook, command-parser.test) keep working
 * without modification. New code SHOULD reach for the specialist modules
 * directly when it knows it needs, say, only text rendering.
 */

import type {
  AgentResponse,
  CampaignFormat,
  CampaignKitResponse,
  ParsedCommand,
} from "@/lib/agent-types";
import { InterfaceType } from "@/lib/command-parser/index";
import { CommandRouter } from "./command-router";

/**
 * Core image service that acts as a stable façade over the specialized
 * feature modules. Each instance owns ONE CommandRouter; no state is shared
 * between instances.
 */
export class ImageService {
  private router: CommandRouter;

  constructor() {
    this.router = new CommandRouter();
  }

  /**
   * Parse a command string into a structured ParsedCommand.
   * Delegates to CommandRouter.parseCommand.
   */
  public parseCommand(
    command: string,
    interfaceType: InterfaceType = "default",
    parentImageUrl?: string,
  ): ParsedCommand {
    return this.router.parseCommand(command, interfaceType, parentImageUrl);
  }

  /**
   * Process a parsed command through the full pipeline.
   * Delegates to CommandRouter.processCommand.
   */
  public async processCommand(
    parsedCommand: ParsedCommand,
    baseUrl: string = "",
    walletAddressForOverlay?: string,
    isFarcaster: boolean = false,
  ): Promise<AgentResponse> {
    return this.router.processCommand(
      parsedCommand,
      baseUrl,
      walletAddressForOverlay,
      isFarcaster,
    );
  }

  public async processCampaignKit(
    parsedCommand: ParsedCommand,
    formats: CampaignFormat[],
    baseUrl: string = "",
  ): Promise<CampaignKitResponse> {
    return this.router.processCampaignKit(parsedCommand, formats, baseUrl);
  }

  /**
   * Static overlay-mode validator — used by command-parser tests.
   * Delegates to CommandRouter.validateOverlayMode.
   */
  public static validateOverlayMode(overlayMode?: string): void {
    CommandRouter.validateOverlayMode(overlayMode);
  }
}
