/**
 * Canonical environment & URL configuration — SINGLE SOURCE OF TRUTH.
 *
 * Replaces the scattered `process.env.NEXT_PUBLIC_APP_URL || "..."` patterns
 * that had drifted across files between `wowowify.vercel.app` and
 * `wowowifyer.vercel.app`. Every module that needs the canonical URL MUST
 * import from here instead of reading the env var directly.
 *
 * Adding a new URL pattern? Add it here, then re-export through this module.
 * Do not inline `https://wowowify...` anywhere else in the codebase.
 */

/**
 * Canonical production hostname — used for absolute URLs in OG tags,
 * Farcaster mini-app embeds, connect-kit metadata, frame redirects, etc.
 *
 * Reads NEXT_PUBLIC_APP_URL at build/runtime; falls back to the canonical
 * production host when unset (dev, preview deploys, unconfigured env).
 */
export const APP_URL: string =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://wowowify.vercel.app";

/** Convenience for template-literal usage, e.g. `${appUrl}/frames` */
export const appUrl = APP_URL;

/** Origin only — no trailing slash, no path. Safe for CSP headers. */
export const APP_ORIGIN: string = (() => {
  try {
    return new URL(APP_URL).origin;
  } catch {
    return "https://wowowify.vercel.app";
  }
})();

/** Canonical app icon path — used in ConnectKit + frame manifests */
export const APP_ICON_PATH = "/wowwowowify.png";

/** Resolves to an absolute URL pointing at the app icon */
export const APP_ICON_URL = `${APP_URL}${APP_ICON_PATH}`;

/** Whether the current runtime is local development (NODE_ENV !== 'production') */
export const IS_PRODUCTION = process.env.NODE_ENV === "production";

/** Whether the current runtime is local development (true on localhost / non-prod) */
export const IS_DEVELOPMENT = !IS_PRODUCTION;
