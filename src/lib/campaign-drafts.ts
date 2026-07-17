import { v4 as uuidv4 } from "uuid";
import type { CampaignAsset, CampaignFormat } from "@/lib/agent-types";
import type { BrandKitControls, BrandKitText } from "@/lib/brand-kits";
import { logger } from "@/lib/logger";
import {
  executeWithTimeout,
  getInMemoryData,
  getRedisClient,
  setInMemoryData,
} from "@/lib/redis";
import { STUDIO_URL } from "@/lib/deployment";

const DRAFT_PREFIX = "campaign_draft:";
const DRAFT_TTL_SECONDS = 7 * 24 * 60 * 60;

export interface CampaignDraft {
  id: string;
  command: string;
  brief?: string;
  brandKitId?: string;
  logoUrl?: string;
  overlayMode?: string;
  text?: BrandKitText;
  controls?: BrandKitControls;
  formats?: CampaignFormat[];
  previewUrl?: string;
  resultUrl?: string;
  assets?: CampaignAsset[];
  status: "completed" | "processing" | "failed";
  error?: string;
  studioReviewUrl: string;
  createdAt: string;
  updatedAt: string;
}

export type CampaignDraftInput = Omit<
  CampaignDraft,
  "id" | "studioReviewUrl" | "createdAt" | "updatedAt"
> & { id?: string };

async function readDraft(id: string): Promise<CampaignDraft | null> {
  const key = `${DRAFT_PREFIX}${id}`;
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      const raw = await executeWithTimeout(() => redis.get(key), 3000, null);
      if (!raw) return null;
      return JSON.parse(raw) as CampaignDraft;
    } catch (error) {
      logger.warn("Draft read failed, using memory fallback", {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const drafts = getInMemoryData<CampaignDraft>("campaign_drafts:data");
  return drafts.find((draft) => draft.id === id) ?? null;
}

async function writeDraft(draft: CampaignDraft): Promise<void> {
  const key = `${DRAFT_PREFIX}${draft.id}`;
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      await executeWithTimeout(
        () => redis.set(key, JSON.stringify(draft), "EX", DRAFT_TTL_SECONDS),
        3000,
      );
    } catch (error) {
      logger.warn("Draft write failed, using memory fallback", {
        id: draft.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const drafts = getInMemoryData<CampaignDraft>("campaign_drafts:data");
  const next = drafts.filter((entry) => entry.id !== draft.id);
  next.unshift(draft);
  setInMemoryData("campaign_drafts:data", next.slice(0, 200));
}

export function buildStudioReviewUrl(draftId: string): string {
  return `${STUDIO_URL}/?draftId=${encodeURIComponent(draftId)}`;
}

export async function getCampaignDraft(id: string): Promise<CampaignDraft | null> {
  return readDraft(id);
}

export async function saveCampaignDraft(input: CampaignDraftInput): Promise<CampaignDraft> {
  const now = new Date().toISOString();
  const id = input.id ?? uuidv4();
  const draft: CampaignDraft = {
    ...input,
    id,
    studioReviewUrl: buildStudioReviewUrl(id),
    createdAt: now,
    updatedAt: now,
  };
  await writeDraft(draft);
  return draft;
}
