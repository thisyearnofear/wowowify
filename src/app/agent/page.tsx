"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Navigation from "@/components/Navigation";
import Image from "next/image";
import { useToast } from "@/components/ui/Toast";
import { type CampaignFormat } from "@/lib/agent-types";
import type { BrandKit } from "@/lib/brand-kits";
import { buildStudioUrl } from "@/lib/studio-url";
import { uploadLogoFile } from "@/lib/upload-logo-client";
import { STUDIO_COPY } from "@/lib/studio-copy";
import { BrandKitPanel } from "@/components/studio/BrandKitPanel";
import { FormatSelector } from "@/components/studio/FormatSelector";

const LoadingIndicator = () => (
  <div className="flex flex-col items-center justify-center py-4">
    <div className="relative w-16 h-16">
      <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-200 rounded-full" />
      <div className="absolute top-0 left-0 w-full h-full border-4 border-transparent border-t-blue-500 rounded-full animate-spin" />
    </div>
    <div className="mt-4 text-center">
      <p className="font-medium" style={{ color: "var(--color-text)" }}>
        Creating artwork…
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
        This may take a few moments
      </p>
    </div>
  </div>
);

interface ParsedCommand {
  action: string;
  prompt?: string;
  overlayMode?: string;
  logoUrl?: string;
  controls?: {
    scale?: number;
    x?: number;
    y?: number;
    overlayColor?: string;
    overlayAlpha?: number;
  };
  text?: {
    content: string;
    position?: string;
    fontSize?: number;
    color?: string;
    style?: string;
  };
}

interface CommandResult {
  id: string;
  status: string;
  resultUrl?: string;
  previewUrl?: string;
  error?: string;
  groveUri?: string;
  groveUrl?: string;
  draftId?: string;
  studioReviewUrl?: string;
  assets?: Array<{
    format: CampaignFormat;
    resultUrl?: string;
    previewUrl?: string;
  }>;
}

interface StructuredFields {
  logoUrl: string;
  caption: string;
  captionPosition: string;
  captionSize: number;
  captionColor: string;
  formats: CampaignFormat[];
}

