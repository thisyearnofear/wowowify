import { describe, expect, it } from "vitest";
import { getFormatCropDimensions } from "@/lib/campaign-formats";
import { assertSafeImageUrl } from "@/lib/fetch-image-url";
import { mergeBrandKitIntoCommand } from "@/lib/brand-kits";
import { buildStudioUrl } from "@/lib/studio-url";
import { getAgentCapabilityCard } from "@/lib/agent-capability-card";
import {
  DEMO_LAUNCH_KIT_ID,
  buildDemoLaunchKit,
  getSeedBrandKit,
} from "@/lib/brand-kits-seed";

describe("getFormatCropDimensions", () => {
  it("center-crops landscape from a wide source", () => {
    const dims = getFormatCropDimensions(1910, 1000, "landscape");
    expect(dims.width).toBe(1910);
    expect(dims.height).toBe(1000);
    expect(dims.sourceX).toBe(0);
  });

  it("center-crops portrait from a wide source", () => {
    const dims = getFormatCropDimensions(1200, 800, "portrait");
    expect(dims.width).toBe(640);
    expect(dims.height).toBe(800);
    expect(dims.sourceX).toBe(280);
  });
});

describe("assertSafeImageUrl", () => {
  it("accepts public https URLs", () => {
    expect(assertSafeImageUrl("https://example.com/logo.png").hostname).toBe(
      "example.com",
    );
  });

  it("rejects localhost", () => {
    expect(() => assertSafeImageUrl("http://localhost/logo.png")).toThrow();
  });
});

describe("mergeBrandKitIntoCommand", () => {
  it("fills gaps without overwriting explicit command fields", () => {
    const merged = mergeBrandKitIntoCommand(
      {
        logoUrl: "https://example.com/explicit.png",
        text: { content: "Launch" },
      },
      {
        id: "kit-1",
        name: "Demo",
        logoUrl: "https://example.com/kit.png",
        text: { content: "Default", position: "bottom" },
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    );

    expect(merged.logoUrl).toBe("https://example.com/explicit.png");
    expect(merged.text?.content).toBe("Launch");
    expect((merged.text as { position?: string })?.position).toBe("bottom");
  });
});

describe("buildStudioUrl", () => {
  it("includes autostart and brand kit params", () => {
    const url = buildStudioUrl({
      brief: "Launch visual",
      brandKitId: "kit-123",
      autostart: true,
    });
    expect(url).toContain("brief=Launch+visual");
    expect(url).toContain("brandKitId=kit-123");
    expect(url).toContain("autostart=1");
  });

  it("includes draftId for review links", () => {
    expect(buildStudioUrl({ draftId: "draft-1" })).toContain("draftId=draft-1");
  });
});

describe("getSeedBrandKit", () => {
  it("resolves legacy launch kit ids to the demo kit", () => {
    expect(getSeedBrandKit("lisk-launch")?.id).toBe(DEMO_LAUNCH_KIT_ID);
  });
});

describe("getAgentCapabilityCard", () => {
  it("exposes discovery and demo brand kit", () => {
    const card = getAgentCapabilityCard("https://toka.example");
    expect(card.endpoints.discovery).toBe(
      "https://toka.example/.well-known/agent.json",
    );
    expect(card.endpoints.service).toBe("https://toka.example/api/agent");
    expect(card.demo.brandKitId).toBe(DEMO_LAUNCH_KIT_ID);
  });
});

describe("buildDemoLaunchKit", () => {
  it("ships square, landscape, and portrait defaults", () => {
    const kit = buildDemoLaunchKit("https://toka.example");
    expect(kit.id).toBe(DEMO_LAUNCH_KIT_ID);
    expect(kit.formats).toEqual(["square", "landscape", "portrait"]);
    expect(kit.logoUrl).toContain("/demo/launch-mark.svg");
  });
});
