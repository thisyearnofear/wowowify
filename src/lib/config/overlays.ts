/**
 * Shared overlay configuration — single source of truth
 * Replaces scattered OverlayMode type, URL maps, and keyword lists
 */

// --- Overlay Mode Type (was in ImageOverlay.tsx, imported by server code) ---

export type OverlayMode =
  | "degenify"
  | "higherify"
  | "wowowify"
  | "scrollify"
  | "lensify"
  | "higherise"
  | "dickbuttify"
  | "nikefy"
  | "nounify"
  | "baseify"
  | "clankerify"
  | "mantleify"
  | "ghiblify";

// All overlay keywords for regex matching / validation
// Note: "wowowify" is in the OverlayMode type but is the default/no-overlay mode,
// not an actual overlay — it has no overlay image. It should NOT be in this list
// for validation purposes (passing "wowowify" as an overlay mode is valid but
// simply means "no overlay applied").
export const OVERLAY_KEYWORDS: readonly string[] = [
  "higherify",
  "degenify",
  "scrollify",
  "lensify",
  "higherise",
  "dickbuttify",
  "nikefy",
  "nounify",
  "baseify",
  "clankerify",
  "mantleify",
  "ghiblify",
] as const;

// Overlays that have preset PNG assets (used by web UI)
export const PRESET_OVERLAY_MODES: readonly OverlayMode[] = [
  "degenify",
  "higherify",
  "scrollify",
  "baseify",
] as const;

// Overlays that are AI-based transformations (no static PNG)
export const AI_TRANSFORM_MODES: readonly OverlayMode[] = ["ghiblify"] as const;

// --- Overlay URL Configuration ---

const BASE_URL =
  process.env.NODE_ENV === "production"
    ? "https://wowowifyer.vercel.app"
    : "";

export const OVERLAY_URLS: Record<string, string> = {
  degenify: `${BASE_URL}/degen/degenify.png`,
  higherify: `${BASE_URL}/higher/arrows/Arrow-png-white.png`,
  scrollify: `${BASE_URL}/scroll/scrollify.png`,
  lensify: `${BASE_URL}/lens/lensify.png`,
  higherise: `${BASE_URL}/higher/mantra/higherise.png`,
  dickbuttify: `${BASE_URL}/dickbutt/dickbuttify.png`,
  nikefy: `${BASE_URL}/nike/nikefy.png`,
  nounify: `${BASE_URL}/nouns/nounify.png`,
  baseify: `${BASE_URL}/base/baseify.png`,
  clankerify: `${BASE_URL}/clanker/clankerify.png`,
  mantleify: `${BASE_URL}/mantle/mantleify.png`,
};

// Preset paths for client-side loading (relative to public/)
export const PRESET_OVERLAY_PATHS: Record<string, string> = {
  degenify: "/degen/degenify.png",
  higherify: "/higher/arrows/Arrow-png-white.png",
  scrollify: "/scroll/scrollify.png",
  baseify: "/base/baseify.png",
};

// Default prompts when no image/prompt is provided per overlay mode
export const DEFAULT_OVERLAY_PROMPTS: Record<string, string> = {
  higherify: "a mountain landscape with clear sky",
  degenify: "a colorful abstract pattern",
  scrollify: "a minimalist tech background",
  lensify: "a professional photography background",
  baseify: "a blockchain themed background",
  dickbuttify: "a meme-worthy background",
  mantleify: "a digital landscape with mountains",
  ghiblify: "a serene natural landscape",
};

// Color theme per overlay mode (for UI styling)
export const OVERLAY_COLORS: Record<
  string,
  { bg: string; text: string; hover: string; active: string }
> = {
  degenify: {
    bg: "bg-violet-50",
    text: "text-violet-700",
    hover: "hover:bg-violet-100",
    active: "bg-violet-100 text-violet-800",
  },
  higherify: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    hover: "hover:bg-emerald-100",
    active: "bg-emerald-100 text-emerald-800",
  },
  scrollify: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    hover: "hover:bg-amber-100",
    active: "bg-amber-100 text-amber-800",
  },
  baseify: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    hover: "hover:bg-blue-100",
    active: "bg-blue-100 text-blue-800",
  },
  ghiblify: {
    bg: "bg-pink-50",
    text: "text-pink-700",
    hover: "hover:bg-pink-100",
    active: "bg-pink-100 text-pink-800",
  },
  lensify: {
    bg: "bg-cyan-50",
    text: "text-cyan-700",
    hover: "hover:bg-cyan-100",
    active: "bg-cyan-100 text-cyan-800",
  },
  higherise: {
    bg: "bg-green-50",
    text: "text-green-700",
    hover: "hover:bg-green-100",
    active: "bg-green-100 text-green-800",
  },
  dickbuttify: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    hover: "hover:bg-orange-100",
    active: "bg-orange-100 text-orange-800",
  },
  nikefy: {
    bg: "bg-red-50",
    text: "text-red-700",
    hover: "hover:bg-red-100",
    active: "bg-red-100 text-red-800",
  },
  nounify: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    hover: "hover:bg-yellow-100",
    active: "bg-yellow-100 text-yellow-800",
  },
  clankerify: {
    bg: "bg-indigo-50",
    text: "text-indigo-700",
    hover: "hover:bg-indigo-100",
    active: "bg-indigo-100 text-indigo-800",
  },
  mantleify: {
    bg: "bg-fuchsia-50",
    text: "text-fuchsia-700",
    hover: "hover:bg-fuchsia-100",
    active: "bg-fuchsia-100 text-fuchsia-800",
  },
  wowowify: {
    bg: "bg-gray-50",
    text: "text-gray-700",
    hover: "hover:bg-gray-100",
    active: "bg-gray-100 text-gray-800",
  },
};
