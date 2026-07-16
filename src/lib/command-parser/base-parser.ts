import { ParsedCommand } from "../agent-types";
import { logger } from "../logger";
import { OverlayMode, OVERLAY_KEYWORDS } from "@/lib/config/overlays";
import {
  URL_PATTERN,
  OVERLAY_PATTERNS,
  POSITION_PATTERNS,
  SCALE_PATTERNS,
  COLOR_PATTERNS,
  OPACITY_PATTERNS,
  GENERATE_PATTERNS,
  PARENT_IMAGE_PATTERNS,
  CONTROL_INSTRUCTION_PATTERNS,
  TEXT_PATTERNS,
  TEXT_POSITION_PATTERNS,
  TEXT_SIZE_PATTERNS,
  TEXT_COLOR_PATTERNS,
  TEXT_STYLE_PATTERNS,
  PROMPT_SECTION_PATTERN,
  OVERLAY_SECTION_PATTERN,
  TEXT_SECTION_PATTERN,
  PROMPT_ALT_PATTERN,
  OVERLAY_ALT_PATTERN,
  TEXT_ALT_PATTERN,
  CAPTION_PATTERN,
  WOWOW_PATTERN,
} from "./parser-patterns";

/**
 * Base class for command parsers.
 *
 * Provides common parse logic used by `FarcasterCommandParser` and
 * `AgentCommandParser`. Regex payloads themselves live in
 * `./parser-patterns` (data-only module per MODULAR + ORGANIZED); this
 * class re-exports each as a `protected readonly` field so subclass
 * `this.X` access continues to compile unchanged.
 */
export class BaseCommandParser {
  protected readonly URL_PATTERN = URL_PATTERN;
  protected readonly OVERLAY_PATTERNS = OVERLAY_PATTERNS;
  protected readonly POSITION_PATTERNS = POSITION_PATTERNS;
  protected readonly SCALE_PATTERNS = SCALE_PATTERNS;
  protected readonly COLOR_PATTERNS = COLOR_PATTERNS;
  protected readonly OPACITY_PATTERNS = OPACITY_PATTERNS;
  protected readonly GENERATE_PATTERNS = GENERATE_PATTERNS;
  protected readonly PARENT_IMAGE_PATTERNS = PARENT_IMAGE_PATTERNS;
  protected readonly CONTROL_INSTRUCTION_PATTERNS = CONTROL_INSTRUCTION_PATTERNS;
  protected readonly TEXT_PATTERNS = TEXT_PATTERNS;
  protected readonly TEXT_POSITION_PATTERNS = TEXT_POSITION_PATTERNS;
  protected readonly TEXT_SIZE_PATTERNS = TEXT_SIZE_PATTERNS;
  protected readonly TEXT_COLOR_PATTERNS = TEXT_COLOR_PATTERNS;
  protected readonly TEXT_STYLE_PATTERNS = TEXT_STYLE_PATTERNS;
  protected readonly PROMPT_SECTION_PATTERN = PROMPT_SECTION_PATTERN;
  protected readonly OVERLAY_SECTION_PATTERN = OVERLAY_SECTION_PATTERN;
  protected readonly TEXT_SECTION_PATTERN = TEXT_SECTION_PATTERN;
  protected readonly PROMPT_ALT_PATTERN = PROMPT_ALT_PATTERN;
  protected readonly OVERLAY_ALT_PATTERN = OVERLAY_ALT_PATTERN;
  protected readonly TEXT_ALT_PATTERN = TEXT_ALT_PATTERN;
  protected readonly CAPTION_PATTERN = CAPTION_PATTERN;
  protected readonly WOWOW_PATTERN = WOWOW_PATTERN;

  protected overlayKeywords = [...OVERLAY_KEYWORDS];

