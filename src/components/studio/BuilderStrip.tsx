"use client";

import { useCallback, useMemo, useState } from "react";
import { DEFAULT_ASP_PUBLIC_URL, STUDIO_COPY } from "@/lib/studio-copy";
import { useToast } from "@/components/ui/Toast";

const OKX_ASP_TUTORIAL = "https://www.okx.ai/tutorial/asp";

interface BuilderStripProps {
  /** Optional review URL to surface copy-to-clipboard distribution. */
  reviewUrl?: string;
  compact?: boolean;
}

export function BuilderStrip({ reviewUrl, compact = false }: BuilderStripProps) {
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const aspOrigin = useMemo(
    () =>
      (typeof process !== "undefined" &&
        process.env.NEXT_PUBLIC_ASP_URL?.trim()) ||
      DEFAULT_ASP_PUBLIC_URL,
    [],
  );

  const links = useMemo(
    () => ({
      discovery: `${aspOrigin}/.well-known/agent.json`,
      service: `${aspOrigin}/api/agent`,
    }),
    [aspOrigin],
  );

  const copy = useCallback(
    async (label: string, value: string) => {
      try {
        await navigator.clipboard.writeText(value);
        setCopiedKey(label);
        toast.showSuccess(STUDIO_COPY.command.copied);
        setTimeout(() => setCopiedKey(null), 2000);
      } catch {
        toast.showError("Could not copy — select and copy manually");
      }
    },
    [toast],
  );

  return (
    <section
      className={`surface rounded-xl border ${compact ? "p-3" : "p-4"} space-y-3 text-sm`}
    >
      <div>
        <h2 className="font-semibold" style={{ color: "var(--color-text)" }}>
          {reviewUrl ? STUDIO_COPY.command.resultTitle : STUDIO_COPY.builder.title}
        </h2>
        {reviewUrl && (
          <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
            {STUDIO_COPY.command.shareReviewHint}
          </p>
        )}
      </div>

      {reviewUrl && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copy("review", reviewUrl)}
            className="px-3 py-2 text-white rounded-lg text-xs font-medium"
            style={{ backgroundColor: "var(--color-wowowify)" }}
          >
            {copiedKey === "review"
              ? STUDIO_COPY.command.copied
              : STUDIO_COPY.command.shareReview}
          </button>
          <a
            href={reviewUrl}
            className="px-3 py-2 surface rounded-lg text-xs font-medium"
            style={{ color: "var(--color-wowowify)" }}
          >
            {STUDIO_COPY.command.openStudio}
          </a>
        </div>
      )}

      {!compact && (
        <>
          <div className="grid gap-2">
            {(
              [
                ["discovery", STUDIO_COPY.builder.discovery, links.discovery],
                ["service", STUDIO_COPY.builder.service, links.service],
              ] as const
            ).map(([key, label, url]) => (
              <div
                key={key}
                className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2"
              >
                <span
                  className="text-xs font-medium shrink-0 sm:w-36"
                  style={{ color: "var(--color-text-secondary)" }}
                >
                  {label}
                </span>
                <code className="text-xs break-all flex-1 opacity-80">{url}</code>
                <button
                  type="button"
                  onClick={() => void copy(key, url)}
                  className="text-xs font-medium shrink-0 px-2 py-1 rounded surface"
                  style={{ color: "var(--color-wowowify)" }}
                >
                  {copiedKey === key ? "Copied" : "Copy"}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
            {STUDIO_COPY.builder.registerHint}{" "}
            <a
              href={OKX_ASP_TUTORIAL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
              style={{ color: "var(--color-wowowify)" }}
            >
              {STUDIO_COPY.builder.register}
            </a>
          </p>
        </>
      )}
    </section>
  );
}
