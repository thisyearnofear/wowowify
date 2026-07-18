"use client";

import { STUDIO_COPY } from "@/lib/studio-copy";

type BrandKitHeroVariant = "studio" | "agent" | "compact";

interface BrandKitHeroProps {
  variant?: BrandKitHeroVariant;
  /** Used with variant="compact" on the agent page. */
  compactContext?: "studio" | "agent";
}

export function BrandKitHero({
  variant = "studio",
  compactContext = "studio",
}: BrandKitHeroProps) {
  const copy = STUDIO_COPY.brandKitV1;
  const isCompact = variant === "compact";

  if (isCompact) {
    return (
      <div
        className="rounded-xl border p-4 text-left space-y-2"
        style={{ borderColor: "var(--color-border)" }}
      >
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-wowowify)" }}
        >
          {copy.badge}
        </p>
        <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
          {copy.headline}
        </p>
        <p className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
          {compactContext === "agent" ? copy.ctaAgent : copy.ctaStudio}
        </p>
      </div>
    );
  }

  return (
    <section className="w-full max-w-3xl mx-auto text-center space-y-4">
      <p
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-wowowify)" }}
      >
        {copy.badge}
      </p>
      <h2
        className="text-lg sm:text-xl font-bold tracking-tight leading-snug"
        style={{ color: "var(--color-text)" }}
      >
        {copy.headline}
      </h2>
      <p
        className="text-sm sm:text-base max-w-2xl mx-auto"
        style={{ color: "var(--color-text-secondary)" }}
      >
        {copy.promise}
      </p>

      <div className="grid sm:grid-cols-3 gap-3 text-left pt-2 max-w-2xl mx-auto">
        {copy.pillars.map((pillar) => (
          <div
            key={pillar.title}
            className="surface rounded-xl p-3 border"
            style={{ borderColor: "var(--color-border)" }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
              {pillar.title}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-secondary)" }}>
              {pillar.body}
            </p>
          </div>
        ))}
      </div>

      <p className="text-xs max-w-xl mx-auto" style={{ color: "var(--color-text-secondary)" }}>
        {copy.apiLine}
      </p>
      {variant === "agent" && (
        <p className="text-xs max-w-xl mx-auto opacity-80" style={{ color: "var(--color-text-secondary)" }}>
          {copy.complianceLine}
        </p>
      )}
    </section>
  );
}
