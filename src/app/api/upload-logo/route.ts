import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { storeImage } from "@/lib/image-store";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(request: Request): Promise<Response> {
  try {
    const formData = await request.formData();
    const file = formData.get("logo") ?? formData.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "logo file is required" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "logo must be PNG, JPEG, WebP, or SVG" },
        { status: 400 },
      );
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json({ error: "logo must be 5MB or smaller" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const id = uuidv4();
    const ext =
      file.type === "image/svg+xml"
        ? "svg"
        : file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/webp"
            ? "webp"
            : "png";
    const logoUrl = await storeImage(`logos/${id}.${ext}`, buffer, file.type);

    return NextResponse.json({ logoUrl, id }, { status: 201 });
  } catch (error) {
    logger.error("Logo upload failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Logo upload failed" },
      { status: 500 },
    );
  }
}
