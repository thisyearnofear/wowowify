import { NextResponse } from "next/server";
import { getCampaignDraft } from "@/lib/campaign-drafts";
import {
  buildProvenanceSpecFromDraft,
  getProvenanceReceipt,
  issueProvenanceReceipt,
  type ProvenanceSpec,
} from "@/lib/provenance";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: Request): Promise<Response> {
  const receiptId = new URL(request.url).searchParams.get("receiptId");
  if (!receiptId) {
    return NextResponse.json({ error: "receiptId is required" }, { status: 400 });
  }
  const receipt = await getProvenanceReceipt(receiptId);
  if (!receipt) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }
  return NextResponse.json({ receipt });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      draftId?: string;
      spec?: ProvenanceSpec;
    };

    let spec = body.spec;
    if (body.draftId) {
      const draft = await getCampaignDraft(body.draftId);
      if (!draft) {
        return NextResponse.json({ error: "Draft not found" }, { status: 404 });
      }
      spec = buildProvenanceSpecFromDraft(draft);
    }

    if (!spec?.resultUrl && !spec?.assetUrls?.length) {
      return NextResponse.json(
        { error: "Provenance requires a completed asset URL or draftId" },
        { status: 400 },
      );
    }

    const receipt = await issueProvenanceReceipt(spec);
    return NextResponse.json({ receipt }, { status: 201 });
  } catch (error) {
    logger.error("Provenance issuance failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to issue provenance receipt" },
      { status: 500 },
    );
  }
}
