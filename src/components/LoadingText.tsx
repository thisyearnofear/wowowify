export const LoadingText = () => {
  const colors = [
    "var(--color-degenify)",
    "var(--color-higherify)",
    "var(--color-scrollify)",
    "var(--color-wowowify)",
    "var(--color-degenify)",
  ];

  return (
    <div className="flex items-center justify-center gap-0.5">
      {Array.from("wowow").map((letter, i) => (
        <span
          key={i}
          className="inline-block text-lg font-bold"
          style={{
            color: colors[i % colors.length],
            animationDelay: `${i * 0.12}s`,
            animation: "bounce 0.6s ease-in-out infinite",
          }}
        >
          {letter}
        </span>
      ))}
    </div>
  );
};
