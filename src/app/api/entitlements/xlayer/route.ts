import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCampaignDraft } from "@/lib/campaign-drafts";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Optional X Layer campaign entitlement / delivery receipt stub. Wallet not required to create artwork. */
export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as {
      draftId?: string;
      walletAddress?: string;
      action?: "delivery_receipt" | "campaign_entitlement";
    };

    const draft = body.draftId ? await getCampaignDraft(body.draftId) : null;
    if (body.draftId && !draft) {
      return NextResponse.json({ error: "Draft not found" }, { status: 404 });
    }

    const entitlementId = uuidv4();
    return NextResponse.json({
      entitlementId,
      status: "recorded",
      network: "x-layer",
      action: body.action || "delivery_receipt",
      walletAddress: body.walletAddress || null,
      draftId: body.draftId || null,
      previewUrl: draft?.previewUrl || draft?.resultUrl || null,
      message:
        "Entitlement recorded. Connect a wallet in Studio when paid X Layer delivery is enabled.",
    });
  } catch (error) {
    logger.error("X Layer entitlement stub failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to record entitlement" },
      { status: 500 },
    );
  }
}
