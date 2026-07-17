"use client";

import { STUDIO_COPY } from "@/lib/studio-copy";

interface DraftReviewBannerProps {
  draftId?: string;
}

export function DraftReviewBanner({ draftId }: DraftReviewBannerProps) {
  if (!draftId) return null;

  return (
    <div
      className="w-full max-w-4xl mx-auto mb-4 rounded-xl border p-4 text-sm"
      style={{
        backgroundColor: "color-mix(in srgb, var(--color-wowowify) 8%, transparent)",
        borderColor: "var(--color-wowowify)",
      }}
      role="status"
    >
      <p className="font-semibold" style={{ color: "var(--color-text)" }}>
        {STUDIO_COPY.draft.bannerTitle}
      </p>
      <p className="mt-1" style={{ color: "var(--color-text-secondary)" }}>
        {STUDIO_COPY.draft.bannerBody}
      </p>
      <p className="mt-2 text-xs font-mono opacity-70 break-all">draft:{draftId}</p>
    </div>
  );
}
