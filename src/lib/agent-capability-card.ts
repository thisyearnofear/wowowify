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
    name: `${BRAND.product} Brand Kit v1 — agent-callable campaign production`,
    version: "1.4.0",
    description:
      "Save logo, placement, copy, and formats once as a Brand Kit. Every POST /api/agent call returns brand-exact, multi-format campaign assets with a human review link — not a one-off chat image.",
    protocol: "A2MCP",
    portfolio: BRAND.portfolio,
    deployment: {
      aspUrl,
      studioUrl,
      mode: process.env.TOKA_DEPLOYMENT || "all",
    },
    brandKit: {
      hero: true,
      version: "1",
      summary:
        "Persistent brand contract for agents — logo compositing, copy defaults, and output formats by id.",
      parameter: "parameters.brandKitId",
      demoKitId: DEMO_LAUNCH_KIT_ID,
      guarantees: [
        "Exact logo compositing — uploaded mark is never AI-redrawn",
        "Multi-format campaign kit from one call (square, landscape, portrait)",
        "Human approval via studioReviewUrl; optional provenance receipt",
      ],
      endpoints: {
        list: `${aspUrl}/api/brand-kits`,
        get: `${aspUrl}/api/brand-kits/{id}`,
        create: `${aspUrl}/api/brand-kits`,
      },
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
        brandKitId: `required for Brand Kit v1 flow — saved kit id (demo: "${DEMO_LAUNCH_KIT_ID}")`,
        logoUrl:
          "public HTTP(S) image URL override (optional when brandKitId is set — or POST /api/upload-logo)",
        baseImageUrl: "public HTTP(S) image URL (optional)",
        prompt: "string override for extracted brief (optional)",
        overlayMode: "community preset name (optional)",
        text: "campaign copy controls override (optional)",
        controls: "logo placement override (optional)",
        formats: `${CAMPAIGN_FORMATS.join(" | ")} — multi-format kit (defaults from brand kit when omitted)`,
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
        "Optional receipt with specHash + assetHash tied to brandKitId + brief. Chain binding is deployment-specific; source logos stay offchain by default.",
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