  /**
   * Parse a command string into a structured ParsedCommand object
   * This is the main method that should be called by clients
   */
  public parse(input: string): ParsedCommand {
    // Initialize with default values
    const result: ParsedCommand = {
      action: "generate",
      prompt: "",
    };

    // Perform the actual parsing
    this.parseInternal(input, result);

    // Log the result
    logger.info(
      `Parsed command: action=${result.action}, overlayMode=${
        result.overlayMode || "none"
      }, hasText=${result.text ? "yes" : "no"}, useParentImage=${
        result.useParentImage ? "yes" : "no"
      }`
    );

    return result;
  }

  /**
   * Internal parsing method to be implemented by subclasses
   * This allows specialized parsers to customize the parsing logic
   */
  protected parseInternal(input: string, result: ParsedCommand): void {
    // Base implementation - should be overridden by subclasses
    this.parseOverlayKeywords(input, result);
    this.parseControls(input, result);
    this.parseText(input, result);
    this.parsePrompt(input, result);
  }

  /**
   * Check if the command starts with an overlay keyword
   */
  protected parseOverlayKeywords(input: string, result: ParsedCommand): void {
    const lowerInput = input.toLowerCase().trim();

    // Check if the command starts with an overlay keyword
    for (const keyword of this.overlayKeywords) {
      if (lowerInput.startsWith(keyword)) {
        result.action = "overlay";
        result.useParentImage = true;
        result.overlayMode = keyword as OverlayMode;

        // Extract the prompt after the overlay keyword
        const promptAfterKeyword = input.substring(keyword.length).trim();
        if (promptAfterKeyword && promptAfterKeyword.length > 0) {
          // Store the original prompt before cleaning
          const originalPrompt = promptAfterKeyword;

          // Special case for "higherify a photograph of..." pattern
          const photoMatch = originalPrompt.match(
            /^a\s+photograph\s+of\s+(.+)/i
          );
          if (photoMatch && photoMatch[1]) {
            const photoDescription = photoMatch[1];
            // Extract scale if present
            const scaleMatch = photoDescription.match(
              /(.+?)(?:\.\s*scale\s+(?:to|by)?\s*(-?\d+\.?\d*))/i
            );

            if (scaleMatch) {
              // We have both a description and scale
              result.prompt = scaleMatch[1].trim();

              if (scaleMatch[2]) {
                if (!result.controls) result.controls = {};
                result.controls.scale = parseFloat(scaleMatch[2]);
                logger.info(
                  `Extracted scale from photo description: ${result.controls.scale}`
                );
              }
            } else {
              // Just the photo description
              result.prompt = photoDescription.trim();
            }

            logger.info(`Extracted photo description: "${result.prompt}"`);
          } else {
            // Clean the prompt by removing control instructions
            result.prompt = this.cleanPrompt(originalPrompt);

            // Special handling for scale and other controls
            const scaleMatch = originalPrompt.match(
              /scale\s+(?:to|by)?\s*(-?\d+\.?\d*)/i
            );
            if (scaleMatch && scaleMatch[1]) {
              if (!result.controls) result.controls = {};
              result.controls.scale = parseFloat(scaleMatch[1]);
              logger.info(
                `Extracted scale from prompt: ${result.controls.scale}`
              );
            }
          }

          logger.info(
            `Extracted prompt after overlay keyword: "${result.prompt}"`
          );
        }

        logger.info(
          `Command starts with overlay keyword: ${keyword}, will apply to parent image`
        );
        break;
      }
    }
  }

