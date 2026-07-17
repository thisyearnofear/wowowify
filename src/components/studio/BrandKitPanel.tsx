"use client";

import { useCallback, useEffect, useState } from "react";
import type { BrandKit } from "@/lib/brand-kits";
import { STUDIO_COPY } from "@/lib/studio-copy";

export type BrandKitDefaults = Pick<
  BrandKit,
  "logoUrl" | "text" | "controls" | "formats"
>;

interface BrandKitPanelProps {
  onLoad: (kit: BrandKit) => void;
  onSave?: () => BrandKitDefaults | null;
  compact?: boolean;
  theme?: "light" | "dark";
}

export function BrandKitPanel({
  onLoad,
  onSave,
  compact = false,
  theme = "light",
}: BrandKitPanelProps) {
  const isDark = theme === "dark";
  const fieldClass = isDark
    ? "flex-1 p-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm"
    : "flex-1 p-2 rounded-lg surface text-sm";
  const panelClass = isDark
    ? "rounded-lg border border-gray-700 bg-gray-800/80 p-3 space-y-3 text-sm"
    : `rounded-lg border p-3 space-y-3 ${compact ? "text-xs" : "text-sm"}`;
  const [kits, setKits] = useState<BrandKit[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/brand-kits");
      const data = (await response.json()) as { kits?: BrandKit[] };
      setKits(data.kits ?? []);
    } catch {
      setKits([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleLoad = () => {
    const kit = kits.find((entry) => entry.id === selectedId);
    if (!kit) return;
    onLoad(kit);
    setMessage(STUDIO_COPY.brandKit.loaded);
  };

  const handleSave = async () => {
    if (!onSave || !saveName.trim()) return;
    const payload = onSave();
    if (!payload) return;

    try {
      const response = await fetch("/api/brand-kits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName.trim(),
          logoUrl: payload.logoUrl,
          text: payload.text,
          controls: payload.controls,
          formats: payload.formats,
        }),
      });
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error || "Save failed");
      }
      setSaveName("");
      setMessage(STUDIO_COPY.brandKit.saved);
      await refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Save failed");
    }
  };

  return (
    <div
      className={panelClass}
      style={isDark ? undefined : { borderColor: "var(--color-border)" }}
    >
      <div className="space-y-2">
        <label
          className="block font-medium"
          style={{ color: isDark ? "#f3f4f6" : "var(--color-text)" }}
        >
          {STUDIO_COPY.brandKit.load}
        </label>
        <div className="flex gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className={fieldClass}
            disabled={loading || kits.length === 0}
          >
            <option value="">
              {loading ? "Loading…" : kits.length ? "Select a kit" : STUDIO_COPY.brandKit.empty}
            </option>
            {kits.map((kit) => (
              <option key={kit.id} value={kit.id}>
                {kit.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLoad}
            disabled={!selectedId}
            className="px-3 py-2 rounded-lg text-white text-sm disabled:opacity-50"
            style={{ backgroundColor: "var(--color-wowowify)" }}
          >
            Load
          </button>
        </div>
      </div>

      {onSave && (
        <div
          className={`space-y-2 pt-2 border-t ${isDark ? "border-gray-700" : ""}`}
          style={isDark ? undefined : { borderColor: "var(--color-border)" }}
        >
          <label
            className="block font-medium"
            style={{ color: isDark ? "#f3f4f6" : "var(--color-text)" }}
          >
            {STUDIO_COPY.brandKit.save}
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder={STUDIO_COPY.brandKit.namePlaceholder}
              className={fieldClass}
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!saveName.trim()}
              className={`px-3 py-2 rounded-lg text-sm disabled:opacity-50 ${
                isDark ? "bg-gray-700 text-white" : "surface"
              }`}
              style={isDark ? undefined : { color: "var(--color-wowowify)" }}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {message && (
        <p
          className="text-xs"
          style={{ color: isDark ? "#9ca3af" : "var(--color-text-secondary)" }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
