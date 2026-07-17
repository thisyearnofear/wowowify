/**
 * Canonical product & portfolio naming — single source of truth.
 *
 * Wowowify is the Persidian agent for brand-safe campaign creative.
 * "wowowify" is both the product name and the compositing verb.
 * Farcaster integration is deferred until ASP is live on a custom domain.
 */

export const BRAND = {
  product: "Wowowify",
  portfolio: "Persidian",
  verb: "wowowify",
  tagline:
    "Generate the scene. Wowowify your exact mark and copy — never redrawn, never hallucinated.",
  headline: "AI art that keeps your logo exact.",
  audience:
    "Enterprise teams and agent builders shipping launch creative on Persidian.",
  /** Target production hosts (set via env until DNS is wired). */
  urls: {
    studio: "https://wowowify.persidian.com",
    asp: "https://api.wowowify.persidian.com",
    portfolio: "https://persidian.com",
  },
  /** Vercel fallbacks while custom domains propagate. */
  vercel: {
    studio: "https://wowowify.vercel.app",
    asp: "https://wowowify-asp.vercel.app",
  },
} as const;

export const PRODUCT_NAME = BRAND.product;
export const PORTFOLIO_NAME = BRAND.portfolio;