  /**
   * Parse control parameters (scale, position, color, opacity)
   */
  protected parseControls(input: string, result: ParsedCommand): void {
    // Extract position
    for (const pattern of this.POSITION_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1] && match[2]) {
        if (!result.controls) result.controls = {};
        result.controls.x = parseFloat(match[1]);
        result.controls.y = parseFloat(match[2]);
        break;
      }
    }

    // Extract scale if not already set
    if (!result.controls?.scale) {
      for (const pattern of this.SCALE_PATTERNS) {
        const match = input.match(pattern);
        if (match && match[1]) {
          if (!result.controls) result.controls = {};
          result.controls.scale = parseFloat(match[1]);
          break;
        }
      }
    }

    // Extract color
    for (const pattern of this.COLOR_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.overlayColor = match[1].toLowerCase();
        break;
      }
    }

    // Extract opacity
    for (const pattern of this.OPACITY_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        if (!result.controls) result.controls = {};
        result.controls.overlayAlpha = parseFloat(match[1]);
        break;
      }
    }
  }

  /**
   * Parse text parameters
   */
  protected parseText(input: string, result: ParsedCommand): void {
    // Extract text content
    let textContent: string | undefined;
    let textPosition: string | undefined;
    let textSize: number | undefined;
    let textColor: string | undefined;
    let textStyle: string | undefined;

    // First check for text content
    for (const pattern of this.TEXT_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        textContent = match[1].trim();
        logger.info(`Extracted text content: "${textContent}"`);
        break;
      }
    }

    // Extract text position
    for (const pattern of this.TEXT_POSITION_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        textPosition = match[1].toLowerCase();
        logger.info(`Extracted text position: ${textPosition}`);
        break;
      }
    }

    // Extract text size
    for (const pattern of this.TEXT_SIZE_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        textSize = parseInt(match[1], 10);
        logger.info(`Extracted text size: ${textSize}`);
        break;
      }
    }

    // Extract text color
    for (const pattern of this.TEXT_COLOR_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        textColor = match[1].toLowerCase();
        logger.info(`Extracted text color: ${textColor}`);
        break;
      }
    }

    // Extract text style
    for (const pattern of this.TEXT_STYLE_PATTERNS) {
      const match = input.match(pattern);
      if (match && match[1]) {
        textStyle = match[1].toLowerCase();
        logger.info(`Extracted text style: ${textStyle}`);
        break;
      }
    }

    // If we found any text parameters, add them to the result
    if (textContent || textPosition || textSize || textColor || textStyle) {
      // Create the text object if it doesn't exist
      if (!result.text) {
        result.text = {
          content: textContent || "Text", // Default text if none provided
        };
      } else {
        result.text.content = textContent || result.text.content || "Text";
      }

      if (textPosition) result.text.position = textPosition;
      if (textSize) result.text.fontSize = textSize;
      if (textColor) result.text.color = textColor;
      if (textStyle) result.text.style = textStyle;

      logger.info("Text parameters extracted", {
        content: result.text.content,
        position: textPosition,
        fontSize: textSize,
        color: textColor,
        style: textStyle,
      });
    }
  }

  /**
   * Parse the prompt from the command
   */
  protected parsePrompt(input: string, result: ParsedCommand): void {
    // If we already have a prompt from overlay keyword parsing, skip this
    if (result.prompt && result.prompt.length > 0) {
      return;
    }

    // Check for structured format with section markers
    let promptSection = input.match(this.PROMPT_SECTION_PATTERN)?.[1]?.trim();
    let overlaySection = input.match(this.OVERLAY_SECTION_PATTERN)?.[1]?.trim();
    let textSection = input.match(this.TEXT_SECTION_PATTERN)?.[1]?.trim();

    // Check alternative formats if section markers not found
    if (!promptSection && !overlaySection && !textSection) {
      promptSection = input.match(this.PROMPT_ALT_PATTERN)?.[1]?.trim();
      overlaySection = input.match(this.OVERLAY_ALT_PATTERN)?.[1]?.trim();
      textSection = input.match(this.TEXT_ALT_PATTERN)?.[1]?.trim();
    }

    // Check even more alternative formats
    if (!promptSection && !overlaySection && !textSection) {
      promptSection = input.match(this.WOWOW_PATTERN)?.[1]?.trim();
      textSection = input.match(this.CAPTION_PATTERN)?.[1]?.trim();
    }

    // Process prompt section
    if (promptSection) {
      // Extract URL if present
      const urlMatch = promptSection.match(this.URL_PATTERN);
      if (urlMatch) {
        result.baseImageUrl = urlMatch[0];
        // Remove URL from prompt
        promptSection = promptSection.replace(this.URL_PATTERN, "").trim();
      }

      // Check for parent image references in the prompt
      for (const pattern of this.PARENT_IMAGE_PATTERNS) {
        if (pattern.test(promptSection)) {
          result.useParentImage = true;
          result.action = "overlay";
          // Remove parent image reference from prompt
          promptSection = promptSection.replace(pattern, "").trim();
          break;
        }
      }

      // Extract generation command
      for (const pattern of this.GENERATE_PATTERNS) {
        const match = promptSection.match(pattern);
        if (match && match[1]) {
          result.prompt = this.cleanPrompt(match[1].trim());
          break;
        }
      }

      // If no generation command was found, use the cleaned prompt
      if (!result.prompt) {
        result.prompt = this.cleanPrompt(promptSection);
      }
    }
  }

  /**
   * Clean a prompt by removing overlay and control instructions
   */
  protected cleanPrompt(text: string): string {
    let cleanedText = text;

    // Remove overlay mode terms
    cleanedText = cleanedText
      .replace(
        /\b(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)\b/gi,
        ""
      )
      .replace(/\b(overlay|style|effect)\b/gi, "");

    // Remove control instructions
    for (const pattern of this.CONTROL_INSTRUCTION_PATTERNS) {
      cleanedText = cleanedText.replace(pattern, "");
    }

    // Remove text flag patterns more aggressively
    cleanedText = cleanedText
      .replace(/--text\s+"[^"]*"/g, "")
      .replace(/--text\s+'[^']*'/g, "")
      .replace(/--text\s+[^-\s][^-]*(?=\s|$)/g, "")
      .replace(/--text-\w+\s+[^-\s][^-]*(?=\s|$)/g, "")
      .replace(/--caption\s+"[^"]*"/g, "")
      .replace(/--caption\s+'[^']*'/g, "")
      .replace(/--caption\s+[^-\s][^-]*(?=\s|$)/g, "")
      .replace(/--caption-\w+\s+[^-\s][^-]*(?=\s|$)/g, "");

    // Clean up multiple spaces, dots, commas at the end
    cleanedText = cleanedText
      .replace(/\s{2,}/g, " ")
      .replace(/[.,\s]+$/, "")
      .trim();

    // If the cleaned text is too short, it might have been over-cleaned
    // In that case, try a more conservative cleaning approach
    if (cleanedText.length < 5 && text.length > 10) {
      // Only remove the scale and position parameters
      cleanedText = text
        .replace(/scale\s+(?:to|by)?\s*-?\d+\.?\d*/gi, "")
        .replace(/position\s+(?:at|to)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi, "")
        .replace(/\s{2,}/g, " ")
        .trim();
    }

    return cleanedText;
  }

  /**
   * Helper function to check if input contains a descriptive prompt beyond just the overlay command
   */
  protected hasDescriptivePrompt(
    input: string,
    overlayKeyword: string
  ): boolean {
    // Remove the overlay keyword and control parameters
    const cleanedInput = input
      .replace(new RegExp(overlayKeyword, "gi"), "")
      .replace(/scale\s+to\s+[\d\.]+/gi, "")
      .replace(/scale\s+[\d\.]+/gi, "")
      .replace(/position\s+at\s+[\d\.]+\s*,\s*[\d\.]+/gi, "")
      .replace(/position\s+[\d\.]+\s*,\s*[\d\.]+/gi, "")
      .replace(/opacity\s+to\s+[\d\.]+/gi, "")
      .replace(/opacity\s+[\d\.]+/gi, "")
      .replace(/color\s+to\s+\w+/gi, "")
      .replace(/color\s+\w+/gi, "")
      .trim();

    // If what remains is very short, there's no descriptive prompt
    return cleanedInput.length > 10;
  }
}
