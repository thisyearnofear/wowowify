"use client";

import Link from "next/link";
import { STUDIO_COPY } from "@/lib/studio-copy";

const PATHS = [
  {
    href: "/",
    ...STUDIO_COPY.paths.studio,
    icon: "🎨",
  },
  {
    href: "/agent",
    ...STUDIO_COPY.paths.agent,
    icon: "🤖",
  },
  {
    href: "/frames",
    ...STUDIO_COPY.paths.farcaster,
    icon: "⚡",
  },
] as const;

export function StudioHero() {
  return (
    <section className="w-full max-w-3xl mx-auto mb-6 text-center space-y-4">
      <p
        className="text-xs font-semibold uppercase tracking-wider"
        style={{ color: "var(--color-wowowify)" }}
      >
        Agentic Brand Studio
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

      <div className="pt-2">
        <p
          className="text-xs font-medium mb-3"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {STUDIO_COPY.paths.title}
        </p>
        <div className="grid sm:grid-cols-3 gap-3 text-left">
          {PATHS.map(({ href, label, hint, cta, icon }) => (
            <Link
              key={href}
              href={href}
              className="surface rounded-xl p-3 border transition-shadow hover:shadow-md block"
            >
              <div className="flex items-center gap-2 mb-1">
                <span aria-hidden>{icon}</span>
                <span className="text-sm font-semibold" style={{ color: "var(--color-text)" }}>
                  {label}
                </span>
              </div>
              <p className="text-xs mb-2" style={{ color: "var(--color-text-secondary)" }}>
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
      </div>
    </section>
  );
}
