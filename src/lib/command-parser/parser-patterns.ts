/**
 * Parser regex patterns — pure data module.
 *
 * Extracted from base-parser.ts per Core Principles (MODULAR + ORGANIZED):
 * patterns are data, the parser class is logic. Class fields in
 * `BaseCommandParser` re-export these via `protected readonly X = X` so
 * subclasses (`FarcasterCommandParser`, `AgentCommandParser`) keep using
 * `this.X` without any call-site churn.
 *
 * Flags preserved verbatim from the original literals. The `g` flag on
 * CONTROL_INSTRUCTION_PATTERNS is intentional: callers invoke
 * `String.prototype.replace(regex, "")`, which is non-stateful and treats
 * the regex as a one-shot replacement regardless of `g`. Do not strip
 * `g` without auditing every call site that mutates `lastIndex`.
 */

/** Matches an HTTP(S) URL anywhere in the input. */
export const URL_PATTERN = /https?:\/\/[^\s]+/;

/** Matches commands like "apply X", "use X", "with X" for overlay keywords. */
export const OVERLAY_PATTERNS = [
  /apply\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)/i,
  /use\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)/i,
  /with\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)/i,
];

/** Matches numeric x,y position controls (e.g. "position 10,20"). */
export const POSITION_PATTERNS = [
  /position\s+(?:at|to)?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i,
  /move\s+(?:to)?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i,
  /place\s+(?:at)?\s*(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/i,
];

/** Matches scale/size controls (capture group 1 = numeric). */
export const SCALE_PATTERNS = [
  /scale\s+(?:to|by)?\s*(-?\d+\.?\d*)/i,
  /resize\s+(?:to|by)?\s*(-?\d+\.?\d*)/i,
  /size\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
];

/** Matches overlay color controls (capture group 1 = named color). */
export const COLOR_PATTERNS = [
  /color\s+(?:to|of)?\s*([a-z]+)/i,
  /set\s+color\s+(?:to|of)?\s*([a-z]+)/i,
];

/** Matches opacity/alpha/transparency controls. */
export const OPACITY_PATTERNS = [
  /opacity\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
  /alpha\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
  /transparent\s+(?:to|of)?\s*(-?\d+\.?\d*)/i,
];

/** Matches explicit generation verbs; capture group 1 = prompt remainder. */
export const GENERATE_PATTERNS = [
  /generate\s+(?:an?\s+image\s+(?:of|with))?\s*(.*)/i,
  /create\s+(?:an?\s+image\s+(?:of|with))?\s*(.*)/i,
  /make\s+(?:an?\s+image\s+(?:of|with))?\s*(.*)/i,
];

/** Matches "this image", "parent image", and overlay+this patterns. */
export const PARENT_IMAGE_PATTERNS = [
  /overlay\s+(?:on|to|onto)\s+(?:this|parent|above|previous)\s+image/i,
  /apply\s+(?:to|on|onto)\s+(?:this|parent|above|previous)\s+image/i,
  /use\s+(?:this|parent|above|previous)\s+image/i,
  /(?:this|parent|above|previous)\s+image/i,
  /overlay\s+this/i,
  /apply\s+to\s+this/i,
  /this\s+photo/i,
  /this\s+picture/i,
  /this\s+cast/i,
  /this\s+one/i,
  /^(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)\s+this/i,
  /^(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)\.?\s*$/i,
  /add\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)\s+to\s+this/i,
  /put\s+(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)\s+on\s+this/i,
  /^(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)\s+it/i,
  /^(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)\s+the\s+image/i,
  /^(higherify|degenify|scrollify|lensify|higherise|dickbuttify|nikefy|nounify|baseify|clankerify|mantleify|ghiblify)/i,
];

/**
 * Control instructions stripped from the prompt during cleanPrompt().
 * `g` flag: callers use `String.replace()` which is non-stateful.
 */
