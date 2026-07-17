import { BRAND } from "@/lib/brand";

/** Canonical user-facing Studio vocabulary — single source of truth. */
export const STUDIO_COPY = {
  name: BRAND.product,
  headline: BRAND.headline,
  tagline: BRAND.tagline,
  audience: BRAND.audience,
  portfolioLine: `Part of ${BRAND.portfolio}`,
  steps: {
    brief: "Brief",
    brand: "Wowowify",
    refine: "Refine",
    export: "Export",
  },
  paths: {
    title: "Two ways in",
    studio: {
      label: "Studio",
      hint: "Upload a brief and logo — wowowify, refine, and export.",
      cta: "Open Studio",
    },
    agent: {
      label: "Agent API",
      hint: "Your agent calls the same pipeline — hands humans a review link.",
      cta: "Open Command",
    },
    farcaster: {
      label: "Farcaster",
      hint: "Social distribution — coming after ASP launch on Persidian.",
      cta: "Coming soon",
    },
  },
  draft: {
    bannerTitle: "Review draft from your agent",
    bannerBody:
      "An agent wowowified this campaign for your approval. Adjust copy and placement, then export or share the Studio link.",
  },
  brief: {
    uploadVisual: "Upload visual",
    writeBrief: "Write brief",
    placeholder: "Describe your campaign brief…",
    hint: "Start with a photo or describe the scene — you'll wowowify your exact logo next.",
  },
  brand: {
    title: "Wowowify your mark",
    uploadLogo: "Upload your logo",
    logoHint: "Your exact logo is composited — never redrawn by AI.",
    communityStarters: "Community starters",
    communityHint: "Quick-start presets for crypto-native campaigns.",
  },
  refine: {
    campaignCopy: "Campaign copy",
    captionPlaceholder: "Headline or caption…",
    outputFormats: "Output formats",
    formatsHint: "Export multiple crops from the same composition.",
  },
  export: {
    action: "Export",
    saving: "Exporting…",
    shareHint: "Share the Studio URL so teammates can refine this draft.",
    successHint: "Wowowified — your logo was composited, not redrawn.",
  },
  brandKit: {
    load: "Load brand kit",
    save: "Save brand kit",
    namePlaceholder: "Kit name (e.g. Demo Launch)",
    empty: "No saved brand kits yet.",
    saved: "Brand kit saved.",
    loaded: "Brand kit loaded.",
  },
  nav: {
    studio: "Studio",
    command: "Command",
    campaigns: "Campaigns",
    miniApp: "Farcaster",
  },
  command: {
    title: "Command",
    subtitle: `Same brand-safe pipeline as ${BRAND.product} Studio — built for agents and technical users.`,
    preview: "Preview command",
    create: "Wowowify artwork",
    openStudio: "Open in Studio",
    resultTitle: "Campaign ready",
    shareReview: "Copy review link",
    shareReviewHint:
      "Send this link to a human approver — every agent run can end in Studio.",
    copied: "Link copied",
  },
  builder: {
    title: "For agent builders",
    discovery: "Agent discovery",
    service: "Service endpoint",
    register: "Register on OKX ASP",
    registerHint: `List ${BRAND.product} as A2MCP on Persidian — discovery + POST /api/agent.`,
    docs: "Deployment docs",
  },
  footer: {
    tagline: `${BRAND.product} — brand-safe creative on ${BRAND.portfolio}.`,
  },
  admin: {
    title: "Recent campaigns",
    subtitle: "Latest wowowified artwork from Studio and agents.",
    signIn: "Sign in to view campaigns",
  },
} as const;

/** Default public ASP host — used when NEXT_PUBLIC_ASP_URL is unset. */
export const DEFAULT_ASP_PUBLIC_URL = BRAND.vercel.asp;
