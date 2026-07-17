export const LoadingText = () => (
  <span
    className="inline-flex items-center gap-1 text-sm font-medium"
    style={{ color: "var(--color-wowowify)" }}
  >
    Creating
    <span className="inline-flex">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="inline-block animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        >
          .
        </span>
      ))}
    </span>
  </span>
);
