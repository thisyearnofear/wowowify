import { BRAND } from "@/lib/brand";

/** Canonical user-facing Studio vocabulary — single source of truth. */
export const STUDIO_COPY = {
  name: BRAND.product,
  headline: BRAND.headline,
  tagline: BRAND.tagline,
  audience: BRAND.audience,
  portfolioLine: `Part of ${BRAND.portfolio}`,
  steps: {
    kit: "Brand Kit",
    brief: "Brief",
    brand: "Wowowify",
    refine: "Refine",
    export: "Export",
  },
  brandKitV1: {
    badge: "Brand Kit v1",
    headline: "Upload once. Every call returns on-brand kits.",
    promise:
      "ChatGPT can paint a picture. Wowowify ships publication-ready campaign kits with your exact mark — composited, multi-format, and agent-callable.",
    pillars: [
      {
        title: "Brand-exact",
        body: "Your real logo file, composited pixel-for-pixel. AI never redraws your mark.",
      },
      {
        title: "Multi-format",
        body: "One brief → square, landscape, and portrait crops from the same composition.",
      },
      {
        title: "Agent-callable",
        body: "Pass brandKitId to POST /api/agent. OKX agents and your launch pipeline share the same kit.",
      },
    ],
    apiLine:
      "Agents: POST /api/agent with parameters.brandKitId — demo kit demo-launch ships three formats.",
    complianceLine:
      "Optional provenance receipt ties each asset to brief + kit + logo for audit trails.",
    ctaStudio: "Load a kit below, then write your brief.",
    ctaAgent: "Start with a Brand Kit — manual logo fields are optional overrides.",
  },
  paths: {
    title: "Two ways in",
    studio: {
      label: "Studio",
      hint: "Load a Brand Kit, wowowify a brief, refine, and export every format.",
      cta: "Open Studio",
    },
    agent: {
      label: "Agent API",
      hint: "Same Brand Kit contract — agents pass brandKitId and get a review link.",
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
    title: "Brand Kit",
    subtitle: "Logo, placement, copy, and formats — reused on every run.",
    load: "Load brand kit",
    save: "Save brand kit",
    namePlaceholder: "Kit name (e.g. Q3 Launch)",
    empty: "No saved brand kits yet — save one after you refine placement.",
    saved: "Brand kit saved. Agents can call it by id.",
    loaded: "Brand kit loaded — logo and defaults applied.",
    demoHint: "Try Demo Launch to see a three-format kit in one call.",
  },
  nav: {
    studio: "Studio",
    command: "Command",
    campaigns: "Campaigns",
    miniApp: "Farcaster",
  },
  command: {
    title: "Command",
    subtitle:
      "Brand Kit v1 for agents — pass brandKitId, get multi-format kits and a Studio review link.",
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
    tagline: `${BRAND.product} Brand Kit v1 — brand-exact campaign production on ${BRAND.portfolio}.`,
  },
  admin: {
    title: "Recent campaigns",
    subtitle: "Latest wowowified artwork from Studio and agents.",
    signIn: "Sign in to view campaigns",
  },
} as const;

/** Default public ASP host — used when NEXT_PUBLIC_ASP_URL is unset. */
export const DEFAULT_ASP_PUBLIC_URL = BRAND.vercel.asp;
