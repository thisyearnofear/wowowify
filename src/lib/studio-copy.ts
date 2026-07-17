/** Canonical user-facing Studio vocabulary — single source of truth. */
export const STUDIO_COPY = {
  name: "@toka Studio",
  tagline: "Turn your logo and brief into ready-to-post artwork.",
  steps: {
    brief: "Brief",
    brand: "Brand",
    refine: "Refine",
    export: "Export",
  },
  brief: {
    uploadVisual: "Upload visual",
    writeBrief: "Write brief",
    placeholder: "Describe your campaign brief…",
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
  },
  brandKit: {
    load: "Load brand kit",
    save: "Save brand kit",
    namePlaceholder: "Kit name (e.g. Lisk Launch)",
    empty: "No saved brand kits yet.",
    saved: "Brand kit saved.",
    loaded: "Brand kit loaded.",
  },
  command: {
    title: "Command",
    subtitle: "Create brand-safe artwork via natural language or structured fields.",
    preview: "Preview command",
    create: "Create artwork",
    openStudio: "Open in Studio",
  },
} as const;