export const CONTROL_INSTRUCTION_PATTERNS = [
  /scale\s+(?:to|by)?\s*-?\d+\.?\d*/gi,
  /resize\s+(?:to|by)?\s*-?\d+\.?\d*/gi,
  /size\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /position\s+(?:at|to)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi,
  /move\s+(?:to)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi,
  /place\s+(?:at)?\s*-?\d+\.?\d*[,\s]+-?\d+\.?\d*/gi,
  /color\s+(?:to|of)?\s*[a-z]+/gi,
  /set\s+color\s+(?:to|of)?\s*[a-z]+/gi,
  /opacity\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /alpha\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /transparent\s+(?:to|of)?\s*-?\d+\.?\d*/gi,
  /set\s+opacity\s+(?:to)?\s*-?\d+\.?\d*/gi,
  /overlay\s+(?:on|to|onto)\s+(?:this|parent|above|previous)\s+image/gi,
  /apply\s+(?:to|on|onto)\s+(?:this|parent|above|previous)\s+image/gi,
  /use\s+(?:this|parent|above|previous)\s+image/gi,
  /(?:this|parent|above|previous)\s+image/gi,
  /--text\s+"[^"]+"/gi,
  /--text\s+'[^']+'/gi,
  /--text\s+[^,\.\s][^,\.]+/gi,
  /--text-position\s+\w+/gi,
  /--text-size\s+\d+/gi,
  /--text-color\s+\w+/gi,
  /--text-style\s+\w+/gi,
  /--caption\s+"[^"]+"/gi,
  /--caption\s+'[^']*'/gi,
  /--caption\s+[^,\.\s][^,\.]+/gi,
  /--caption-position\s+\w+/gi,
  /--caption-size\s+\d+/gi,
  /--caption-color\s+\w+/gi,
  /--caption-style\s+\w+/gi,
  /--font-size\s+\d+/gi,
  /--font-color\s+\w+/gi,
  /--font-style\s+\w+/gi,
];

/** Matches --text / --caption content (capture group 1 = content). */
export const TEXT_PATTERNS = [
  /--text\s+"([^"]+)"/i,
  /--text\s+'([^']+)'/i,
  /--text\s+([^,\.]+)/i,
  /--caption\s+"([^"]+)"/i,
  /--caption\s+'([^']+)'/i,
  /--caption\s+([^,\.]+)/i,
];

/** Matches --text-position or --caption-position (capture group 1 = position). */
export const TEXT_POSITION_PATTERNS = [
  /--text-position\s+(\w+)/i,
  /--caption-position\s+(\w+)/i,
];

/** Matches --text-size / --font-size / --caption-size (capture group 1 = digits). */
export const TEXT_SIZE_PATTERNS = [
  /--text-size\s+(\d+)/i,
  /--font-size\s+(\d+)/i,
  /--caption-size\s+(\d+)/i,
];

/** Matches --text-color / --font-color / --caption-color. */
export const TEXT_COLOR_PATTERNS = [
  /--text-color\s+(\w+)/i,
  /--font-color\s+(\w+)/i,
  /--caption-color\s+(\w+)/i,
];

/** Matches --text-style / --font-style / --caption-style. */
export const TEXT_STYLE_PATTERNS = [
  /--text-style\s+(\w+)/i,
  /--font-style\s+(\w+)/i,
  /--caption-style\s+(\w+)/i,
];

/** Structured section markers (capture group 1 = section body). */
export const PROMPT_SECTION_PATTERN =
  /\[PROMPT\]:\s*(.*?)(?=\[OVERLAY\]|\[TEXT\]|$)/i;
export const OVERLAY_SECTION_PATTERN =
  /\[OVERLAY\]:\s*(.*?)(?=\[PROMPT\]|\[TEXT\]|$)/i;
export const TEXT_SECTION_PATTERN =
  /\[TEXT\]:\s*(.*?)(?=\[PROMPT\]|\[OVERLAY\]|$)/i;

/** Alternative flat markers (no brackets). */
export const PROMPT_ALT_PATTERN = /PROMPT:\s*(.*?)(?=OVERLAY:|TEXT:|$)/i;
export const OVERLAY_ALT_PATTERN = /OVERLAY:\s*(.*?)(?=PROMPT:|TEXT:|$)/i;
export const TEXT_ALT_PATTERN = /TEXT:\s*(.*?)(?=PROMPT:|OVERLAY:|$)/i;

/** Tertiary markers. */
export const CAPTION_PATTERN = /CAPTION:\s*(.*?)(?=PROMPT:|OVERLAY:|WOWOW:|$)/i;
export const WOWOW_PATTERN = /WOWOW:\s*(.*?)(?=PROMPT:|CAPTION:|TEXT:|$)/i;
