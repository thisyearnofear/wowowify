"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CampaignFormat } from "@/lib/agent-types";
import type { BrandKit } from "@/lib/brand-kits";
import { buildStudioUrl } from "@/lib/studio-url";
import { STUDIO_COPY } from "@/lib/studio-copy";
import { FarcasterContext } from "@/types/farcaster";
import {
  BrandCampaignFields,
  CampaignAssetsDisplay,
  GeneratedImageDisplay,
  ImageUpload,
  PromptInput,
  UserWelcome,
} from "@/components/frames/FrameUI";
import {
  getUserContext,
  initializeMiniApp,
  isInMiniApp,
  trackEvent,
} from "@/lib/miniapp";
import { useToast } from "@/components/ui/Toast";
import { logger } from "@/lib/logger";

interface CampaignAssetResult {
  format: CampaignFormat;
  resultUrl?: string;
  previewUrl?: string;
}

interface AgentApiResponse {
  error?: string;
  groveUrl?: string;
  resultUrl?: string;
  assets?: CampaignAssetResult[];
  status?: string;
}

export default function FrameContent() {
  const toast = useToast();
  const objectUrlRef = useRef<string | null>(null);
  const [isSDKLoaded, setIsSDKLoaded] = useState(false);
  const [contextData, setContextData] = useState<FarcasterContext | null>(null);
  const [prompt, setPrompt] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [brandKitId, setBrandKitId] = useState("");
  const [formats, setFormats] = useState<CampaignFormat[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedAssets, setGeneratedAssets] = useState<CampaignAssetResult[]>(
    [],
  );
  const [groveUrl, setGroveUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const inMiniApp = isInMiniApp();
        if (inMiniApp) await initializeMiniApp();
        const context = inMiniApp ? await getUserContext() : null;
        if (context) setContextData(context as unknown as FarcasterContext);

        setIsSDKLoaded(true);
        trackEvent("miniapp_initialized", {
          hasContext: Boolean(context),
          isMiniApp: inMiniApp,
        });
      } catch (initializationError) {
        logger.error("FrameContent: Mini App initialization failed", {
          error:
            initializationError instanceof Error
              ? initializationError.message
              : String(initializationError),
        });
        setIsSDKLoaded(true);
      }
    };

    void initialize();
  }, []);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  const studioUrl = buildStudioUrl({
    brief: prompt,
    logoUrl: logoUrl || undefined,
    caption: caption || undefined,
    brandKitId: brandKitId || undefined,
    autostart: true,
  });

  const applyBrandKit = useCallback(
    (kit: BrandKit) => {
      setBrandKitId(kit.id);
      if (kit.logoUrl) setLogoUrl(kit.logoUrl);
      if (kit.text?.content) setCaption(kit.text.content);
      if (kit.formats?.length) setFormats(kit.formats);
    },
    [],
  );

  const toggleFormat = (format: CampaignFormat) => {
    setFormats((current) =>
      current.includes(format)
        ? current.filter((entry) => entry !== format)
        : [...current, format],
    );
  };

  const buildParameters = useCallback(() => {
    const parameters: Record<string, unknown> = {};
    if (brandKitId) parameters.brandKitId = brandKitId;
    if (logoUrl.trim()) parameters.logoUrl = logoUrl.trim();
    if (caption.trim()) {
      parameters.text = {
        content: caption.trim(),
        position: "bottom",
        fontSize: 48,
        color: "white",
        style: "bold",
      };
    }
    if (formats.length > 0) parameters.formats = formats;
    return Object.keys(parameters).length > 0 ? parameters : undefined;
  }, [brandKitId, logoUrl, caption, formats]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) {
      setError("Please enter a campaign brief");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratedImage(null);
    setGeneratedAssets([]);
    setGroveUrl(null);

    try {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: prompt,
          parameters: buildParameters(),
          isFarcaster: true,
        }),
      });
      const data = (await response.json()) as AgentApiResponse;

      if (!response.ok || data.error) {
        throw new Error(data.error || `Generation failed (${response.status})`);
      }

      if (data.assets?.length) {
        setGeneratedAssets(data.assets);
      } else if (data.resultUrl) {
        setGeneratedImage(data.resultUrl);
        setGroveUrl(data.groveUrl || null);
      } else {
        throw new Error("No artwork returned");
      }

      trackEvent("generation_completed", {
        source: "farcaster",
        formatCount: formats.length,
        hasBrandKit: Boolean(brandKitId),
      });
    } catch (generationError) {
      const message =
        generationError instanceof Error
          ? generationError.message
          : "Failed to generate artwork";
      setError(message);
      toast.showError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, buildParameters, formats.length, brandKitId, toast]);

  const handleImageSelect = useCallback((file: File) => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const objectUrl = URL.createObjectURL(file);
    objectUrlRef.current = objectUrl;
    setUploadedImage(file);
    setUploadedImageUrl(objectUrl);
  }, []);

  const handleTransform = useCallback(async () => {
    if (!uploadedImage) {
      toast.showError("Choose an image first");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGeneratedImage(null);
    setGeneratedAssets([]);
    setGroveUrl(null);

    try {
      const formData = new FormData();
      formData.append("image", uploadedImage);
      const response = await fetch("/api/replicate", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as { error?: string; url?: string };

      if (!response.ok || data.error || !data.url) {
        throw new Error(data.error || `Transformation failed (${response.status})`);
      }

      setGeneratedImage(data.url);
    } catch (transformationError) {
      const message =
        transformationError instanceof Error
          ? transformationError.message
          : "Failed to transform image";
      setError(message);
      toast.showError(message);
    } finally {
      setIsGenerating(false);
    }
  }, [toast, uploadedImage]);

  const handleClear = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
    setUploadedImage(null);
    setUploadedImageUrl(null);
  }, []);

  const handleReset = useCallback(() => {
    setPrompt("");
    setGeneratedImage(null);
    setGeneratedAssets([]);
    setGroveUrl(null);
    setError(null);
    handleClear();
  }, [handleClear]);

  const openStudio = useCallback(() => {
    window.open(studioUrl, "_blank");
  }, [studioUrl]);

  if (!isSDKLoaded) return <div className="p-4 text-center">Loading @toka...</div>;

  const hasResult = Boolean(generatedImage || generatedAssets.length);

  return (
    <div className="w-[320px] mx-auto py-4 px-2 bg-gray-900 text-white rounded-lg shadow-lg">
      <h1 className="text-2xl font-bold text-center mb-1">@toka</h1>
      <p className="text-xs text-center text-gray-400 mb-4">{STUDIO_COPY.tagline}</p>
      {contextData?.user && <UserWelcome user={contextData.user} />}

      {!hasResult ? (
        <>
          <div className="flex flex-col gap-4">
            <BrandCampaignFields
              logoUrl={logoUrl}
              setLogoUrl={setLogoUrl}
              caption={caption}
              setCaption={setCaption}
              formats={formats}
              onToggleFormat={toggleFormat}
              onLoadBrandKit={applyBrandKit}
            />
            <PromptInput
              prompt={prompt}
              setPrompt={setPrompt}
              isGenerating={isGenerating}
              handleGenerate={handleGenerate}
            />
            <div className="text-center text-sm text-gray-400">- or -</div>
            <ImageUpload
              onImageSelect={handleImageSelect}
              onGhiblify={handleTransform}
              onClear={handleClear}
              selectedImage={uploadedImageUrl}
              isTransforming={isGenerating}
            />
          </div>
          {error && <div className="mt-4 p-2 bg-red-900 rounded-md text-sm">{error}</div>}
        </>
      ) : (
        <div className="flex flex-col items-center w-full">
          {generatedAssets.length > 0 ? (
            <CampaignAssetsDisplay
              assets={generatedAssets}
              handleOpenStudio={openStudio}
            />
          ) : (
            generatedImage && (
              <GeneratedImageDisplay
                generatedImage={generatedImage}
                groveUrl={groveUrl}
                handleOpenGroveUrl={() => groveUrl && window.open(groveUrl, "_blank")}
                handleOpenStudio={openStudio}
              />
            )
          )}
          <button
            className="mt-4 w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
            onClick={handleReset}
          >
            Create another
          </button>
        </div>
      )}
    </div>
  );
}
