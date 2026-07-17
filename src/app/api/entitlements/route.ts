import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { getCampaignDraft } from "@/lib/campaign-drafts";
import { getEntitlementNetwork } from "@/lib/commerce-config";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Optional campaign entitlement / delivery receipt stub. Wallet not required to create artwork. */
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

    const network = getEntitlementNetwork();
    const entitlementId = uuidv4();
    return NextResponse.json({
      entitlementId,
      status: "recorded",
      network: network || null,
      action: body.action || "delivery_receipt",
      walletAddress: body.walletAddress || null,
      draftId: body.draftId || null,
      previewUrl: draft?.previewUrl || draft?.resultUrl || null,
      message: network
        ? `Entitlement recorded for network ${network}. Connect a wallet in Studio when paid delivery is enabled.`
        : "Entitlement recorded off-chain. Set ENTITLEMENT_NETWORK when binding to a chain.",
    });
  } catch (error) {
    logger.error("Entitlement stub failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: "Failed to record entitlement" },
      { status: 500 },
    );
  }
}
