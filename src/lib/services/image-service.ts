import { ParsedCommand, AgentResponse } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import { createCanvas, loadImage } from "canvas";
import { storeImage } from "@/lib/image-store";
import { uploadToGrove } from "@/lib/grove-storage";
import {
  addTextToImage,
  ensureFontsAreRegistered,
} from "@/lib/image-processor";
import { parseCommand } from "@/lib/command-parser/index";
import { InterfaceType } from "@/lib/command-parser/index";
import { storeImageUrl } from "@/lib/image-history";
import { ghibliService } from "./ghibli-service";
import {
  OVERLAY_URLS,
  DEFAULT_OVERLAY_PROMPTS,
  OVERLAY_KEYWORDS,
} from "@/lib/config/overlays";

// Timeout for image processing
const TIMEOUT_MS = 30000;

// Venice API configuration
const VENICE_API_URL = "https://api.venice.ai/api/v1/image/generate";
const VENICE_MODEL = "stable-diffusion-3.5";

/**
 * Core image service that can be used by all API endpoints
 */
export class ImageService {
  /**
   * Parse a command string into a structured ParsedCommand object
   */
  public parseCommand(
    command: string,
    interfaceType: InterfaceType = "default",
    parentImageUrl?: string
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
      this.applyParentImageContext(parsedCommand, parentImageUrl);
    } else {
      this.resolveActionWithoutParent(parsedCommand, command);
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
   * Process a command and generate an image
   */
  public async processCommand(
    parsedCommand: ParsedCommand,
    baseUrl: string = "",
    walletAddressForOverlay?: string,
    isFarcaster: boolean = false
  ): Promise<AgentResponse> {
    const requestId = uuidv4();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

    try {
      await ensureFontsAreRegistered();

      this.validateOverlayMode(parsedCommand.overlayMode);

      logger.info("Processing command", {
        requestId,
        action: parsedCommand.action,
        baseImageUrl: parsedCommand.baseImageUrl ? "provided" : "not provided",
        useParentImage: parsedCommand.useParentImage,
        overlayMode: parsedCommand.overlayMode,
      });

      // Ghiblify has its own processing pipeline
      if (parsedCommand.overlayMode === "ghiblify") {
        return await this.handleGhiblify(parsedCommand, walletAddressForOverlay);
      }

      // Step 1: Acquire base image
      const baseImageBuffer = await this.acquireBaseImage(
        parsedCommand,
        controller.signal
      );

      // Step 2: Compose overlay + text on canvas
      const resultId = uuidv4();
      const previewId = uuidv4();

      try {
        const { resultBuffer, previewBuffer } = await this.composeImage(
          parsedCommand,
          baseImageBuffer,
          baseUrl,
          controller.signal
        );

        // Step 3: Store in memory + Grove + history
        return await this.finalizeResult(
          resultId,
          previewId,
          requestId,
          parsedCommand,
          resultBuffer,
          previewBuffer,
          baseUrl,
          walletAddressForOverlay,
          isFarcaster
        );
      } catch (error) {
        logger.error("Error processing image", {
          error: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
        });
        throw error;
      }
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

  // --- Private helpers ---

  /**
   * Validate overlay mode is supported
   */
  private validateOverlayMode(overlayMode?: string): void {
    if (
      overlayMode &&
      overlayMode !== "wowowify" &&
      !OVERLAY_KEYWORDS.includes(overlayMode)
    ) {
      logger.warn("Invalid overlay mode", { overlayMode });
      throw new Error(
        `Invalid overlay mode: ${overlayMode}. Supported modes are: ${OVERLAY_KEYWORDS.join(", ")}.`
      );
    }
  }

  /**
   * Handle ghiblify AI transformation (separate pipeline)
   */
  private async handleGhiblify(
    parsedCommand: ParsedCommand,
    walletAddress?: string
  ): Promise<AgentResponse> {
    if (!parsedCommand.baseImageUrl) {
      throw new Error("Base image URL is required for ghiblify mode");
    }

    logger.info("Processing ghiblify request", {
      baseImageUrl: parsedCommand.baseImageUrl,
    });

    const result = await ghibliService.processImage(
      parsedCommand.baseImageUrl,
      walletAddress
    );

    const resultId = uuidv4();
    await storeImageUrl(resultId, result.resultUrl, undefined, result.groveUrl);

    return {
      id: resultId,
      status: "completed",
      resultUrl: result.resultUrl,
      groveUrl: result.groveUrl,
    };
  }

  /**
   * Acquire base image: download from URL, generate from prompt, or generate default
   */
  private async acquireBaseImage(
    parsedCommand: ParsedCommand,
    abortSignal: AbortSignal
  ): Promise<Buffer> {
    if (parsedCommand.baseImageUrl) {
      return this.downloadBaseImage(parsedCommand.baseImageUrl, abortSignal);
    } else if (parsedCommand.prompt) {
      return this.generateImageFromPrompt(parsedCommand.prompt, abortSignal);
    } else if (parsedCommand.overlayMode) {
      return this.generateDefaultForOverlay(parsedCommand.overlayMode, abortSignal);
    } else {
      throw new Error("No base image URL or prompt provided");
    }
  }

  /**
   * Download base image from URL, with Farcaster image handling
   */
  private async downloadBaseImage(
    imageUrl: string,
    abortSignal: AbortSignal
  ): Promise<Buffer> {
    try {
      logger.info("Downloading image from URL", {
        url: imageUrl.substring(0, 100),
      });

      // Special handling for Farcaster images — request original size
      const isFarcasterImage = imageUrl.includes("imagedelivery.net");
      const finalImageUrl =
        isFarcasterImage && !imageUrl.includes("/original")
          ? `${imageUrl.split("?")[0]}/original`
          : imageUrl;

      if (finalImageUrl !== imageUrl) {
        logger.info("Modified image URL to request original size", {
          originalUrl: imageUrl.substring(0, 100),
          modifiedUrl: finalImageUrl.substring(0, 100),
        });
      }

      const response = await fetch(finalImageUrl, {
        signal: abortSignal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WOWOWIFYAgent/1.0)",
          Accept: "image/*, */*",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Failed to download image: ${response.status} ${response.statusText}`
        );
      }

      const contentType = response.headers.get("content-type");
      if (contentType && !contentType.includes("image")) {
        logger.warn("URL did not return an image content type", {
          contentType,
          url: finalImageUrl.substring(0, 100),
        });
      }

      const buffer = Buffer.from(await response.arrayBuffer());

      if (buffer.length < 100) {
        throw new Error("Downloaded image is too small or invalid");
      }

      logger.info("Successfully downloaded image", {
        size: buffer.length,
        url: finalImageUrl.substring(0, 100),
      });

      return buffer;
    } catch (error) {
      logger.error("Error downloading image", {
        error: error instanceof Error ? error.message : "Unknown error",
        url: imageUrl.substring(0, 100),
      });
      throw new Error(
        `Failed to download base image: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Generate image from prompt using Venice API
   */
  private async generateImageFromPrompt(
    prompt: string,
    abortSignal: AbortSignal
  ): Promise<Buffer> {
    try {
      if (!process.env.VENICE_API_KEY) {
        logger.error("VENICE_API_KEY is not configured");
        throw new Error("Server configuration error");
      }

      logger.info("Generating image with Venice API", {
        prompt,
        model: VENICE_MODEL,
      });

      const response = await fetch(VENICE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
        },
        body: JSON.stringify({
          prompt,
          model: VENICE_MODEL,
          hide_watermark: true,
          width: 512,
          height: 512,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const text = await response.text();
        logger.error("Venice API error", {
          status: response.status,
          statusText: response.statusText,
          responseText: text,
        });
        throw new Error(`Failed to wowowify: ${response.statusText}`);
      }

      const data = await response.json();
      if (!data.images?.[0]) {
        throw new Error("No image generated");
      }

      return Buffer.from(data.images[0], "base64");
    } catch (error) {
      logger.error("Error generating image", {
        error: error instanceof Error ? error.message : "Unknown error",
        prompt,
      });
      throw error;
    }
  }

  /**
   * Generate default background image for an overlay mode
   */
  private async generateDefaultForOverlay(
    overlayMode: string,
    abortSignal: AbortSignal
  ): Promise<Buffer> {
    try {
      if (!process.env.VENICE_API_KEY) {
        logger.error("VENICE_API_KEY is not configured");
        throw new Error("Server configuration error");
      }

      const defaultPrompt =
        DEFAULT_OVERLAY_PROMPTS[overlayMode] || "a simple background";

      logger.info("Generating default image for overlay", {
        overlayMode,
        defaultPrompt,
      });

      const response = await fetch(VENICE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.VENICE_API_KEY}`,
        },
        body: JSON.stringify({
          prompt: defaultPrompt,
          model: VENICE_MODEL,
          hide_watermark: true,
          width: 512,
          height: 512,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`Venice API error: ${response.statusText}`);
      }

      const data = await response.json();
      return Buffer.from(data.images[0], "base64");
    } catch (error) {
      logger.error("Error generating default image", {
        error: error instanceof Error ? error.message : "Unknown error",
        overlayMode,
      });
      throw new Error("Failed to generate default image for overlay");
    }
  }

  /**
   * Compose overlay + text onto base image, returning result and preview buffers
   */
  private async composeImage(
    parsedCommand: ParsedCommand,
    baseImageBuffer: Buffer,
    baseUrl: string,
    abortSignal: AbortSignal
  ): Promise<{ resultBuffer: Buffer; previewBuffer: Buffer }> {
    const baseImage = await loadImage(baseImageBuffer);
    const canvas = createCanvas(baseImage.width, baseImage.height);
    const ctx = canvas.getContext("2d");

    // Draw base image
    ctx.drawImage(baseImage, 0, 0);

    // Apply color overlay if specified
    if (
      parsedCommand.controls?.overlayAlpha &&
      parsedCommand.controls.overlayAlpha > 0
    ) {
      ctx.fillStyle = parsedCommand.controls.overlayColor || "#000000";
      ctx.globalAlpha = parsedCommand.controls.overlayAlpha;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }

    // Apply overlay image (skip for wowowify — it's the "no overlay" mode)
    if (parsedCommand.overlayMode && parsedCommand.overlayMode !== "wowowify") {
      await this.applyOverlayToCanvas(
        ctx,
        canvas,
        parsedCommand,
        baseUrl,
        abortSignal
      );
    }

    let resultBuffer = canvas.toBuffer("image/png");

    // Create preview
    const previewSize = 300;
    const previewCanvas = createCanvas(
      previewSize,
      previewSize * (baseImage.height / baseImage.width)
    );
    const previewCtx = previewCanvas.getContext("2d");
    previewCtx.drawImage(
      canvas,
      0,
      0,
      canvas.width,
      canvas.height,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height
    );
    let previewBuffer = previewCanvas.toBuffer("image/png");

    // Add text if specified
    if (parsedCommand.text?.content) {
      const textResult = await this.addTextToResult(
        resultBuffer,
        previewCanvas,
        previewCtx,
        parsedCommand
      );
      resultBuffer = textResult.resultBuffer;
      previewBuffer = textResult.previewBuffer;
    }

    return { resultBuffer, previewBuffer };
  }

  /**
   * Apply overlay image onto canvas
   */
  private async applyOverlayToCanvas(
    ctx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    canvas: ReturnType<typeof createCanvas>,
    parsedCommand: ParsedCommand,
    baseUrl: string,
    abortSignal: AbortSignal
  ): Promise<void> {
    logger.info("Applying overlay", {
      overlayMode: parsedCommand.overlayMode,
    });

    const overlayUrl = OVERLAY_URLS[parsedCommand.overlayMode!];
    if (!overlayUrl) {
      throw new Error(`Unsupported overlay mode: ${parsedCommand.overlayMode}`);
    }

    const fullOverlayUrl = overlayUrl.startsWith("/")
      ? `${baseUrl}${overlayUrl}`
      : overlayUrl;

    logger.info("Fetching overlay", { url: fullOverlayUrl });

    try {
      const overlayResponse = await fetch(fullOverlayUrl, {
        signal: abortSignal,
      });

      if (!overlayResponse.ok) {
        throw new Error(
          `Failed to download overlay: ${overlayResponse.statusText}`
        );
      }

      const overlayBuffer = Buffer.from(await overlayResponse.arrayBuffer());
      const overlayImage = await loadImage(overlayBuffer);

      const scale = parsedCommand.controls?.scale || 1;
      const scaledWidth = overlayImage.width * scale;
      const scaledHeight = overlayImage.height * scale;
      const x =
        (canvas.width - scaledWidth) / 2 + (parsedCommand.controls?.x || 0);
      const y =
        (canvas.height - scaledHeight) / 2 + (parsedCommand.controls?.y || 0);

      ctx.drawImage(overlayImage, x, y, scaledWidth, scaledHeight);
      logger.info("Overlay applied successfully", {
        overlayMode: parsedCommand.overlayMode,
        scale,
        x,
        y,
      });
    } catch (error) {
      logger.error("Error applying overlay", {
        error: error instanceof Error ? error.message : "Unknown error",
        overlayMode: parsedCommand.overlayMode,
      });
      // Continue without the overlay rather than failing completely
    }
  }

  /**
   * Add text overlay to result image and update preview
   */
  private async addTextToResult(
    resultBuffer: Buffer,
    previewCanvas: ReturnType<typeof createCanvas>,
    previewCtx: ReturnType<ReturnType<typeof createCanvas>["getContext"]>,
    parsedCommand: ParsedCommand
  ): Promise<{ resultBuffer: Buffer; previewBuffer: Buffer }> {
    logger.info("Adding text to image", {
      text: parsedCommand.text!.content,
      position: parsedCommand.text!.position,
      fontSize: parsedCommand.text!.fontSize,
      color: parsedCommand.text!.color,
      style: parsedCommand.text!.style,
    });

    // Map text style to font family
    let fontFamily = "Roboto, sans-serif";
    let fontWeight = "normal";
    const fontSize = parsedCommand.text!.fontSize || 48;
    const color = parsedCommand.text!.color || "white";

    // Position mapping
    let x: number | "center" | "left" | "right" = "center";
    let y: number | "center" | "top" | "bottom" = "bottom";

    if (parsedCommand.text!.position) {
      const pos = parsedCommand.text!.position.toLowerCase();
      if (pos === "top-left") { x = "left"; y = "top"; }
      else if (pos === "top-right") { x = "right"; y = "top"; }
      else if (pos === "bottom-left") { x = "left"; y = "bottom"; }
      else if (pos === "bottom-right") { x = "right"; y = "bottom"; }
      else if (pos === "left" || pos === "right") { x = pos; y = "center"; }
      else if (pos === "top" || pos === "bottom" || pos === "center") { y = pos; }
    }

    // Map text style to font
    if (parsedCommand.text!.style) {
      const style = parsedCommand.text!.style.toLowerCase();
      switch (style) {
        case "serif": fontFamily = "serif"; break;
        case "monospace": case "mono": fontFamily = "RobotoMono, monospace"; break;
        case "handwriting": case "script": fontFamily = "Roboto, sans-serif"; fontWeight = "normal"; break;
        case "thin": fontWeight = "normal"; break;
        case "bold": fontWeight = "bold"; break;
      }
    }

    logger.info("Using font settings", {
      fontFamily,
      fontWeight,
      fontSize,
      textStyle: parsedCommand.text!.style,
    });

    const newResultBuffer = await addTextToImage(
      resultBuffer,
      parsedCommand.text!.content,
      {
        x,
        y,
        fontSize,
        fontFamily,
        fontWeight,
        color,
        strokeColor: undefined,
        strokeWidth: 0,
        shadow: undefined,
        backgroundColor: parsedCommand.text!.backgroundColor,
        padding: 10,
        maxWidth: 800,
        lineHeight: 1.2,
        align: "center",
      }
    );

    // Update preview with text
    previewCtx.clearRect(0, 0, previewCanvas.width, previewCanvas.height);
    const imageWithText = await loadImage(newResultBuffer);
    previewCtx.drawImage(
      imageWithText,
      0,
      0,
      imageWithText.width,
      imageWithText.height,
      0,
      0,
      previewCanvas.width,
      previewCanvas.height
    );

    return {
      resultBuffer: newResultBuffer,
      previewBuffer: previewCanvas.toBuffer("image/png"),
    };
  }

  /**
   * Store result in memory, Grove, and history — return final AgentResponse
   */
  private async finalizeResult(
    resultId: string,
    previewId: string,
    requestId: string,
    parsedCommand: ParsedCommand,
    resultBuffer: Buffer,
    previewBuffer: Buffer,
    baseUrl: string,
    walletAddressForOverlay?: string,
    isFarcaster: boolean = false
  ): Promise<AgentResponse> {
    // Store images (Vercel Blob when configured, in-memory fallback otherwise)
    const [resultUrl, previewUrl] = await Promise.all([
      storeImage(resultId, resultBuffer, "image/png"),
      storeImage(previewId, previewBuffer, "image/png"),
    ]);

    // Prefix with baseUrl only for in-memory URLs (relative paths)
    const fullResultUrl = resultUrl.startsWith("/") ? `${baseUrl}${resultUrl}` : resultUrl;
    const fullPreviewUrl = previewUrl.startsWith("/") ? `${baseUrl}${previewUrl}` : previewUrl;

    // Store in Grove
    const groveResult = await this.storeInGrove(
      resultBuffer,
      resultId,
      parsedCommand.overlayMode,
      walletAddressForOverlay,
      isFarcaster
    );

    // Store in history under requestId, resultId, AND previewId so that
    // /api/image?id=<any of these> can look up the Blob URL after a cold start
    await Promise.all([
      storeImageUrl(requestId, fullResultUrl, groveResult.groveUri, groveResult.groveUrl),
      storeImageUrl(resultId, fullResultUrl, groveResult.groveUri, groveResult.groveUrl),
      storeImageUrl(previewId, fullPreviewUrl, groveResult.groveUri, groveResult.groveUrl),
    ]);

    return {
      id: requestId,
      status: "completed",
      resultUrl: fullResultUrl,
      previewUrl: fullPreviewUrl,
      groveUri: groveResult.groveUri,
      groveUrl: groveResult.groveUrl,
    };
  }

  /**
   * Upload to Grove storage with Farcaster retry
   */
  private async storeInGrove(
    resultBuffer: Buffer,
    resultId: string,
    overlayMode?: string,
    walletAddress?: string,
    isFarcaster: boolean = false
  ): Promise<{ groveUri?: string; groveUrl?: string }> {
    let groveUri: string | undefined;
    let groveUrl: string | undefined;

    logger.info(`Storing ${overlayMode || "generated"} image in Grove`);

    try {
      const fileName = `${overlayMode || "generated"}-${resultId}.png`;

      if (isFarcaster) {
        logger.info("Request is from Farcaster, prioritizing Grove storage");
      }

      const groveResult = await uploadToGrove(
        resultBuffer,
        fileName,
        walletAddress
      );

      if (groveResult.uri && groveResult.gatewayUrl) {
        groveUri = groveResult.uri;
        groveUrl = groveResult.gatewayUrl;
        logger.info("Successfully stored image in Grove", {
          groveUri,
          groveUrl,
          walletAddress: walletAddress || "none",
          isFarcaster,
        });
      } else {
        logger.warn("Grove storage returned empty URI or URL", {
          uri: groveResult.uri,
          gatewayUrl: groveResult.gatewayUrl,
          walletAddress: walletAddress || "none",
          isFarcaster,
        });

        // Retry for Farcaster requests
        if (isFarcaster) {
          const retryResult = await this.retryGroveUpload(
            resultBuffer,
            resultId,
            overlayMode
          );
          if (retryResult) {
            groveUri = retryResult.groveUri;
            groveUrl = retryResult.groveUrl;
          }
        }
      }
    } catch (error) {
      logger.error("Failed to store image in Grove", {
        error: error instanceof Error ? error.message : String(error),
        walletAddress: walletAddress || "none",
      });
    }

    return { groveUri, groveUrl };
  }

  /**
   * Retry Grove upload for Farcaster requests
   */
  private async retryGroveUpload(
    resultBuffer: Buffer,
    resultId: string,
    overlayMode?: string
  ): Promise<{ groveUri: string; groveUrl: string } | null> {
    logger.info("Retrying Grove storage for Farcaster request");
    try {
      const retryFileName = `retry-${overlayMode || "generated"}-${resultId}.png`;
      const retryResult = await uploadToGrove(resultBuffer, retryFileName);

      if (retryResult.uri && retryResult.gatewayUrl) {
        logger.info("Successfully stored image in Grove on retry", {
          groveUri: retryResult.uri,
          groveUrl: retryResult.gatewayUrl,
        });
        return { groveUri: retryResult.uri, groveUrl: retryResult.gatewayUrl };
      }
      return null;
    } catch (retryError) {
      logger.error("Failed to store image in Grove on retry", {
        error:
          retryError instanceof Error
            ? retryError.message
            : String(retryError),
      });
      return null;
    }
  }

  /**
   * Apply parent image context to parsed command
   */
  private applyParentImageContext(
    parsedCommand: ParsedCommand,
    parentImageUrl: string
  ): void {
    logger.info("Using parent image URL", { parentImageUrl });
    parsedCommand.baseImageUrl = parentImageUrl;

    if (!parsedCommand.useParentImage && parsedCommand.action !== "generate") {
      const hasDescriptivePrompt =
        parsedCommand.prompt && parsedCommand.prompt.length > 10;

      if (!hasDescriptivePrompt && parsedCommand.overlayMode) {
        parsedCommand.useParentImage = true;
        parsedCommand.action = "overlay";
        logger.info(
          "No descriptive prompt with overlay mode, applying to parent image",
          { overlayMode: parsedCommand.overlayMode }
        );
      } else if (!parsedCommand.overlayMode && !parsedCommand.text) {
        parsedCommand.overlayMode = "degenify";
        parsedCommand.useParentImage = true;
        parsedCommand.action = "overlay";
        logger.info(
          "No overlay mode specified with parent image, defaulting to degenify"
        );
      }
    }
  }

  /**
   * Resolve action when no parent image is provided
   */
  private resolveActionWithoutParent(
    parsedCommand: ParsedCommand,
    rawCommand: string
  ): void {
    if (
      parsedCommand.overlayMode &&
      parsedCommand.action !== "generate" &&
      parsedCommand.action !== "overlay"
    ) {
      const hasDescriptivePrompt =
        parsedCommand.prompt && parsedCommand.prompt.length > 10;

      if (hasDescriptivePrompt) {
        parsedCommand.action = "generate";
        logger.info(
          "Setting action to generate based on descriptive prompt with overlay",
          { overlayMode: parsedCommand.overlayMode, prompt: parsedCommand.prompt }
        );
      } else {
        parsedCommand.action = "generate";
        parsedCommand.prompt =
          DEFAULT_OVERLAY_PROMPTS[parsedCommand.overlayMode] ||
          "a simple background";
        logger.info(
          "Setting action to generate with default prompt for overlay",
          { overlayMode: parsedCommand.overlayMode, defaultPrompt: parsedCommand.prompt }
        );
      }
    }

    if (
      parsedCommand.action === "generate" &&
      (!parsedCommand.prompt || parsedCommand.prompt.length < 3)
    ) {
      const promptMatch = rawCommand.match(
        /^(?:generate|create|make|draw)\s+(?:a|an)?\s*(?:image|picture|photo)?\s*(?:of|with)?\s*(.*)/i
      );
      if (promptMatch && promptMatch[1]) {
        parsedCommand.prompt = promptMatch[1].trim();
      } else {
        parsedCommand.prompt = rawCommand
          .replace(/^(generate|create|make|draw)\s+/i, "")
          .replace(/^(a|an)\s+(image|picture|photo)\s+of\s+/i, "")
          .trim();
      }

      logger.info("Extracted prompt for generation command", {
        prompt: parsedCommand.prompt,
      });
    }
  }
}
