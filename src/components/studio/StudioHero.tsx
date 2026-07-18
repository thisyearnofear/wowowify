"use client";

import Link from "next/link";
import { STUDIO_COPY } from "@/lib/studio-copy";
import { BrandKitHero } from "@/components/studio/BrandKitHero";

const ACTIVE_PATHS = [
  {
    href: "/",
    ...STUDIO_COPY.paths.studio,
  },
  {
    href: "/agent",
    ...STUDIO_COPY.paths.agent,
  },
] as const;

export function StudioHero() {
  return (
    <section className="w-full max-w-3xl mx-auto mb-6 space-y-6">
      <div className="text-center space-y-2">
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: "var(--color-wowowify)" }}
        >
          {STUDIO_COPY.portfolioLine}
        </p>
        <h2
          className="text-lg sm:text-xl font-bold tracking-tight leading-snug"
          style={{ color: "var(--color-text)" }}
        >
          {STUDIO_COPY.headline}
        </h2>
        <p
          className="text-sm sm:text-base max-w-xl mx-auto"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {STUDIO_COPY.tagline}
        </p>
        <p
          className="text-xs max-w-md mx-auto"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {STUDIO_COPY.audience}
        </p>
      </div>

      <BrandKitHero variant="studio" />

      <div className="text-center pt-2">
        <p
          className="text-xs font-medium mb-3"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {STUDIO_COPY.paths.title}
        </p>
        <div className="grid sm:grid-cols-2 gap-3 text-left max-w-xl mx-auto">
          {ACTIVE_PATHS.map(({ href, label, hint, cta }) => (
            <Link
              key={href}
              href={href}
              className="surface rounded-xl p-3 border transition-shadow hover:shadow-md block"
            >
              <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                {label}
              </span>
              <p className="text-xs mt-1 mb-2" style={{ color: "var(--color-text-secondary)" }}>
                {hint}
              </p>
              <span
                className="text-xs font-medium"
                style={{ color: "var(--color-wowowify)" }}
              >
                {cta} →
              </span>
            </Link>
          ))}
        </div>
        <p
          className="text-xs mt-3 opacity-70"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {STUDIO_COPY.paths.farcaster.label}: {STUDIO_COPY.paths.farcaster.hint}
        </p>
      </div>
    </section>
  );
}
