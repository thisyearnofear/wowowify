import React from "react";
import {
  OverlayMode,
  OVERLAY_COLORS,
  OVERLAY_DESCRIPTIONS,
  PRESET_OVERLAY_PATHS,
  AI_TRANSFORM_MODES,
} from "@/lib/config/overlays";

/** Reusable overlay mode button with color theming, tooltip, and preview thumbnail */
function OverlayButton({
  mode: currentMode,
  onClick,
  name,
  icon,
}: {
  mode: OverlayMode;
  onClick: (mode: OverlayMode) => void;
  name: OverlayMode;
  icon: string;
}) {
  const colors = OVERLAY_COLORS[name] || OVERLAY_COLORS.wowowify;
  const isActive = currentMode === name;
  const description = OVERLAY_DESCRIPTIONS[name] || "";
  const tooltipId = `tooltip-${name}`;
  const presetPath = PRESET_OVERLAY_PATHS[name];
  const isAITransform = AI_TRANSFORM_MODES.includes(name);

  return (
    <div className="tooltip-wrapper">
      <button
        data-theme={name}
        onClick={() => onClick(name)}
        title={description}
        aria-describedby={description ? tooltipId : undefined}
        className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 relative overflow-hidden
          ${isActive ? colors.active : `${colors.bg} ${colors.text} ${colors.hover}`}`}
      >
        {/* Preview thumbnail */}
        <div className="w-10 h-10 rounded flex items-center justify-center overflow-hidden bg-white/50">
          {presetPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={presetPath}
              alt={`${name} overlay preview`}
              className="w-full h-full object-contain"
            />
          ) : isAITransform ? (
            <span className="text-2xl">{icon}</span>
          ) : name === "wowowify" ? (
            <span className="text-2xl">{icon}</span>
          ) : (
            <span className="text-lg">{icon}</span>
          )}
        </div>
        <span className="text-xs font-medium capitalize">{name}</span>
      </button>
      {description && (
        <span id={tooltipId} role="tooltip" className="tooltip">
          {description}
        </span>
      )}
    </div>
  );
}

interface StyleStageProps {
  mode: OverlayMode;
  controls: {
    overlayAlpha: number;
  };
  updateControl: (
    key: "overlayColor" | "overlayAlpha",
    value: string | number
  ) => void;
  loadPresetOverlay: (mode: OverlayMode) => void;
  onStartOver: () => void;
}

export const StyleStage = ({
  mode,
  controls,
  updateControl,
  loadPresetOverlay,
  onStartOver,
}: StyleStageProps) => {
  return (
    <div className="animate-fadeIn">
      <h3
        className="text-lg font-medium mb-4 text-center"
        style={{ color: "var(--color-text)" }}
      >
        Choose Style or Transform
      </h3>

      <div className="mb-6">
        <h4
          className="text-sm font-medium mb-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          Overlays
        </h4>
        <div className="mb-4">
          <h5
            className="text-xs mb-2"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Background Color
          </h5>
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => updateControl("overlayColor", "#000000")}
              className={`w-6 h-6 rounded-full bg-black border-2 ${
                mode === "degenify"
                  ? "border-violet-400"
                  : "border-gray-200 hover:border-gray-400"
              } transition-colors`}
              aria-label="Black background"
            />
            <button
              onClick={() => updateControl("overlayColor", "#4F46E5")}
              className={`w-6 h-6 rounded-full bg-violet-600 border-2 ${
                mode === "higherify"
                  ? "border-violet-400"
                  : "border-gray-200 hover:border-gray-400"
              } transition-colors`}
              aria-label="Purple background"
            />
            <button
              onClick={() => updateControl("overlayColor", "#059669")}
              className={`w-6 h-6 rounded-full bg-emerald-600 border-2 ${
                mode === "scrollify"
                  ? "border-violet-400"
                  : "border-gray-200 hover:border-gray-400"
              } transition-colors`}
              aria-label="Green background"
            />
            <button
              onClick={() => updateControl("overlayColor", "#FFFFFF")}
              className={`w-6 h-6 rounded-full bg-white border-2 ${
                mode === "wowowify"
                  ? "border-violet-400"
                  : "border-gray-200 hover:border-gray-400"
              } transition-colors`}
              aria-label="White background"
            />
          </div>
          <div className="flex flex-col gap-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={controls.overlayAlpha}
              onChange={(e) =>
                updateControl("overlayAlpha", parseFloat(e.target.value))
              }
              className="w-full accent-current"
            />
            <span className="text-xs text-center">
              Opacity: {(controls.overlayAlpha * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="wowowify" icon="🎨" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="degenify" icon="🎩" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="higherify" icon="↑" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="scrollify" icon="📜" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="baseify" icon="🔵" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="lensify" icon="📷" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="higherise" icon="🏔️" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="dickbuttify" icon="😏" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="nikefy" icon="✔️" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="nounify" icon="👓" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="clankerify" icon="⚙️" />
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="mantleify" icon="🌋" />
        </div>
      </div>

      <div className="mb-6">
        <h4
          className="text-sm font-medium text-center mb-2"
          style={{ color: "var(--color-text-secondary)" }}
        >
          AI Transformations
        </h4>
        <div className="flex justify-center">
          <OverlayButton mode={mode} onClick={loadPresetOverlay} name="ghiblify" icon="✨" />
        </div>
      </div>

      <div className="mt-6 text-center">
        <button
          onClick={onStartOver}
          className="surface px-4 py-2 rounded-lg transition-all flex items-center justify-center gap-2 mx-auto text-sm hover:shadow-md"
          style={{ color: "var(--color-text-secondary)" }}
        >
          <span>←</span>
          <span>Start Over</span>
        </button>
      </div>
    </div>
  );
};
