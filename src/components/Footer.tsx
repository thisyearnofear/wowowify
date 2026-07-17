import Link from "next/link";
import { DEFAULT_ASP_PUBLIC_URL, STUDIO_COPY } from "@/lib/studio-copy";
import { BRAND } from "@/lib/brand";

export default function Footer() {
  const aspOrigin =
    process.env.NEXT_PUBLIC_ASP_URL?.trim() || DEFAULT_ASP_PUBLIC_URL;

  return (
    <footer className="glass border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-7xl mx-auto px-4 py-4 space-y-3">
        <p className="text-xs text-center" style={{ color: "var(--color-text-secondary)" }}>
          {STUDIO_COPY.footer.tagline}
        </p>
        <div
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <Link
            href="/agent"
            className="font-medium hover:opacity-80"
            style={{ color: "var(--color-wowowify)" }}
          >
            Command
          </Link>
          <a
            href={`${aspOrigin}/.well-known/agent.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80"
          >
            agent.json
          </a>
          <a
            href={BRAND.urls.portfolio}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80"
          >
            {BRAND.portfolio}
          </a>
          <a
            href="https://www.okx.ai/tutorial/asp"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80"
          >
            OKX ASP
          </a>
        </div>
        <div
          className="flex items-center justify-between text-xs pt-1 border-t"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          <span className="opacity-60">{STUDIO_COPY.portfolioLine}</span>
          <a
            href={BRAND.urls.portfolio}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-wowowify)" }}
          >
            {BRAND.portfolio}
          </a>
        </div>
      </div>
    </footer>
  );
}
