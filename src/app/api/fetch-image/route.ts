import { NextRequest, NextResponse } from "next/server";
import { assertSafeImageUrl } from "@/lib/fetch-image-url";
import { downloadImage } from "@/lib/services/image-fetcher";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<Response> {
  const rawUrl = request.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  try {
    const safeUrl = assertSafeImageUrl(rawUrl).toString();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const buffer = await downloadImage(safeUrl, controller.signal);
    clearTimeout(timeout);

    const header = buffer.subarray(0, Math.min(buffer.length, 256)).toString("utf8");
    const contentType = header.includes("<svg")
      ? "image/svg+xml"
      : buffer[0] === 0x89 && buffer[1] === 0x50
        ? "image/png"
        : buffer[0] === 0xff && buffer[1] === 0xd8
          ? "image/jpeg"
          : buffer[0] === 0x47 && buffer[1] === 0x49
            ? "image/gif"
            : "image/png";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    logger.warn("fetch-image failed", {
      url: rawUrl.substring(0, 120),
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch image" },
      { status: 400 },
    );
  }
}
