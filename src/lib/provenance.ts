import { createHash } from "crypto";
import { v4 as uuidv4 } from "uuid";
import type { CampaignDraft } from "@/lib/campaign-drafts";
import { getProvenanceNetwork } from "@/lib/commerce-config";
import { logger } from "@/lib/logger";
import {
  executeWithTimeout,
  getInMemoryData,
  getRedisClient,
  setInMemoryData,
} from "@/lib/redis";

const RECEIPT_PREFIX = "provenance_receipt:";

export interface ProvenanceSpec {
  draftId?: string;
  brandKitId?: string;
  brief?: string;
  logoUrl?: string;
  formats?: string[];
  resultUrl?: string;
  assetUrls?: string[];
}

export interface ProvenanceReceipt {
  receiptId: string;
  network: string;
  specHash: string;
  assetHash: string;
  spec: ProvenanceSpec;
  issuedAt: string;
  note: string;
}

function hashValue(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

async function storeReceipt(receipt: ProvenanceReceipt): Promise<void> {
  const key = `${RECEIPT_PREFIX}${receipt.receiptId}`;
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      await executeWithTimeout(
        () => redis.set(key, JSON.stringify(receipt), "EX", 30 * 24 * 60 * 60),
        3000,
      );
      return;
    } catch (error) {
      logger.warn("Provenance receipt write failed, using memory fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const receipts = getInMemoryData<ProvenanceReceipt>("provenance_receipts:data");
  receipts.unshift(receipt);
  setInMemoryData("provenance_receipts:data", receipts.slice(0, 500));
}

export async function getProvenanceReceipt(
  receiptId: string,
): Promise<ProvenanceReceipt | null> {
  const key = `${RECEIPT_PREFIX}${receiptId}`;
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      const raw = await executeWithTimeout(() => redis.get(key), 3000, null);
      if (!raw) return null;
      return JSON.parse(raw) as ProvenanceReceipt;
    } catch {
      // fall through
    }
  }
  const receipts = getInMemoryData<ProvenanceReceipt>("provenance_receipts:data");
  return receipts.find((receipt) => receipt.receiptId === receiptId) ?? null;
}

export async function issueProvenanceReceipt(
  spec: ProvenanceSpec,
): Promise<ProvenanceReceipt> {
  const assetFingerprint =
    spec.assetUrls?.length ? spec.assetUrls : spec.resultUrl ? [spec.resultUrl] : [];
  const receipt: ProvenanceReceipt = {
    receiptId: uuidv4(),
    network: getProvenanceNetwork(),
    specHash: hashValue(spec),
    assetHash: hashValue(assetFingerprint),
    spec,
    issuedAt: new Date().toISOString(),
    note:
      "Off-chain campaign provenance receipt. Source logos and private inputs are not placed onchain unless a deployment opts in.",
  };
  await storeReceipt(receipt);
  return receipt;
}

export function buildProvenanceSpecFromDraft(draft: CampaignDraft): ProvenanceSpec {
  return {
    draftId: draft.id,
    brandKitId: draft.brandKitId,
    brief: draft.brief ?? draft.command,
    logoUrl: draft.logoUrl,
    formats: draft.formats,
    resultUrl: draft.resultUrl,
    assetUrls: draft.assets?.map((asset) => asset.resultUrl || asset.previewUrl || ""),
  };
}
