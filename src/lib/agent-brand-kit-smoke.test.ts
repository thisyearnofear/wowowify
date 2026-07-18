import { createCanvas } from "canvas";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_LAUNCH_KIT_ID, buildDemoLaunchKit } from "@/lib/brand-kits-seed";
import { mergeBrandKitIntoCommand } from "@/lib/brand-kits";
import { finalizeCompletedAgentRun } from "@/lib/agent-completion";
import type { ParsedCommand } from "@/lib/agent-types";
import { getImageService } from "@/lib/services";

function pngBuffer(width: number, height: number): Buffer {
  return createCanvas(width, height).toBuffer("image/png");
}

vi.mock("@/lib/services/image-generation", () => ({
  generateImageWithFallback: vi.fn(async () => ({
    buffer: pngBuffer(120, 60),
    provider: "runware" as const,
    model: "runware:100@1",
    costUsd: 0.0006,
  })),
}));

describe("Brand Kit v1 agent smoke", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("produces three campaign assets from demo-launch kit contract", async () => {
    const kit = buildDemoLaunchKit("https://studio.example");
    const logoBuffer = pngBuffer(60, 60);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(Uint8Array.from(logoBuffer), {
          status: 200,
          headers: { "Content-Type": "image/png" },
        }),
      ),
    );

    const parsed: ParsedCommand = {
      action: "generate",
      prompt: "Minimal gradient launch background, no text, no logos",
      ...mergeBrandKitIntoCommand({}, kit),
    };

    const service = getImageService("web");
    const result = await service.processCampaignKit(
      parsed,
      kit.formats ?? ["square", "landscape", "portrait"],
      "https://studio.example",
    );

    expect(result.status, result.error).toBe("completed");
    expect(result.assets).toHaveLength(3);
    expect(result.assets?.map((asset) => asset.format).sort()).toEqual([
      "landscape",
      "portrait",
      "square",
    ]);
    for (const asset of result.assets ?? []) {
      expect(asset.resultUrl).toBeTruthy();
      expect(asset.previewUrl).toBeTruthy();
    }
  });

  it("issues draft + provenance metadata on completed runs", async () => {
    const finalized = await finalizeCompletedAgentRun({
      command: "Launch visual",
      brandKitId: DEMO_LAUNCH_KIT_ID,
      formats: ["square", "landscape", "portrait"],
      parsedCommand: {
        action: "generate",
        prompt: "Launch visual",
        logoUrl: "https://example.com/logo.png",
      },
      result: {
        status: "completed",
        assets: [
          {
            id: "a1",
            status: "completed",
            format: "square",
            resultUrl: "https://example.com/square.png",
            previewUrl: "https://example.com/square-preview.png",
          },
        ],
      },
    });

    expect(finalized?.draftId).toBeTruthy();
    expect(finalized?.studioReviewUrl).toContain(finalized?.draftId ?? "");
    expect(finalized?.provenanceReceiptId).toBeTruthy();
  });
});
