import { NextResponse } from "next/server";
import { CAMPAIGN_FORMATS, type CampaignFormat } from "@/lib/agent-types";
import { listBrandKits, saveBrandKit, type BrandKitInput } from "@/lib/brand-kits";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  try {
    const kits = await listBrandKits();
    return NextResponse.json({ kits });
  } catch (error) {
    logger.error("Failed to list brand kits", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to list brand kits" }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as BrandKitInput;
    if (!body?.name || typeof body.name !== "string") {
      return NextResponse.json({ error: "name is required" }, { status: 400 });
    }

    if (body.logoUrl) {
      try {
        const parsed = new URL(body.logoUrl);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
          throw new Error("Unsupported protocol");
        }
      } catch {
        return NextResponse.json(
          { error: "logoUrl must be a public HTTP(S) image URL" },
          { status: 400 },
        );
      }
    }

    if (body.formats) {
      if (
        !Array.isArray(body.formats) ||
        !body.formats.every((format) => CAMPAIGN_FORMATS.includes(format as CampaignFormat))
      ) {
        return NextResponse.json(
          { error: "formats must contain square, landscape, and/or portrait" },
          { status: 400 },
        );
      }
    }

    const kit = await saveBrandKit(body);
    return NextResponse.json({ kit }, { status: 201 });
  } catch (error) {
    logger.error("Failed to save brand kit", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save brand kit" },
      { status: 500 },
    );
  }
}
