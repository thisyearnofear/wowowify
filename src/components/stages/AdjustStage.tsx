import React from "react";
import { OverlayMode, OVERLAY_COLORS } from "@/lib/config/overlays";

interface TextControls {
  content: string;
  position: string;
  fontSize: number;
  color: string;
  style: string;
}

interface AdjustStageProps {
  mode: OverlayMode;
  controls: {
    scale: number;
    x: number;
    y: number;
  };
  updateControl: (key: "scale" | "x" | "y", value: number) => void;
  onDownload: () => void;
  onBack: () => void;
  showControls?: boolean;
  /** Text overlay controls — when provided, shows text editing section */
  text?: TextControls;
  updateText?: (key: keyof TextControls, value: string | number) => void;
}

const TEXT_POSITIONS = [
  "bottom",
  "top",
  "center",
  "bottom-left",
  "bottom-right",
  "top-left",
  "top-right",
] as const;

const TEXT_STYLES = ["bold", "normal", "serif", "monospace"] as const;

const TEXT_COLORS = ["white", "black", "red", "yellow", "cyan", "lime"] as const;

export const AdjustStage = ({
  mode,
  controls,
  updateControl,
  onDownload,
  onBack,
  showControls = true,
  text,
  updateText,
}: AdjustStageProps) => {
  return (
    <div className="animate-fadeIn">
      {showControls && (
        <div className={`mb-4 md:mb-6 ${OVERLAY_COLORS[mode]?.text || "text-gray-700"}`}>
          {/* Overlay position/scale controls */}
          <div className="flex flex-row md:flex-col gap-4">
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={controls.scale}
                onChange={(e) =>
                  updateControl("scale", parseFloat(e.target.value))
                }
                className="w-full accent-current"
              />
              <span className="text-xs text-center">
                Scale: {controls.scale.toFixed(1)}x
              </span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min="-500"
                max="500"
                value={controls.x}
                onChange={(e) => updateControl("x", parseInt(e.target.value))}
                className="w-full accent-current"
              />
              <span className="text-xs text-center">X: {controls.x}px</span>
            </div>
            <div className="flex-1 flex flex-col gap-1">
              <input
                type="range"
                min="-500"
                max="500"
                value={controls.y}
                onChange={(e) => updateControl("y", parseInt(e.target.value))}
                className="w-full accent-current"
              />
              <span className="text-xs text-center">Y: {controls.y}px</span>
            </div>
          </div>

          {/* Text overlay controls */}
          {text && updateText && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3
                className={`text-sm font-semibold mb-3 ${
                  OVERLAY_COLORS[mode]?.text || "text-gray-700"
                }`}
              >
                ✏️ Text Overlay
              </h3>

              {/* Text content input */}
              <div className="mb-3">
                <input
                  type="text"
                  value={text.content}
                  onChange={(e) => updateText("content", e.target.value)}
                  placeholder="Enter text to overlay..."
                  className="w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-current focus:border-transparent"
                  maxLength={100}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Position selector */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Position</label>
                  <select
                    value={text.position}
                    onChange={(e) => updateText("position", e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {TEXT_POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Style selector */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Style</label>
                  <select
                    value={text.style}
                    onChange={(e) => updateText("style", e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border rounded bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
                  >
                    {TEXT_STYLES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Font size slider */}
                <div>
                  <label className="text-xs font-medium mb-1 block">
                    Size: {text.fontSize}px
                  </label>
                  <input
                    type="range"
                    min="12"
                    max="120"
                    value={text.fontSize}
                    onChange={(e) =>
                      updateText("fontSize", parseInt(e.target.value))
                    }
                    className="w-full accent-current"
                  />
                </div>

                {/* Color selector */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Color</label>
                  <div className="flex gap-1 flex-wrap">
                    {TEXT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => updateText("color", c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          text.color === c
                            ? "scale-125 border-current"
                            : "border-gray-300 dark:border-gray-600"
                        }`}
                        style={{
                          backgroundColor: c === "white" ? "#fff" : c,
                        }}
                        aria-label={`Set text color to ${c}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3 justify-center">
        <button
          onClick={onDownload}
          className={`flex-1 p-2 md:px-6 md:py-3 rounded-lg transition-all flex items-center justify-center gap-2 ${
            OVERLAY_COLORS[mode]?.active?.split(" ")[0] ||
            (mode === "ghiblify"
              ? "bg-pink-600"
              : "bg-gray-600")
          } hover:opacity-90 text-white`}
        >
          <span className="hidden md:inline">Download</span>
          <span>⬇️</span>
        </button>
        <button
          onClick={onBack}
          className="flex-1 p-2 md:px-6 md:py-3 surface rounded-lg transition-all flex items-center justify-center gap-2 hover:shadow-md"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span className="hidden md:inline">Back</span>
          <span>←</span>
        </button>
      </div>
    </div>
  );
};