function AgentContent() {
  const [command, setCommand] = useState("");
  const [fields, setFields] = useState<StructuredFields>({
    logoUrl: "",
    caption: "",
    captionPosition: "bottom",
    captionSize: 48,
    captionColor: "white",
    formats: [],
  });
  const [result, setResult] = useState<CommandResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [brandKitId, setBrandKitId] = useState("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const toast = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const cmdParam = searchParams?.get("cmd");
    if (cmdParam) {
      try {
        setCommand(decodeURIComponent(cmdParam));
      } catch {
        setCommand(cmdParam);
        toast.showError("Command in URL was malformed");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const buildParameters = () => {
    const parameters: Record<string, unknown> = {};

    if (fields.logoUrl.trim()) {
      parameters.logoUrl = fields.logoUrl.trim();
    }

    if (fields.caption.trim()) {
      parameters.text = {
        content: fields.caption.trim(),
        position: fields.captionPosition,
        fontSize: fields.captionSize,
        color: fields.captionColor,
        style: "bold",
      };
    }

    if (fields.formats.length > 0) {
      parameters.formats = fields.formats;
    }

    if (brandKitId) {
      parameters.brandKitId = brandKitId;
    }

    return Object.keys(parameters).length > 0 ? parameters : undefined;
  };

  const studioUrl = useMemo(
    () =>
      result?.studioReviewUrl ||
      buildStudioUrl({
        draftId: result?.draftId,
        brief: parsedCommand?.prompt || command,
        logoUrl: fields.logoUrl.trim() || parsedCommand?.logoUrl,
        caption: fields.caption.trim() || parsedCommand?.text?.content,
        brandKitId: brandKitId || undefined,
        autostart: !result?.draftId,
      }),
    [
      parsedCommand,
      command,
      fields.logoUrl,
      fields.caption,
      brandKitId,
      result?.draftId,
      result?.studioReviewUrl,
    ],
  );

  const handleLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    void uploadLogoFile(file)
      .then((url) => setFields((prev) => ({ ...prev, logoUrl: url })))
      .catch(() => toast.showError("Logo upload failed"))
      .finally(() => setIsUploadingLogo(false));
  };

  const applyBrandKit = (kit: BrandKit) => {
    setBrandKitId(kit.id);
    if (kit.logoUrl) {
      setFields((prev) => ({ ...prev, logoUrl: kit.logoUrl ?? "" }));
    }
    if (kit.text?.content) {
      setFields((prev) => ({
        ...prev,
        caption: kit.text?.content ?? prev.caption,
        captionPosition: kit.text?.position ?? prev.captionPosition,
        captionSize: kit.text?.fontSize ?? prev.captionSize,
        captionColor: kit.text?.color ?? prev.captionColor,
      }));
    }
    if (kit.formats?.length) {
      setFields((prev) => ({ ...prev, formats: kit.formats ?? [] }));
    }
  };

  const getProxiedUrl = (url: string): string => {
    if (url.startsWith("https://ipfs.io/ipfs/")) {
      return `/api/proxy?url=${encodeURIComponent(url)}`;
    }
    return url;
  };

  const getBestImageUrl = (commandResult: CommandResult): string =>
    commandResult.groveUrl || commandResult.resultUrl || "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setResult(null);

    try {
      const parseResponse = await fetch("/api/agent/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!parseResponse.ok) {
        throw new Error(`Error: ${parseResponse.status}`);
      }

      const parsedData = (await parseResponse.json()) as ParsedCommand;
      if (fields.logoUrl.trim()) parsedData.logoUrl = fields.logoUrl.trim();
      if (fields.caption.trim()) {
        parsedData.text = {
          content: fields.caption.trim(),
          position: fields.captionPosition,
          fontSize: fields.captionSize,
          color: fields.captionColor,
          style: "bold",
        };
      }
      setParsedCommand(parsedData);
      setShowConfirmation(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to parse command. Please try again.",
      );
    }
  };

  const handleConfirm = async () => {
    if (!parsedCommand) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command,
          parameters: buildParameters(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to process command. Please try again.";

      if (
        errorMessage.includes("504") ||
        errorMessage.includes("FUNCTION_INVOCATION_TIMEOUT")
      ) {
        setError(
          "The server is warming up. Please try again in a few moments.",
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      setShowConfirmation(false);
    }
  };

  const toggleFormat = (format: CampaignFormat) => {
    setFields((prev) => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter((f) => f !== format)
        : [...prev.formats, format],
    }));
  };

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Navigation />

      <div className="text-center mb-6">
        <Image
          src="/wowwowowify.png"
          alt="@toka"
          width={200}
          height={200}
          className="w-24 h-auto mx-auto mb-3"
          priority
        />
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ color: "var(--color-text)" }}
        >
          {STUDIO_COPY.command.title}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--color-text-secondary)" }}>
          {STUDIO_COPY.command.subtitle}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mb-8 space-y-5">
        <BrandKitPanel onLoad={applyBrandKit} compact />
        <div>
          <label htmlFor="command" className="block text-sm font-medium mb-2">
            Campaign brief
          </label>
          <textarea
            id="command"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder='e.g., Generate a futuristic launch visual with bold lighting'
            className="w-full p-3 border rounded-lg resize-none min-h-[80px] text-sm surface"
            required
            rows={3}
          />
        </div>

        <div>
          <label htmlFor="logoUrl" className="block text-sm font-medium mb-2">
            Brand mark URL <span className="font-normal opacity-60">(optional)</span>
          </label>
          <input
            id="logoUrl"
            type="url"
            value={fields.logoUrl}
            onChange={(e) =>
              setFields((prev) => ({ ...prev, logoUrl: e.target.value }))
            }
            placeholder="https://example.com/logo.png"
            className="w-full p-3 border rounded-lg text-sm surface"
          />
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            Public HTTPS URL — or upload a file to get a persistent Blob URL.
          </p>
          <label className="mt-2 inline-block px-3 py-2 text-xs surface rounded-lg cursor-pointer">
            {isUploadingLogo ? "Uploading…" : "Upload logo file"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={handleLogoFile}
              className="hidden"
            />
          </label>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="caption" className="block text-sm font-medium mb-2">
              Campaign copy <span className="font-normal opacity-60">(optional)</span>
            </label>
            <input
              id="caption"
              type="text"
              value={fields.caption}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, caption: e.target.value }))
              }
              placeholder="THE FUTURE SHIPS TODAY"
              className="w-full p-3 border rounded-lg text-sm surface"
            />
          </div>
          <div>
            <label htmlFor="captionPosition" className="block text-xs font-medium mb-1">
              Position
            </label>
            <select
              id="captionPosition"
              value={fields.captionPosition}
              onChange={(e) =>
                setFields((prev) => ({ ...prev, captionPosition: e.target.value }))
              }
              className="w-full p-2 border rounded-lg text-sm surface"
            >
              <option value="bottom">Bottom</option>
              <option value="top">Top</option>
              <option value="center">Center</option>
            </select>
          </div>
          <div>
            <label htmlFor="captionSize" className="block text-xs font-medium mb-1">
              Size: {fields.captionSize}px
            </label>
            <input
              id="captionSize"
              type="range"
              min="24"
              max="96"
              value={fields.captionSize}
              onChange={(e) =>
                setFields((prev) => ({
                  ...prev,
                  captionSize: parseInt(e.target.value, 10),
                }))
              }
              className="w-full accent-current"
            />
          </div>
        </div>

        <div>
          <FormatSelector
            selected={fields.formats}
            onToggle={toggleFormat}
          />
        </div>

        <div className="flex justify-center">
          <button
            type="submit"
            disabled={loading || showConfirmation}
            className="px-6 py-2.5 text-white rounded-lg font-medium transition-opacity disabled:opacity-50"
            style={{ backgroundColor: "var(--color-wowowify)" }}
          >
            {loading ? "Processing…" : STUDIO_COPY.command.preview}
          </button>
        </div>
      </form>

      {loading && (
        <div className="p-4 mb-4 surface rounded-lg text-center">
          <LoadingIndicator />
        </div>
      )}

      {error && (
        <div className="p-4 mb-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
          {error}
        </div>
      )}

      {showConfirmation && parsedCommand && (
        <div className="p-4 mb-4 surface rounded-lg border">
          <h2 className="text-lg font-semibold mb-4 text-center">Confirm</h2>
          <div className="bg-white dark:bg-gray-900 p-3 rounded-lg border mb-4 text-sm space-y-2">
            {parsedCommand.prompt && (
              <p>
                <strong>Brief:</strong> {parsedCommand.prompt}
              </p>
            )}
            {parsedCommand.logoUrl && (
              <p>
                <strong>Brand mark:</strong>{" "}
                <span className="break-all">{parsedCommand.logoUrl}</span>
              </p>
            )}
            {parsedCommand.overlayMode && (
              <p>
                <strong>Preset:</strong> {parsedCommand.overlayMode}
              </p>
            )}
            {parsedCommand.text?.content && (
              <p>
                <strong>Campaign copy:</strong> &ldquo;{parsedCommand.text.content}&rdquo;
              </p>
            )}
            {fields.formats.length > 0 && (
              <p>
                <strong>Formats:</strong> {fields.formats.join(", ")}
              </p>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={handleConfirm}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Create artwork
            </button>
            <Link
              href={studioUrl}
              className="px-4 py-2 surface rounded-lg hover:shadow-md"
              style={{ color: "var(--color-wowowify)" }}
            >
              {STUDIO_COPY.command.openStudio}
            </Link>
            <button
              onClick={() => {
                setShowConfirmation(false);
                setParsedCommand(null);
              }}
              className="px-4 py-2 surface rounded-lg"
              style={{ color: "var(--color-text-secondary)" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {result && (
        <div className="p-4 mb-8 surface rounded-lg border">
          <h2 className="text-lg font-semibold mb-4 text-center">Result</h2>
          {result.status === "completed" && result.draftId && (
            <div className="mb-4 p-3 rounded-lg border text-sm space-y-2">
              <p>
                <strong>Draft ID:</strong>{" "}
                <code className="text-xs break-all">{result.draftId}</code>
              </p>
              {result.studioReviewUrl && (
                <Link
                  href={result.studioReviewUrl}
                  className="inline-block px-4 py-2 text-white rounded-lg"
                  style={{ backgroundColor: "var(--color-wowowify)" }}
                >
                  Open in Studio for approval
                </Link>
              )}
            </div>
          )}
          {result.status === "completed" && result.assets && result.assets.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              {result.assets.map((asset) => {
                const url = asset.resultUrl || asset.previewUrl;
                if (!url) return null;
                return (
                  <div key={asset.format} className="text-center">
                    <p className="text-xs mb-1 capitalize">{asset.format}</p>
                    <div className="relative w-full aspect-square mb-2">
                      <Image
                        src={getProxiedUrl(url)}
                        alt={`${asset.format} artwork`}
                        fill
                        className="object-contain rounded-lg border"
                        unoptimized
                      />
                    </div>
                    <a
                      href={url}
                      download={`toka-${asset.format}.png`}
                      className="text-xs underline"
                    >
                      Export {asset.format}
                    </a>
                  </div>
                );
              })}
            </div>
          )}
          {result.status === "completed" && result.resultUrl && !result.assets?.length && (
            <div className="flex flex-col items-center">
              <div className="relative w-full max-w-md mb-4">
                <Image
                  src={getProxiedUrl(getBestImageUrl(result))}
                  alt="Generated artwork"
                  width={512}
                  height={512}
                  className="w-full h-auto rounded-lg border"
                />
              </div>
              <a
                href={getBestImageUrl(result)}
                download
                className="px-4 py-2 text-white rounded-lg mb-4"
                style={{ backgroundColor: "var(--color-wowowify)" }}
              >
                Export
              </a>
              <p className="text-sm text-center" style={{ color: "var(--color-text-secondary)" }}>
                Download to keep — temporary URLs may expire.
              </p>
            </div>
          )}
          {result.status === "failed" && (
            <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg text-center">
              {result.error || "Failed to process the command"}
            </div>
          )}
        </div>
      )}

      <div className="mb-8 p-4 surface rounded-lg border text-sm space-y-3">
        <h2 className="text-base font-semibold">Examples</h2>
        <p style={{ color: "var(--color-text-secondary)" }}>
          <strong>Brand campaign:</strong>{" "}
          <span className="font-mono text-xs">
            Generate a product launch visual. Scale to 0.5. --text &quot;SHIPS TODAY&quot;
          </span>
        </p>
        <p style={{ color: "var(--color-text-secondary)" }}>
          <strong>With logo URL:</strong> add a public logo URL above, or use{" "}
          <span className="font-mono text-xs">POST /api/agent</span> with{" "}
          <span className="font-mono text-xs">parameters.logoUrl</span>.
        </p>
        <p style={{ color: "var(--color-text-secondary)" }}>
          See <code className="text-xs">docs/TOKA_GUIDE.md</code> in the repo for Farcaster bot syntax and community preset names.
        </p>
      </div>
    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={<LoadingIndicator />}>
      <AgentContent />
    </Suspense>
  );
}
