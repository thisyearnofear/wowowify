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
  });

  it("returns Venice result when Venice succeeds", async () => {
    process.env.VENICE_API_KEY = "venice-test";
    process.env.RUNWARE_API_KEY = "runware-test";

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

    const result = await generateImageWithFallback("test prompt", new AbortController().signal);
    expect(result.provider).toBe("venice");
    expect(result.model).toBe("venice-sd35");
    expect(result.buffer.equals(PNG_BYTES)).toBe(true);
  });

  it("falls back to Runware when Venice fails", async () => {
    process.env.VENICE_API_KEY = "venice-test";
    process.env.RUNWARE_API_KEY = "runware-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("venice.ai")) {
          return new Response("upstream error", { status: 503 });
        }
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
  });

  it("uses Runware when Venice is not configured", async () => {
    process.env.RUNWARE_API_KEY = "runware-test";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("runware.ai")) {
          return new Response(
            JSON.stringify({
              data: [{ imageBase64Data: PNG_BYTES.toString("base64") }],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const result = await generateImageWithFallback("solo runware", new AbortController().signal);
    expect(result.provider).toBe("runware");
  });

  it("does not fall back when IMAGE_GEN_RUNWARE_FALLBACK=false", async () => {
    process.env.VENICE_API_KEY = "venice-test";
    process.env.RUNWARE_API_KEY = "runware-test";
    process.env.IMAGE_GEN_RUNWARE_FALLBACK = "false";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("venice.ai")) {
          return new Response("fail", { status: 500 });
        }
        throw new Error("Runware should not be called");
      }),
    );

    await expect(
      generateImageWithFallback("test", new AbortController().signal),
    ).rejects.toThrow(/Failed to generate image/);
  });
});
