import { describe, expect, it } from "vitest";
import {
  buildStudioReviewUrl,
  saveCampaignDraft,
  getCampaignDraft,
} from "@/lib/campaign-drafts";
import { checkAgentPayment } from "@/lib/x402";
import { buildProvenanceSpecFromDraft, issueProvenanceReceipt } from "@/lib/provenance";
import { buildZipFromDataUrls } from "@/lib/export-zip";
import { isAspAllowedPath, getDeploymentMode } from "@/lib/deployment";
import { buildStudioUrl } from "@/lib/studio-url";
import { getAgentCapabilityCard } from "@/lib/agent-capability-card";

describe("campaign drafts", () => {
  it("persists and retrieves a draft with studio review URL", async () => {
    const draft = await saveCampaignDraft({
      command: "Launch visual",
      brief: "Launch visual",
      brandKitId: "demo-launch",
      logoUrl: "https://example.com/logo.png",
      previewUrl: "https://example.com/preview.png",
      status: "completed",
    });

    expect(draft.id).toBeTruthy();
    expect(draft.studioReviewUrl).toContain(`draftId=${draft.id}`);

    const loaded = await getCampaignDraft(draft.id);
    expect(loaded?.brief).toBe("Launch visual");
    expect(loaded?.brandKitId).toBe("demo-launch");
  });

  it("buildStudioReviewUrl encodes draft id", () => {
    expect(buildStudioReviewUrl("abc 123")).toContain("draftId=abc%20123");
  });
});

describe("buildStudioUrl", () => {
  it("includes draftId for human approval deep links", () => {
    const url = buildStudioUrl({ draftId: "draft-42" });
    expect(url).toBe("/?draftId=draft-42");
  });
});

describe("x402 payment gate", () => {
  it("returns null when disabled", () => {
    const prior = process.env.X402_ENABLED;
    process.env.X402_ENABLED = "false";
    expect(checkAgentPayment(new Request("http://localhost/api/agent"))).toBeNull();
    process.env.X402_ENABLED = prior;
  });

  it("returns 402 when enabled without payment header", async () => {
    const priorEnabled = process.env.X402_ENABLED;
    process.env.X402_ENABLED = "true";
    const response = checkAgentPayment(new Request("http://localhost/api/agent"));
    expect(response?.status).toBe(402);
    process.env.X402_ENABLED = priorEnabled;
  });
});

describe("provenance receipts", () => {
  it("issues off-chain spec and asset hashes", async () => {
    const draft = await saveCampaignDraft({
      command: "Campaign",
      brief: "Campaign",
      resultUrl: "https://example.com/final.png",
      status: "completed",
    });
    const spec = buildProvenanceSpecFromDraft(draft);
    const receipt = await issueProvenanceReceipt(spec);
    expect(receipt.network).toBe("offchain");
    expect(receipt.specHash).toHaveLength(64);
    expect(receipt.assetHash).toHaveLength(64);
  });
});

describe("export zip", () => {
  it("builds a zip blob from data URLs", async () => {
    const png =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
    const zip = await buildZipFromDataUrls([
      { filename: "a.png", dataUrl: png },
      { filename: "b.png", dataUrl: png },
    ]);
    expect(zip.type).toBe("application/zip");
    expect(zip.size).toBeGreaterThan(0);
  });
});

describe("ASP deployment gating", () => {
  it("allows agent and draft routes in asp mode", () => {
    expect(isAspAllowedPath("/api/agent")).toBe(true);
    expect(isAspAllowedPath("/api/drafts/abc")).toBe(true);
    expect(isAspAllowedPath("/api/upload-logo")).toBe(true);
    expect(isAspAllowedPath("/")).toBe(false);
  });

  it("defaults deployment mode to all", () => {
    const prior = process.env.TOKA_DEPLOYMENT;
    delete process.env.TOKA_DEPLOYMENT;
    expect(getDeploymentMode()).toBe("all");
    process.env.TOKA_DEPLOYMENT = prior;
  });
});

describe("getAgentCapabilityCard", () => {
  it("points service endpoints at ASP and studio separately", () => {
    const card = getAgentCapabilityCard(
      "https://asp.example",
      "https://studio.example",
    );
    expect(card.endpoints.service).toBe("https://asp.example/api/agent");
    expect(card.endpoints.studio).toBe("https://studio.example");
    expect(card.endpoints.uploadLogo).toBe("https://asp.example/api/upload-logo");
    expect(card.output.draftId).toContain("draft");
    expect(card.endpoints.entitlements).toBe("https://asp.example/api/entitlements");
  });
});
