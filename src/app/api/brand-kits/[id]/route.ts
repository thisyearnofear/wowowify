import { NextResponse } from "next/server";
import { getBrandKit } from "@/lib/brand-kits";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  try {
    const { id } = await context.params;
    const kit = await getBrandKit(id);
    if (!kit) {
      return NextResponse.json({ error: "Brand kit not found" }, { status: 404 });
    }
    return NextResponse.json({ kit });
  } catch (error) {
    logger.error("Failed to get brand kit", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: "Failed to get brand kit" }, { status: 500 });
  }
}
