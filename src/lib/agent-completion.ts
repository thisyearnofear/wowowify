import type { CampaignFormat, ParsedCommand } from "@/lib/agent-types";
import type { CampaignKitResponse } from "@/lib/agent-types";
import {
  buildProvenanceSpecFromDraft,
  issueProvenanceReceipt,
} from "@/lib/provenance";
import { saveCampaignDraft } from "@/lib/campaign-drafts";

export interface AgentRunResult {
  status: string;
  previewUrl?: string;
  resultUrl?: string;
  assets?: CampaignKitResponse["assets"];
  error?: string;
}

export interface FinalizedAgentRun {
  draftId: string;
  studioReviewUrl: string;
  provenanceReceiptId?: string;
}

/** Persist review draft and optional provenance receipt for completed agent runs. */
export async function finalizeCompletedAgentRun(options: {
  command?: string;
  brandKitId?: string;
  formats: CampaignFormat[] | null;
  parsedCommand: ParsedCommand;
  result: AgentRunResult;
}): Promise<FinalizedAgentRun | null> {
  if (options.result.status !== "completed") return null;

  const draft = await saveCampaignDraft({
    command: options.command || options.parsedCommand.prompt || "",
    brief: options.parsedCommand.prompt,
    brandKitId: options.brandKitId,
    logoUrl: options.parsedCommand.logoUrl,
    overlayMode: options.parsedCommand.overlayMode,
    text: options.parsedCommand.text,
    controls: options.parsedCommand.controls,
    formats: options.formats || undefined,
    previewUrl: options.result.previewUrl,
    resultUrl: options.result.resultUrl,
    assets: options.result.assets,
    status: "completed",
  });

  let provenanceReceiptId: string | undefined;
  if (options.brandKitId) {
    const receipt = await issueProvenanceReceipt(buildProvenanceSpecFromDraft(draft));
    provenanceReceiptId = receipt.receiptId;
  }

  return {
    draftId: draft.id,
    studioReviewUrl: draft.studioReviewUrl,
    provenanceReceiptId,
  };
}
