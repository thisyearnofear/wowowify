/**
 * TextRenderer — pure functional text overlay renderer.
 *
 * Extracted from src/lib/services/image-service.ts.
 *
 * Responsibility: take an already-composed image buffer + a ParsedCommand
 * with `text` metadata, return a NEW buffer with the text rasterized onto it.
 *
 * Scope: does NOT touch navigation/canvas math, color overlay, image overlay,
 * base64 marshaling, or Venice API. Does NOT mutate any external canvas — the
 * caller owns preview generation.
 *
 * The conditional `if (parsedCommand.text?.content)` lives in the caller
 * (OverlayComposer). This module is invoked only when text needs to be drawn.
 */

import type { ParsedCommand } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { addTextToImage } from "@/lib/image-processor";

/**
 * Map ParsedCommand.text.position to (x, y) anchor keywords understood by
 * the canvas-based text renderer inside @/lib/image-processor.
 *
 * Returned x/y are passed through to addTextToImage, which interprets
 * 'left' | 'right' | 'center' | 'top' | 'bottom' semantics.
 */
export interface TextLayout {
  x: number | "center" | "left" | "right";
  y: number | "center" | "top" | "bottom";
  fontSize: number;
  fontFamily: string;
  fontWeight: string;
  color: string;
  align: "center" | "left" | "right";
  backgroundColor: string | undefined;
  padding: number;
  maxWidth: number;
  lineHeight: number;
}

/**
 * Resolve layout coordinates from ParsedCommand.text.position.
 * Exported for unit testing.
 */
export function resolveLayout(text: NonNullable<ParsedCommand["text"]>): TextLayout {
  const fontSize = text.fontSize || 48;
  const color = text.color || "white";

  // Position mapping — defaults to bottom-center
  let x: TextLayout["x"] = "center";
  let y: TextLayout["y"] = "bottom";
  if (text.position) {
    const pos = text.position.toLowerCase();
    if (pos === "top-left") {
      x = "left";
      y = "top";
    } else if (pos === "top-right") {
      x = "right";
      y = "top";
    } else if (pos === "bottom-left") {
      x = "left";
      y = "bottom";
    } else if (pos === "bottom-right") {
      x = "right";
      y = "bottom";
    } else if (pos === "left" || pos === "right") {
      x = pos;
      y = "center";
    } else if (pos === "top" || pos === "bottom" || pos === "center") {
      y = pos;
    }
  }

  // Style mapping — preset fontFamily / fontWeight by alias.
  let fontFamily = "Roboto, sans-serif";
  let fontWeight = "normal";
  if (text.style) {
    const style = text.style.toLowerCase();
    switch (style) {
      case "serif":
        fontFamily = "serif";
        break;
      case "monospace":
      case "mono":
        fontFamily = "RobotoMono, monospace";
        break;
      case "handwriting":
      case "script":
        fontFamily = "Roboto, sans-serif";
        fontWeight = "normal";
        break;
      case "thin":
        fontWeight = "normal";
        break;
      case "bold":
        fontWeight = "bold";
        break;
    }
  }

  return {
    x,
    y,
    fontSize,
    fontFamily,
    fontWeight,
    color,
    align: "center",
    backgroundColor: text.backgroundColor,
    padding: 10,
    maxWidth: 800,
    lineHeight: 1.2,
  };
}

/**
 * Render text onto an existing image buffer.
 *
 * Returns a NEW buffer with the text rasterized. Pure: no canvas mutation,
 * no global state, no env-var reads (text rendering is CPU-only and doesn't
 * hit the network).
 *
 * Caller owns:
 *   - The conditional `if (parsedCommand.text?.content)` guard.
 *   - Re-rasterizing a scaled preview from the returned buffer (OverlayComposer).
 */
export async function renderText(
  imageBuffer: Buffer,
  parsedCommand: ParsedCommand,
): Promise<Buffer> {
  if (!parsedCommand.text?.content) {
    return imageBuffer;
  }
  // Hallucinating an unbounded narrowing for layouts and downstream options.
  const text: NonNullable<ParsedCommand["text"]> = parsedCommand.text;
  const layout = resolveLayout(text);

  // text.content is guaranteed by the early-return above; the runtime invariant
  // is enforced by !text?.content, so the `!` here is safe and documented.
  const textContent = text.content!;

  logger.info("Adding text to image", {
    text: textContent,
    position: text.position,
    fontSize: layout.fontSize,
    color: layout.color,
    style: text.style,
  });

  return addTextToImage(imageBuffer, textContent, {
    x: layout.x,
    y: layout.y,
    fontSize: layout.fontSize,
    fontFamily: layout.fontFamily,
    fontWeight: layout.fontWeight,
    color: layout.color,
    strokeColor: undefined,
    strokeWidth: 0,
    shadow: undefined,
    backgroundColor: layout.backgroundColor ?? undefined,
    padding: layout.padding,
    maxWidth: layout.maxWidth,
    lineHeight: layout.lineHeight,
    align: layout.align,
  });
}
