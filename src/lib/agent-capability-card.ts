import { CAMPAIGN_FORMATS } from "@/lib/agent-types";
import { DEMO_LAUNCH_KIT_ID } from "@/lib/brand-kits-seed";
import {
  getEntitlementNetwork,
  getProvenanceNetwork,
  getX402Network,
} from "@/lib/commerce-config";
import { ASP_URL, STUDIO_URL } from "@/lib/deployment";
import { BRAND } from "@/lib/brand";

/** Public ASP / A2MCP capability card — shared by GET /api/agent and /.well-known/agent.json */
export function getAgentCapabilityCard(
  aspUrl: string = ASP_URL,
  studioUrl: string = STUDIO_URL,
) {
  return {
    schema: "wowowify/agent-capability/v1",
    name: `${BRAND.product} — brand-safe campaign creative`,
    version: "1.3.0",
    description:
      "Persidian agent that creates publication-ready creative from a campaign brief and an exact logo. AI generates the scene; Wowowify composes your mark.",
    protocol: "A2MCP",
    portfolio: BRAND.portfolio,
    deployment: {
      aspUrl,
      studioUrl,
      mode: process.env.TOKA_DEPLOYMENT || "all",
    },
    endpoints: {
      service: `${aspUrl}/api/agent`,
      parse: `${aspUrl}/api/agent/parse`,
      discovery: `${aspUrl}/.well-known/agent.json`,
      studio: studioUrl,
      brandKits: `${aspUrl}/api/brand-kits`,
      fetchImage: `${aspUrl}/api/fetch-image`,
      uploadLogo: `${aspUrl}/api/upload-logo`,
      drafts: `${aspUrl}/api/drafts/{id}`,
      provenance: `${aspUrl}/api/provenance`,
      entitlements: `${aspUrl}/api/entitlements`,
    },
    input: {
      command:
        "string — natural language campaign brief (optional if parameters supplied)",
      parameters: {
        logoUrl:
          "public HTTP(S) image URL for an exact brand mark (optional — or POST /api/upload-logo first)",
        brandKitId: `saved brand kit id (optional — demo kit: "${DEMO_LAUNCH_KIT_ID}")`,
        baseImageUrl: "public HTTP(S) image URL (optional)",
        prompt: "string override for extracted brief (optional)",
        overlayMode: "community preset name (optional)",
        text: "campaign copy controls (optional)",
        controls: "logo placement, scale, color, and opacity (optional)",
        formats: `${CAMPAIGN_FORMATS.join(" | ")} — optional multi-format campaign kit`,
      },
    },
    output: {
      status: "completed | processing | failed",
      resultUrl: "public asset URL when a single format is requested",
      previewUrl: "public preview URL when completed",
      assets:
        "array of { format, resultUrl, previewUrl } when parameters.formats is set",
      draftId: "persisted review draft id for human approval",
      studioReviewUrl: "open in Studio for human approval",
    },
    humanApproval: {
      description:
        "Successful agent runs persist a draft. Send collaborators to studioReviewUrl for review.",
      draftTtlDays: 7,
    },
    commerce: {
      x402: {
        enabled: process.env.X402_ENABLED === "true",
        header: "X-PAYMENT",
        price: process.env.X402_PRICE_USDC || "0.01",
        currency: "USDC",
        network: getX402Network() || null,
      },
      entitlements: `${aspUrl}/api/entitlements`,
      entitlementNetwork: getEntitlementNetwork() || null,
    },
    provenance: {
      offchain: `${aspUrl}/api/provenance`,
      network: getProvenanceNetwork(),
      description:
        "Optional receipt with specHash + assetHash. Chain binding is deployment-specific; source logos stay offchain by default.",
    },
    demo: {
      brandKitId: DEMO_LAUNCH_KIT_ID,
      exampleRequest: {
        command:
          "Generate a vibrant community launch visual with optimistic lighting",
        parameters: {
          brandKitId: DEMO_LAUNCH_KIT_ID,
          formats: ["square", "landscape", "portrait"],
        },
      },
    },
    documentation: {
      guide: "docs/WOWOWIFY_GUIDE.md",
      studio: studioUrl,
      portfolio: BRAND.urls.portfolio,
    },
  } as const;
}
