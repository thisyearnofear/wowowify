import { useState, useRef, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import debounce from "lodash/debounce";
import { InitialStage } from "./stages/InitialStage";
import { StyleStage } from "./stages/StyleStage";
import { AdjustStage } from "./stages/AdjustStage";
import { GenerateModal } from "./modals/GenerateModal";
import { LoadingText } from "./LoadingText";
import { StudioStepper } from "./studio/StudioStepper";
import { BrandKitPanel, type BrandKitDefaults } from "./studio/BrandKitPanel";
import type { BrandKit } from "@/lib/brand-kits";
import type { CampaignFormat } from "@/lib/agent-types";
import type { CampaignDraft } from "@/lib/campaign-drafts";
import { cropCanvasToFormat, triggerDownload } from "@/lib/campaign-formats";
import { buildZipFromDataUrls, triggerZipDownload } from "@/lib/export-zip";
import { uploadLogoFile } from "@/lib/upload-logo-client";
import {
  OverlayMode,
  PRESET_OVERLAY_PATHS,
  AI_TRANSFORM_MODES,
} from "@/lib/config/overlays";
import { useToast } from "./ui/Toast";

// Re-export for backward compatibility with components that import from here
export type { OverlayMode } from "@/lib/config/overlays";

interface OverlayControls {
  scale: number;
  x: number;
  y: number;
  overlayColor: string;
  overlayAlpha: number;
}

export type Stage = "initial" | "style" | "adjust";

/** Word-wrap text into lines that fit within maxWidth on the given canvas context */
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = words[0] || "";

  for (let i = 1; i < words.length; i++) {
    const testLine = `${currentLine} ${words[i]}`;
    if (ctx.measureText(testLine).width > maxWidth) {
      lines.push(currentLine);
      currentLine = words[i];
    } else {
      currentLine = testLine;
    }
  }
  lines.push(currentLine);
  return lines;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export default function ImageOverlay() {
  const toast = useToast();
  const searchParams = useSearchParams();
  const pendingLogoUrlRef = useRef<string | null>(null);
  const didAutostartRef = useRef(false);
  // Tracks every URL.createObjectURL we mint so we can revoke on unmount,
  // on preset swap, and on "start over". Previously the cleanup-return-
  // from-handler anti-pattern caused leaks across mode switches.
  const activeObjectUrlsRef = useRef<Set<string>>(new Set());

  const trackObjectUrl = useCallback((url: string) => {
    activeObjectUrlsRef.current.add(url);
    return url;
  }, []);

  const revokeAllObjectUrls = useCallback(() => {
    const urls = activeObjectUrlsRef.current;
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls.clear();
  }, []);

  useEffect(() => {
    return () => revokeAllObjectUrls();
  }, [revokeAllObjectUrls]);

  const [baseImage, setBaseImage] = useState<File | null>(null);
  const [overlayImage, setOverlayImage] = useState<File | null>(null);
  const [basePreviewUrl, setBasePreviewUrl] = useState<string>("");
  const [overlayPreviewUrl, setOverlayPreviewUrl] = useState<string>("");
  const [combinedPreviewUrl, setCombinedPreviewUrl] = useState<string>("");
  const [mode, setMode] = useState<OverlayMode>("wowowify");
  const [isTransforming, setIsTransforming] = useState(false);
  const [controls, setControls] = useState<OverlayControls>({
    scale: 1,
    x: 0,
    y: 0,
    overlayColor: "#000000",
    overlayAlpha: 0.5,
  });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [stage, setStage] = useState<Stage>("initial");
  const [textControls, setTextControls] = useState({
    content: "",
    position: "bottom",
    fontSize: 48,
    color: "white",
    style: "bold",
  });
  const [exportFormats, setExportFormats] = useState<CampaignFormat[]>([]);
  const [isExporting, setIsExporting] = useState(false);
  const [savedLogoUrl, setSavedLogoUrl] = useState<string | undefined>();

  const applyBrandKitDefaults = useCallback((kit: BrandKit | BrandKitDefaults) => {
    if (kit.text) {
      setTextControls((prev) => ({
        ...prev,
        content: kit.text?.content ?? prev.content,
        position: kit.text?.position ?? prev.position,
        fontSize: kit.text?.fontSize ?? prev.fontSize,
        color: kit.text?.color ?? prev.color,
        style: kit.text?.style ?? prev.style,
      }));
    }
    if (kit.controls) {
      setControls((prev) => ({
        ...prev,
        scale: kit.controls?.scale ?? prev.scale,
        x: kit.controls?.x ?? prev.x,
        y: kit.controls?.y ?? prev.y,
        overlayColor: kit.controls?.overlayColor ?? prev.overlayColor,
        overlayAlpha: kit.controls?.overlayAlpha ?? prev.overlayAlpha,
      }));
    }
    if (kit.formats?.length) {
      setExportFormats(kit.formats);
    }
    if (kit.logoUrl) {
      pendingLogoUrlRef.current = kit.logoUrl;
      setSavedLogoUrl(kit.logoUrl);
    }
  }, []);

  const replaceOverlayImage = useCallback((file: File | null) => {
    setOverlayImage(file);
    setOverlayPreviewUrl((currentUrl) => {
      if (currentUrl) {
        URL.revokeObjectURL(currentUrl);
        activeObjectUrlsRef.current.delete(currentUrl);
      }
      return file ? trackObjectUrl(URL.createObjectURL(file)) : "";
    });
  }, [trackObjectUrl]);

  const applyLogoFromUrl = useCallback(
    async (logoUrl: string) => {
      try {
        const response = await fetch(
          `/api/fetch-image?url=${encodeURIComponent(logoUrl)}`,
        );
        if (!response.ok) throw new Error("Could not fetch logo");
        const blob = await response.blob();
        const file = new File([blob], "brand-logo.png", {
          type: blob.type || "image/png",
        });
        setMode("wowowify");
        replaceOverlayImage(file);
        setStage("adjust");
      } catch {
        toast.showError("Could not load logo from URL");
      }
    },
    [replaceOverlayImage, toast],
  );

  const loadBaseFromUrl = useCallback(
    async (imageUrl: string) => {
      const response = await fetch(
        `/api/fetch-image?url=${encodeURIComponent(imageUrl)}`,
      );
      if (!response.ok) throw new Error("Could not fetch preview");
      const blob = await response.blob();
      const file = new File([blob], "campaign-preview.png", {
        type: blob.type || "image/png",
      });
      setBaseImage(file);
      setBasePreviewUrl(trackObjectUrl(URL.createObjectURL(file)));
    },
    [trackObjectUrl],
  );

  const generateImage = useCallback(
    async (promptOverride?: string) => {
      const prompt = (promptOverride ?? generationPrompt).trim();
      if (!prompt) return;

      setIsGenerating(true);
      try {
        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt,
            model: "venice-sd35",
            hide_watermark: true,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Failed to generate visual");
        }

        if (data.images?.[0]) {
          const base64 = data.images[0];
          const byteCharacters = atob(base64);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: "image/png" });
          const file = new File([blob], "generated-image.png", {
            type: "image/png",
          });
          setBaseImage(file);
          setBasePreviewUrl(trackObjectUrl(URL.createObjectURL(file)));
          setGenerationPrompt("");
          setIsGenerating(false);
          setShowGenerateModal(false);
          setStage("style");
        }
      } catch (error) {
        toast.showError(
          error instanceof Error ? error.message : "Failed to generate visual",
        );
        setGenerationPrompt("");
        setIsGenerating(false);
        setShowGenerateModal(false);
      }
    },
    [generationPrompt, toast, trackObjectUrl],
  );

  useEffect(() => {
    const draftId = searchParams?.get("draftId");
    if (draftId) {
      void (async () => {
        try {
          const response = await fetch(
            `/api/drafts/${encodeURIComponent(draftId)}`,
          );
          const data = (await response.json()) as {
            draft?: CampaignDraft;
            error?: string;
          };
          if (!response.ok || !data.draft) {
            toast.showError(data.error || "Draft not found");
            return;
          }

          const draft = data.draft;
          if (draft.brief) setGenerationPrompt(draft.brief);
          if (draft.text) {
            setTextControls((prev) => ({
              ...prev,
              content: draft.text?.content ?? prev.content,
              position: draft.text?.position ?? prev.position,
              fontSize: draft.text?.fontSize ?? prev.fontSize,
              color: draft.text?.color ?? prev.color,
              style: draft.text?.style ?? prev.style,
            }));
          }
          if (draft.controls) {
            setControls((prev) => ({
              ...prev,
              scale: draft.controls?.scale ?? prev.scale,
              x: draft.controls?.x ?? prev.x,
              y: draft.controls?.y ?? prev.y,
              overlayColor: draft.controls?.overlayColor ?? prev.overlayColor,
              overlayAlpha: draft.controls?.overlayAlpha ?? prev.overlayAlpha,
            }));
          }
          if (draft.formats?.length) setExportFormats(draft.formats);
          if (draft.brandKitId) {
            void fetch(`/api/brand-kits/${draft.brandKitId}`)
              .then((kitResponse) => kitResponse.json())
              .then((kitData: { kit?: BrandKit }) => {
                if (kitData.kit) applyBrandKitDefaults(kitData.kit);
              })
              .catch(() => toast.showError("Could not load brand kit"));
          }
          if (draft.logoUrl) {
            pendingLogoUrlRef.current = draft.logoUrl;
            setSavedLogoUrl(draft.logoUrl);
          }

          const preview = draft.previewUrl || draft.resultUrl;
          if (preview) {
            await loadBaseFromUrl(preview);
            setStage("style");
          }
        } catch {
          toast.showError("Could not load draft");
        }
      })();
      return;
    }

    const brief = searchParams?.get("brief");
    const caption = searchParams?.get("caption");
    const logoUrl = searchParams?.get("logoUrl");
    const brandKitId = searchParams?.get("brandKitId");
    const autostart = searchParams?.get("autostart") === "1";

    if (caption) {
      setTextControls((prev) => ({ ...prev, content: caption }));
    }

    if (logoUrl) {
      pendingLogoUrlRef.current = logoUrl;
      setSavedLogoUrl(logoUrl);
    }

    if (brandKitId) {
      void fetch(`/api/brand-kits/${brandKitId}`)
        .then((response) => response.json())
        .then((data: { kit?: BrandKit }) => {
          if (data.kit) applyBrandKitDefaults(data.kit);
        })
        .catch(() => toast.showError("Could not load brand kit"));
    }

    if (brief) {
      setGenerationPrompt(brief);
      if (autostart && !didAutostartRef.current) {
        didAutostartRef.current = true;
        void generateImage(brief);
      } else {
        setShowGenerateModal(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const logoUrl = pendingLogoUrlRef.current;
    if (logoUrl && baseImage && stage === "style") {
      pendingLogoUrlRef.current = null;
      void applyLogoFromUrl(logoUrl);
    }
  }, [baseImage, stage, applyLogoFromUrl]);

  const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Old preset's preview URLs from the prior stage are revoked when the
    // user returns to "style" / "initial" via handleBack / onStartOver.
    setBaseImage(file);
    setBasePreviewUrl(trackObjectUrl(URL.createObjectURL(file)));
    setStage("style");
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setMode("wowowify");
    replaceOverlayImage(file);
    setStage("adjust");

    void uploadLogoFile(file)
      .then((logoUrl) => setSavedLogoUrl(logoUrl))
      .catch(() => toast.showError("Logo uploaded locally but could not persist URL"));
  };

  const loadPresetOverlay = async (presetMode: OverlayMode) => {
    setMode(presetMode);

    // For AI transforms, we don't need a preset overlay image
    if (AI_TRANSFORM_MODES.includes(presetMode)) {
      if (!baseImage || !basePreviewUrl) {
        toast.showError("Please upload an image first");
        return;
      }

      setIsTransforming(true);
      setStage("adjust");

      try {
        const imageBlob = await fetch(basePreviewUrl).then((r) => r.blob());
        const formData = new FormData();
        formData.append("image", imageBlob, "image.png");

        const response = await fetch("/api/replicate", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to transform image: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.error) {
          throw new Error(result.error);
        }

        if (result.url) {
          const transformedImageResponse = await fetch(result.url);
          const transformedImageBlob = await transformedImageResponse.blob();
          setCombinedPreviewUrl(trackObjectUrl(URL.createObjectURL(transformedImageBlob)));
        } else {
          throw new Error("No transformed image URL received");
        }
      } catch (error) {
        console.error("Error transforming image:", error);
        toast.showError(
          error instanceof Error
            ? error.message
            : "Failed to transform image. Please try again.",
        );
        setMode("wowowify");
        setStage("style");
      } finally {
        setIsTransforming(false);
      }
      return;
    }

    if (presetMode === "wowowify") {
      replaceOverlayImage(null);
      setStage("adjust");
      return;
    }

    const presetPath = PRESET_OVERLAY_PATHS[presetMode] || "";

    if (presetPath) {
      try {
        const response = await fetch(presetPath);
        if (!response.ok)
          throw new Error(`HTTP error! status: ${response.status}`);
        const blob = await response.blob();
        const file = new File([blob], `${presetMode}.png`, {
          type: "image/png",
        });

        const handleOverlayFile = async (file: File) => {
          if (file.type === "image/svg+xml") {
            const svgUrl = trackObjectUrl(URL.createObjectURL(file));
            const img = new Image();
            img.src = svgUrl;
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
            });

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not get canvas context");

            ctx.drawImage(img, 0, 0);
            // SVG object URL no longer needed once pixels are rasterized
            URL.revokeObjectURL(svgUrl);
            activeObjectUrlsRef.current.delete(svgUrl);

            const pngUrl = canvas.toDataURL("image/png");
            const response = await fetch(pngUrl);
            const blob = await response.blob();
            return new File(
              [blob],
              file.name.replace(/\.[^/.]+$/, "") + ".png",
              {
                type: "image/png",
              }
            );
          }
          return file;
        };

        const processedFile = await handleOverlayFile(file);
        replaceOverlayImage(processedFile);
        setStage("adjust");
      } catch (error) {
        console.error("Error loading preset overlay:", error);
        toast.showError("Failed to load that overlay");
      }
    }
  };

  // Debounced version of combineImages
  // Works both with overlay images (stamp mode) and without (wowowify / tint-only mode)
  const debouncedCombineImages = useCallback(() => {
    const combineImages = async () => {
      if (!baseImage || !canvasRef.current) return;
      // Need either an overlay image OR a color tint to show a preview
      if (!overlayImage && controls.overlayAlpha <= 0) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const loadImg = (src: string): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = src;
        });
      };

      try {
        // Load base image
        const baseImg = await loadImg(basePreviewUrl);

        // Set canvas size to match base image
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;

        // Draw base image
        ctx.drawImage(baseImg, 0, 0);

        // Apply color overlay if needed
        if (controls.overlayAlpha > 0) {
          ctx.fillStyle = controls.overlayColor;
          ctx.globalAlpha = controls.overlayAlpha;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.globalAlpha = 1;
        }

        // Load and draw overlay image (skip for wowowify / tint-only mode)
        if (overlayImage && overlayPreviewUrl) {
          const overlayImg = await loadImg(overlayPreviewUrl);

          // Calculate scaled dimensions
          const scaledWidth = overlayImg.width * controls.scale;
          const scaledHeight = overlayImg.height * controls.scale;

          // Calculate position
          const x = (canvas.width - scaledWidth) / 2 + controls.x;
          const y = (canvas.height - scaledHeight) / 2 + controls.y;

          // Draw scaled and positioned overlay
          ctx.drawImage(overlayImg, x, y, scaledWidth, scaledHeight);
        }

        // Draw text overlay if content is provided
        if (textControls.content) {
          const fontSize = textControls.fontSize;
          const fontWeight = textControls.style === "bold" ? "bold" : "normal";
          const fontFamily =
            textControls.style === "monospace"
              ? "RobotoMono, monospace"
              : textControls.style === "serif"
              ? "serif"
              : "Roboto, sans-serif";

          ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
          ctx.fillStyle = textControls.color;
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";

          // Add stroke for readability
          ctx.strokeStyle = textControls.color === "white" ? "black" : "white";
          ctx.lineWidth = Math.max(2, fontSize / 16);

          // Calculate position based on textControls.position
          let textX = canvas.width / 2;
          let textY = canvas.height / 2;
          const margin = fontSize * 0.8;

          const pos = textControls.position.toLowerCase();
          if (pos === "top") { textY = margin; }
          else if (pos === "bottom") { textY = canvas.height - margin; }
          else if (pos === "top-left") { textX = margin; textY = margin; ctx.textAlign = "left"; }
          else if (pos === "top-right") { textX = canvas.width - margin; textY = margin; ctx.textAlign = "right"; }
          else if (pos === "bottom-left") { textX = margin; textY = canvas.height - margin; ctx.textAlign = "left"; }
          else if (pos === "bottom-right") { textX = canvas.width - margin; textY = canvas.height - margin; ctx.textAlign = "right"; }
          else if (pos === "left") { textX = margin; ctx.textAlign = "left"; }
          else if (pos === "right") { textX = canvas.width - margin; ctx.textAlign = "right"; }
          // "center" keeps the defaults

          // Handle multi-line text
          const maxWidth = canvas.width - margin * 2;
          const lines = wrapText(ctx, textControls.content, maxWidth);
          const lineHeight = fontSize * 1.2;
          const totalHeight = lines.length * lineHeight;
          const startY = textY - totalHeight / 2 + lineHeight / 2;

          for (let i = 0; i < lines.length; i++) {
            const ly = startY + i * lineHeight;
            ctx.strokeText(lines[i], textX, ly);
            ctx.fillText(lines[i], textX, ly);
          }
        }

        // Update preview
        setCombinedPreviewUrl(canvas.toDataURL());
      } catch (error) {
        console.error("Error combining images:", error);
      }
    };

    const debouncedFn = debounce(combineImages, 16);
    debouncedFn();
    return () => debouncedFn.cancel();
  }, [baseImage, overlayImage, controls, basePreviewUrl, overlayPreviewUrl, textControls]);

  useEffect(() => {
    // Run for overlay mode (overlayImage set) OR tint-only mode (wowowify with alpha > 0)
    if (baseImage && (overlayImage || controls.overlayAlpha > 0)) {
      const cleanup = debouncedCombineImages();
      return cleanup;
    }
  }, [baseImage, overlayImage, controls.overlayAlpha, debouncedCombineImages]);

  const handleDownload = async () => {
    const sourceUrl = combinedPreviewUrl || basePreviewUrl;
    if (!sourceUrl) return;

    setIsExporting(true);
    try {
      const img = await loadImageElement(sourceUrl);
      if (exportFormats.length === 0) {
        triggerDownload(sourceUrl, "toka-artwork.png");
        return;
      }

      const files = exportFormats.map((format) => {
        const canvas = cropCanvasToFormat(img, img.width, img.height, format);
        return {
          filename: `toka-${format}.png`,
          dataUrl: canvas.toDataURL("image/png"),
        };
      });

      if (files.length > 1) {
        const zip = await buildZipFromDataUrls(files);
        triggerZipDownload(zip, "toka-campaign.zip");
        return;
      }

      triggerDownload(files[0].dataUrl, files[0].filename);
    } catch {
      toast.showError("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const toggleExportFormat = (format: CampaignFormat) => {
    setExportFormats((current) =>
      current.includes(format)
        ? current.filter((entry) => entry !== format)
        : [...current, format],
    );
  };

  const getBrandKitPayload = (): BrandKitDefaults | null => ({
    logoUrl: savedLogoUrl,
    text: textControls,
    controls,
    formats: exportFormats.length ? exportFormats : undefined,
  });

  const handleBack = () => {
    if (stage === "adjust") {
      replaceOverlayImage(null);
      setStage("style");
    } else if (stage === "style") {
      // Returning to initial: free every preview URL we've minted so far
      revokeAllObjectUrls();
      setBaseImage(null);
      setBasePreviewUrl("");
      setCombinedPreviewUrl("");
      setStage("initial");
    }
    setGenerationPrompt("");
    setIsGenerating(false);
  };

  const cleanupGenerationState = () => {
    setGenerationPrompt("");
    setIsGenerating(false);
    setShowGenerateModal(false);
  };

  const updateControl = (
    key: keyof OverlayControls,
    value: number | string
  ) => {
    if (key === "scale" || key === "x" || key === "y") {
      if (typeof value === "number") {
        setControls((prev) => ({ ...prev, [key]: value }));
      }
    } else {
      setControls((prev) => ({ ...prev, [key]: value }));
    }
  };

  const updateTextControl = (
    key: keyof typeof textControls,
    value: string | number
  ) => {
    setTextControls((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="flex flex-col items-center gap-4 p-2 sm:p-4">
      <div className="w-full max-w-4xl">
        <StudioStepper stage={stage} />

        {stage === "initial" && (
          <div className="space-y-4">
            <BrandKitPanel onLoad={applyBrandKitDefaults} compact />
            <InitialStage
              isGenerating={isGenerating}
              onFileUpload={handleBaseImageUpload}
              onGenerateClick={() => setShowGenerateModal(true)}
              LoadingText={LoadingText}
            />
          </div>
        )}

        {baseImage && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-8">
            <div className="flex-1">
              <div className="relative group">
                <div className="w-full h-[70vh] relative">
                  {isTransforming ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                      <div className="text-center">
                        <div className="mb-2">✨</div>
                        <div className="text-sm text-gray-600">
                          Transforming your image...
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={combinedPreviewUrl || basePreviewUrl}
                      alt={
                        combinedPreviewUrl ? "Combined preview" : "Base preview"
                      }
                      className="w-full h-full object-contain border rounded-lg shadow-lg"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="w-full md:w-64 flex flex-col gap-4">
              {stage === "style" ? (
                <StyleStage
                  mode={mode}
                  controls={controls}
                  updateControl={updateControl}
                  onLogoUpload={handleLogoUpload}
                  loadPresetOverlay={loadPresetOverlay}
                  onStartOver={() => {
                    revokeAllObjectUrls();
                    setBaseImage(null);
                    setBasePreviewUrl("");
                    setCombinedPreviewUrl("");
                    setStage("initial");
                  }}
                />
              ) : (
                <>
                  <BrandKitPanel
                    onLoad={applyBrandKitDefaults}
                    onSave={getBrandKitPayload}
                    compact
                  />
                  <AdjustStage
                    mode={mode}
                    controls={controls}
                    updateControl={updateControl}
                    onDownload={() => void handleDownload()}
                    onBack={handleBack}
                    showControls={mode !== "ghiblify"}
                    text={textControls}
                    updateText={updateTextControl}
                    exportFormats={exportFormats}
                    onToggleExportFormat={toggleExportFormat}
                    isExporting={isExporting}
                  />
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {showGenerateModal && (
        <GenerateModal
          isGenerating={isGenerating}
          generationPrompt={generationPrompt}
          setGenerationPrompt={setGenerationPrompt}
          onGenerate={() => void generateImage()}
          onClose={cleanupGenerationState}
          LoadingText={LoadingText}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
