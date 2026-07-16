import { useState, useRef, useEffect, useCallback } from "react";
import debounce from "lodash/debounce";
import { InitialStage } from "./stages/InitialStage";
import { StyleStage } from "./stages/StyleStage";
import { AdjustStage } from "./stages/AdjustStage";
import { GenerateModal } from "./modals/GenerateModal";
import { LoadingText } from "./LoadingText";
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

export default function ImageOverlay() {
  const toast = useToast();
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

  const handleBaseImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Old preset's preview URLs from the prior stage are revoked when the
    // user returns to "style" / "initial" via handleBack / onStartOver.
    setBaseImage(file);
    setBasePreviewUrl(trackObjectUrl(URL.createObjectURL(file)));
    setStage("style");
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
      setOverlayImage(null);
      setOverlayPreviewUrl("");
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
        setOverlayImage(processedFile);
        setOverlayPreviewUrl(trackObjectUrl(URL.createObjectURL(processedFile)));
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

  const handleDownload = () => {
    if (!combinedPreviewUrl) return;
    const link = document.createElement("a");
    link.href = combinedPreviewUrl;
    link.download = "combined-image.png";
    link.click();
  };

  const handleBack = () => {
    if (stage === "adjust") {
      setOverlayImage(null);
      setOverlayPreviewUrl("");
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

  const generateImage = async () => {
    if (!generationPrompt) return;

    setIsGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: generationPrompt,
          model: "stable-diffusion-3.5",
          hide_watermark: true,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to wowowify");
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
        const url = URL.createObjectURL(file);
        setBasePreviewUrl(url);
        cleanupGenerationState();
        setStage("style");
      }
    } catch (error) {
      console.error("Error generating image:", error);
      toast.showError(
        error instanceof Error ? error.message : "Failed to wowowify",
      );
      cleanupGenerationState();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-2 sm:p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-4 sm:mb-8">
          <label className="block text-base sm:text-lg font-medium text-gray-700">
            {stage === "initial"
              ? "img overlay tool"
              : stage === "style"
              ? "choose style"
              : mode === "ghiblify"
              ? "transforming image"
              : "adjust overlay"}
          </label>
        </div>

        {stage === "initial" && (
          <InitialStage
            isGenerating={isGenerating}
            onFileUpload={handleBaseImageUpload}
            onGenerateClick={() => setShowGenerateModal(true)}
            LoadingText={LoadingText}
          />
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
              {stage === "style" ? (                  <StyleStage
                  mode={mode}
                  controls={controls}
                  updateControl={updateControl}
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
                <AdjustStage
                  mode={mode}
                  controls={controls}
                  updateControl={updateControl}
                  onDownload={handleDownload}
                  onBack={handleBack}
                  showControls={mode !== "ghiblify"}
                  text={textControls}
                  updateText={updateTextControl}
                />
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
          onGenerate={generateImage}
          onClose={cleanupGenerationState}
          LoadingText={LoadingText}
        />
      )}

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
