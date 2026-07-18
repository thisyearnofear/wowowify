import { describe, expect, it } from "vitest";

import { buildDemoLaunchKit, DEMO_LAUNCH_KIT_ID } from "@/lib/brand-kits-seed";
import { parseBrandKitRef } from "@/lib/brand-kits";
import {
  enforceBrandKitAgentContract,
  normalizeCampaignFormats,
  resolveCampaignFormats,
} from "@/lib/brand-kit-contract";

describe("parseBrandKitRef", () => {
  it("parses plain ids and version pins", () => {
    expect(parseBrandKitRef("demo-launch")).toEqual({ id: "demo-launch" });
    expect(parseBrandKitRef("demo-launch@2")).toEqual({ id: "demo-launch", version: 2 });
  });
});

describe("normalizeCampaignFormats", () => {
  it("accepts valid format lists", () => {
    expect(normalizeCampaignFormats(["square", "landscape"])).toEqual([
      "square",
      "landscape",
    ]);
  });

  it("rejects empty lists", () => {
    const result = normalizeCampaignFormats([]);
    expect(result).toMatchObject({ ok: false, status: 400 });
  });
});

describe("enforceBrandKitAgentContract", () => {
  const demoKit = buildDemoLaunchKit("https://studio.example");

  it("requires brandKitId", () => {
    const result = enforceBrandKitAgentContract({
      brandKitRef: undefined,
      kit: null,
      parsedCommand: { action: "generate", logoUrl: demoKit.logoUrl },
      requestedFormats: ["square"],
      enforcementEnabled: true,
    });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("requires a compositable logo", () => {
    const result = enforceBrandKitAgentContract({
      brandKitRef: DEMO_LAUNCH_KIT_ID,
      kit: { ...demoKit, logoUrl: undefined },
      parsedCommand: { action: "generate" },
      requestedFormats: ["square"],
      enforcementEnabled: true,
    });
    expect(result).toMatchObject({ ok: false, status: 400 });
  });

  it("rejects unapproved kits", () => {
    const result = enforceBrandKitAgentContract({
      brandKitRef: "draft-kit",
      kit: { ...demoKit, id: "draft-kit", approved: false },
      parsedCommand: { action: "generate", logoUrl: demoKit.logoUrl },
      requestedFormats: ["square"],
      enforcementEnabled: true,
    });
    expect(result).toMatchObject({ ok: false, status: 403 });
  });

  it("returns version mismatch guidance", () => {
    const result = enforceBrandKitAgentContract({
      brandKitRef: `${DEMO_LAUNCH_KIT_ID}@99`,
      kit: demoKit,
      parsedCommand: { action: "generate", logoUrl: demoKit.logoUrl },
      requestedFormats: null,
      enforcementEnabled: true,
    });
    expect(result).toMatchObject({ ok: false, status: 409 });
  });

  it("resolves formats from the kit when omitted", () => {
    const result = enforceBrandKitAgentContract({
      brandKitRef: DEMO_LAUNCH_KIT_ID,
      kit: demoKit,
      parsedCommand: { action: "generate", logoUrl: demoKit.logoUrl },
      requestedFormats: null,
      enforcementEnabled: true,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.formats).toEqual(["square", "landscape", "portrait"]);
      expect(result.brandKitId).toBe(DEMO_LAUNCH_KIT_ID);
    }
  });
});

describe("resolveCampaignFormats", () => {
  it("prefers explicit formats over kit defaults", () => {
    const kit = buildDemoLaunchKit("https://studio.example");
    expect(resolveCampaignFormats(["square"], kit)).toEqual(["square"]);
  });
});
