import { CAMPAIGN_FORMATS, type CampaignFormat } from "@/lib/agent-types";
import { STUDIO_COPY } from "@/lib/studio-copy";

interface FormatSelectorProps {
  selected: CampaignFormat[];
  onToggle: (format: CampaignFormat) => void;
  compact?: boolean;
  theme?: "light" | "dark";
}

export function FormatSelector({
  selected,
  onToggle,
  compact = false,
  theme = "light",
}: FormatSelectorProps) {
  const unselectedClass =
    theme === "dark"
      ? "bg-gray-800 border-gray-700 text-gray-300"
      : "surface";
  return (
    <div>
      <span
        className={`block font-medium mb-2 ${compact ? "text-xs" : "text-sm"}`}
        style={{ color: "var(--color-text)" }}
      >
        {STUDIO_COPY.refine.outputFormats}
      </span>
      {!compact && (
        <p
          className="text-xs mb-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          {STUDIO_COPY.refine.formatsHint}
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {CAMPAIGN_FORMATS.map((format) => {
          const isSelected = selected.includes(format);
          return (
            <button
              key={format}
              type="button"
              onClick={() => onToggle(format)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                isSelected ? "text-white border-transparent" : unselectedClass
              }`}
              style={
                isSelected
                  ? { backgroundColor: "var(--color-wowowify)" }
                  : theme === "light"
                    ? { color: "var(--color-text-secondary)" }
                    : undefined
              }
            >
              {format}
            </button>
          );
        })}
      </div>
    </div>
  );
}
