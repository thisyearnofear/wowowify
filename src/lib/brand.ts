/**
 * Canonical product & portfolio naming — single source of truth.
 *
 * Wowowify is the Persidian agent for brand-exact, multi-format campaign kits.
 * "wowowify" is both the product name and the compositing verb.
 * Farcaster integration is deferred until ASP is live on a custom domain.
 */

export const BRAND = {
  product: "Wowowify",
  portfolio: "Persidian",
  verb: "wowowify",
  /** Hero line — Brand Kit v1 is the product, not generic image gen. */
  headline: "Brand Kit v1 — upload once, ship everywhere.",
  tagline:
    "Save your logo, placement, copy, and formats as a Brand Kit. Every Studio session and agent call returns brand-exact campaign assets — never redrawn, never hallucinated.",
  audience:
    "Crypto launch teams, OKX agent builders, and marketing orchestrators who need compliant creative at API speed.",
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
