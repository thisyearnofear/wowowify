import { afterEach, describe, expect, it, vi } from "vitest";

import { generateImageWithFallback } from "./image-generation";

const PNG_BYTES = Buffer.from("fake-png");

describe("generateImageWithFallback", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.VENICE_API_KEY;
    delete process.env.RUNWARE_API_KEY;
    delete process.env.IMAGE_GEN_RUNWARE_FALLBACK;
    delete process.env.IMAGE_GEN_FALLBACK_ENABLED;
  });

  it("returns Runware result when Runware succeeds", async () => {
    process.env.VENICE_API_KEY = "venice-test";
    process.env.RUNWARE_API_KEY = "runware-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("runware.ai")) {
          return new Response(
            JSON.stringify({
              data: [
                {
                  imageBase64Data: PNG_BYTES.toString("base64"),
                  cost: 0.0006,
                },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const result = await generateImageWithFallback("test prompt", new AbortController().signal);
    expect(result.provider).toBe("runware");
    expect(result.model).toBe("runware:100@1");
    expect(result.costUsd).toBe(0.0006);
    expect(result.buffer.equals(PNG_BYTES)).toBe(true);
  });

  it("falls back to Venice when Runware fails", async () => {
    process.env.VENICE_API_KEY = "venice-test";
    process.env.RUNWARE_API_KEY = "runware-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("runware.ai")) {
          return new Response(
            JSON.stringify({ errors: [{ message: "upstream error" }] }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        if (url.includes("venice.ai")) {
          return new Response(
            JSON.stringify({ images: [PNG_BYTES.toString("base64")] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const result = await generateImageWithFallback("test prompt", new AbortController().signal);
    expect(result.provider).toBe("venice");
    expect(result.model).toBe("venice-sd35");
  });

  it("uses Venice when Runware is not configured", async () => {
    process.env.VENICE_API_KEY = "venice-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("venice.ai")) {
          return new Response(
            JSON.stringify({ images: [PNG_BYTES.toString("base64")] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const result = await generateImageWithFallback("solo venice", new AbortController().signal);
    expect(result.provider).toBe("venice");
  });

  it("does not fall back when IMAGE_GEN_FALLBACK_ENABLED=false", async () => {
    process.env.VENICE_API_KEY = "venice-test";
    process.env.RUNWARE_API_KEY = "runware-test";
    process.env.IMAGE_GEN_FALLBACK_ENABLED = "false";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("runware.ai")) {
          return new Response("fail", { status: 500 });
        }
        throw new Error("Venice should not be called");
      }),
    );

    await expect(
      generateImageWithFallback("test", new AbortController().signal),
    ).rejects.toThrow(/Runware API error|fail/);
  });
});
