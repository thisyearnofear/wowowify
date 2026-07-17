/** Canonical user-facing Studio vocabulary — single source of truth. */
export const STUDIO_COPY = {
  name: "@toka Studio",
  /** One-line problem → outcome (PG-style clarity). */
  headline: "AI art that keeps your logo exact.",
  tagline:
    "Generate the scene. We composite your real mark and copy — never redrawn, never hallucinated.",
  /** Who it's for — reduces “what is this?” friction. */
  audience:
    "For founders, community leads, and agent builders shipping launch creative.",
  steps: {
    brief: "Brief",
    brand: "Brand",
    refine: "Refine",
    export: "Export",
  },
  /** Three equal entry paths — distribution built into the product (Thiel-style). */
  paths: {
    title: "Three ways in",
    studio: {
      label: "Studio",
      hint: "You have a logo and a brief — refine and export here.",
      cta: "Start in Studio",
    },
    agent: {
      label: "Agent API",
      hint: "Your bot calls the same pipeline — hands humans a review link.",
      cta: "Try Command",
    },
    farcaster: {
      label: "Farcaster",
      hint: "Mention @toka or open the Mini App from a cast.",
      cta: "Open Mini App",
    },
  },
  draft: {
    bannerTitle: "Review draft from your agent",
    bannerBody:
      "An agent created this campaign for your approval. Adjust copy and placement, then export or share the Studio link.",
  },
  brief: {
    uploadVisual: "Upload visual",
    writeBrief: "Write brief",
    placeholder: "Describe your campaign brief…",
    hint: "Start with a photo or describe the scene — you'll add your exact logo next.",
  },
  brand: {
    title: "Brand mark",
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
    miniApp: "Mini App",
  },
  command: {
    title: "Command",
    subtitle:
      "Same brand-safe pipeline as Studio — built for agents and technical users.",
    preview: "Preview command",
    create: "Create artwork",
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
    registerHint: "List @toka as A2MCP — discovery + POST /api/agent.",
    docs: "Deployment docs",
  },
  footer: {
    tagline: "Brand-safe creative layer for agents and teams.",
  },
  admin: {
    title: "Recent campaigns",
    subtitle: "Latest composed artwork from Studio and agents.",
    signIn: "Sign in to view campaigns",
  },
} as const;

/** Default public ASP host — used when NEXT_PUBLIC_ASP_URL is unset. */
export const DEFAULT_ASP_PUBLIC_URL = "https://wowowify-asp.vercel.app";
