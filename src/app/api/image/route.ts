import { NextRequest, NextResponse } from "next/server";
import { getImage, isStoredInBlob, getBlobUrl } from "@/lib/image-store";
import { getImageUrl } from "@/lib/image-history";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (!id) {
    logger.warn("No image ID provided");
    return new NextResponse("No image ID provided", { status: 400 });
  }

  try {
    // 1. If we know the image was stored in Vercel Blob in *this* invocation,
    //    redirect to the Blob URL directly (fast path, no Redis lookup needed).
    if (isStoredInBlob(id)) {
      const blobUrl = getBlobUrl(id);
      if (blobUrl) {
        logger.info("Redirecting to Blob URL (in-memory tracking)", { id, blobUrl });
        return NextResponse.redirect(blobUrl, { status: 302 });
      }
    }

    // 2. Serve from in-memory store (dev/local without Blob)
    const imageData = getImage(id);
    if (imageData) {
      return new NextResponse(new Uint8Array(imageData.buffer), {
        headers: {
          "Content-Type": imageData.contentType,
          "Cache-Control": "public, max-age=3600",
          "Content-Disposition": `inline; filename="image-${id}.png"`,
        },
      });
    }

    // 3. Image not in memory — could be a Blob-stored image from a previous
    //    serverless invocation. Look up the URL in Redis-backed image history.
    const historyEntry = await getImageUrl(id);
    if (historyEntry?.resultUrl && historyEntry.resultUrl.startsWith("https://")) {
      logger.info("Redirecting to stored URL (Redis history lookup)", {
        id,
        resultUrl: historyEntry.resultUrl,
      });
      return NextResponse.redirect(historyEntry.resultUrl, { status: 302 });
    }

    logger.warn("Image not found", { id });
    return new NextResponse("Image not found", { status: 404 });
  } catch (error) {
    logger.error("Error serving image", {
      error: error instanceof Error ? error.message : "Unknown error",
      id,
    });
    return new NextResponse("Error serving image", { status: 500 });
  }
}
