/**
 * CommandHeuristics — pure helpers that mutate ParsedCommand in-place to
 * decide between "apply overlay to parent image" vs "generate a fresh image
 * with the overlay".
 *
 * Extracted from src/lib/services/command-router.ts to drop that module below
 * the 250-LOC budget. Pure functions — no class wrapper, no module-level
 * state, no env reads, no canvas work.
 *
 * Mutation semantics: these helpers intentionally MUTATE the passed-in
 * ParsedCommand. This matches the established pattern in the codebase
 * (parsers already mutate ParsedCommand rows during construction).
 * Call sites assign a fresh parser output, then run these helpers, then
 * return the resulting object — read-only callers can clone first if needed.
 */

import type { ParsedCommand } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import { DEFAULT_OVERLAY_PROMPTS } from "@/lib/config/overlays";

/**
 * Heuristic: a parent cast image was provided, so this is almost certainly an
 * "apply the overlay to the parent image" workflow — unless the user gave a
 * descriptive generation prompt that overrides implicit behavior.
 */
export function applyParentImageContext(
  parsedCommand: ParsedCommand,
  parentImageUrl: string,
): void {
  logger.info("Using parent image URL", { parentImageUrl });
  parsedCommand.baseImageUrl = parentImageUrl;

  if (parsedCommand.useParentImage || parsedCommand.action === "generate") {
    return;
  }

  const hasDescriptivePrompt =
    parsedCommand.prompt && parsedCommand.prompt.length > 10;

  if (!hasDescriptivePrompt && parsedCommand.overlayMode) {
    parsedCommand.useParentImage = true;
    parsedCommand.action = "overlay";
    logger.info(
      "No descriptive prompt with overlay mode, applying to parent image",
      { overlayMode: parsedCommand.overlayMode },
    );
  } else if (!parsedCommand.overlayMode && !parsedCommand.text) {
    parsedCommand.overlayMode = "degenify";
    parsedCommand.useParentImage = true;
    parsedCommand.action = "overlay";
    logger.info(
      "No overlay mode specified with parent image, defaulting to degenify",
    );
  }
}

/**
 * Heuristic: no parent image, so this is almost certainly a "generate fresh"
 * workflow — fall back to the overlay's default prompt if the user only
 * named an overlay style.
 */
export function resolveActionWithoutParent(
  parsedCommand: ParsedCommand,
  rawCommand: string,
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
        {
          overlayMode: parsedCommand.overlayMode,
          prompt: parsedCommand.prompt,
        },
      );
    } else {
      parsedCommand.action = "generate";
      parsedCommand.prompt =
        DEFAULT_OVERLAY_PROMPTS[parsedCommand.overlayMode] ||
        "a simple background";
      logger.info(
        "Setting action to generate with default prompt for overlay",
        {
          overlayMode: parsedCommand.overlayMode,
          defaultPrompt: parsedCommand.prompt,
        },
      );
    }
  }

  if (
    parsedCommand.action === "generate" &&
    (!parsedCommand.prompt || parsedCommand.prompt.length < 3)
  ) {
    const promptMatch = rawCommand.match(
      /^(?:generate|create|make|draw)\s+(?:a|an)?\s*(?:image|picture|photo)?\s*(?:of|with)?\s*(.*)/i,
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
