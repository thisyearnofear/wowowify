import { OverlayMode } from "@/lib/config/overlays";

export const CAMPAIGN_FORMATS = ["square", "landscape", "portrait"] as const;
export type CampaignFormat = (typeof CAMPAIGN_FORMATS)[number];

export interface AgentCommand {
  command: string;
  parameters?: {
    baseImageUrl?: string;
    /** Public image URL for an exact brand mark composited without regeneration. */
    logoUrl?: string;
    prompt?: string;
    overlayMode?: OverlayMode | "lensify";
    action?: "generate" | "overlay" | "adjust" | "download";
    useParentImage?: boolean;
    controls?: {
      scale?: number;
      x?: number;
      y?: number;
      overlayColor?: string;
      overlayAlpha?: number;
    };
    text?: {
      content?: string;
      position?: string;
      fontSize?: number;
      color?: string;
      style?: string;
      backgroundColor?: string;
    };
    formats?: CampaignFormat[];
    /** Load saved defaults from a brand kit before applying explicit overrides. */
    brandKitId?: string;
  };
  callbackUrl?: string;
  parentImageUrl?: string; // URL of the parent cast's image
}

export interface AgentResponse {
  id: string;
  status: "processing" | "completed" | "failed";
  resultUrl?: string;
  previewUrl?: string;
  error?: string;
  groveUri?: string;
  groveUrl?: string;
  /**
   * For async predictions (e.g. ghiblify): the URL the browser should poll
   * until status === "completed". Replaces the old server-side polling that
   * used to overrun Vercel's function timeout.
   */
  pollUrl?: string;
  /** Human-readable status message accompanying `status === "processing"` */
  message?: string;
  /** Persisted review draft for human approval in Studio */
  draftId?: string;
  studioReviewUrl?: string;
  /** Off-chain provenance receipt when brandKitId was used */
  provenanceReceiptId?: string;
}

export interface CampaignAsset extends AgentResponse {
  format: CampaignFormat;
}

export interface CampaignKitResponse {
  id: string;
  status: "completed" | "failed";
  assets?: CampaignAsset[];
  error?: string;
  draftId?: string;
  studioReviewUrl?: string;
  provenanceReceiptId?: string;
}

export interface ParsedCommand {
  action: "generate" | "overlay" | "adjust" | "download";
  prompt?: string;
  overlayMode?: OverlayMode | "lensify";
  baseImageUrl?: string;
  /** Public image URL for an exact brand mark; takes precedence over preset overlays. */
  logoUrl?: string;
  useParentImage?: boolean; // Flag to use the parent cast's image
  controls?: {
    scale?: number;
    x?: number;
    y?: number;
    overlayColor?: string;
    overlayAlpha?: number;
  };
  text?: {
    content?: string;
    position?: string;
    fontSize?: number;
    color?: string;
    style?: string;
    backgroundColor?: string;
  };
}
