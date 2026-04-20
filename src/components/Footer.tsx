export default function Footer() {
  return (
    <footer className="glass border-t" style={{ borderColor: "var(--color-border)" }}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between text-xs" style={{ color: "var(--color-text-secondary)" }}>
          <span className="opacity-60">built with ✨ by</span>
          <a
            href="https://hey.xyz/u/papajams"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium transition-colors hover:opacity-80"
            style={{ color: "var(--color-wowowify)" }}
          >
            papa
          </a>
        </div>
      </div>
    </footer>
  );
}
