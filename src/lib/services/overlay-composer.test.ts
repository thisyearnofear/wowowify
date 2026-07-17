import { createCanvas, loadImage } from "canvas";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { ParsedCommand } from "@/lib/agent-types";
import { composeImage } from "./overlay-composer";

function imageBuffer(
  width: number,
  height: number,
  paint: (x: number, y: number) => string,
): Buffer {
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  for (let x = 0; x < width; x += 1) {
    for (let y = 0; y < height; y += 1) {
      ctx.fillStyle = paint(x, y);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  return canvas.toBuffer("image/png");
}

describe("composeImage custom logos", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("composites the exact custom logo instead of the selected preset", async () => {
    const baseBuffer = imageBuffer(60, 60, () => "#ffffff");
    const logoBuffer = imageBuffer(20, 20, (x, y) =>
      (x + y) % 2 === 0 ? "#ff0000" : "#0000ff",
    );
    const fetchMock = vi.fn(async () =>
      new Response(Uint8Array.from(logoBuffer), {
        status: 200,
        headers: { "Content-Type": "image/png" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const command: ParsedCommand = {
      action: "generate",
      overlayMode: "degenify",
      logoUrl: "https://example.com/exact-logo.png",
    };
    const { resultBuffer } = await composeImage(
      command,
      baseBuffer,
      "https://wowowify.example",
      new AbortController().signal,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/exact-logo.png",
      expect.objectContaining({
        headers: expect.objectContaining({ Accept: "image/*, */*" }),
      }),
    );

    const result = await loadImage(resultBuffer);
    const canvas = createCanvas(result.width, result.height);
    const ctx = canvas.getContext("2d");
    ctx.drawImage(result, 0, 0);
    const center = ctx.getImageData(30, 30, 1, 1).data;
    const corner = ctx.getImageData(0, 0, 1, 1).data;

    expect(Array.from(center.slice(0, 3))).toEqual([255, 0, 0]);
    expect(Array.from(corner.slice(0, 3))).toEqual([255, 255, 255]);
  });

  it("fails instead of returning an unbranded result when the logo is unavailable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404, statusText: "Not Found" })),
    );
    const command: ParsedCommand = {
      action: "generate",
      logoUrl: "https://example.com/missing-logo.png",
    };

    await expect(
      composeImage(
        command,
        imageBuffer(20, 20, () => "#ffffff"),
        "https://wowowify.example",
        new AbortController().signal,
      ),
    ).rejects.toThrow("Failed to download image");
  });

  it("creates deterministic campaign crops for each requested format", async () => {
    const command: ParsedCommand = { action: "generate" };
    const baseBuffer = imageBuffer(120, 60, () => "#ffffff");

    const [landscape, portrait] = await Promise.all([
      composeImage(
        command,
        baseBuffer,
        "https://wowowify.example",
        new AbortController().signal,
        "landscape",
      ),
      composeImage(
        command,
        baseBuffer,
        "https://wowowify.example",
        new AbortController().signal,
        "portrait",
      ),
    ]);

    const landscapeImage = await loadImage(landscape.resultBuffer);
    const portraitImage = await loadImage(portrait.resultBuffer);

    expect([landscapeImage.width, landscapeImage.height]).toEqual([115, 60]);
    expect([portraitImage.width, portraitImage.height]).toEqual([48, 60]);
  });
});
