"use client";

import Image from "next/image";
import { useState } from "react";
import { FarcasterUser } from "@/types/farcaster";
import type { CampaignFormat } from "@/lib/agent-types";
import type { BrandKit } from "@/lib/brand-kits";
import { STUDIO_COPY } from "@/lib/studio-copy";
import { BrandKitPanel } from "@/components/studio/BrandKitPanel";
import { FormatSelector } from "@/components/studio/FormatSelector";
import { buildZipFromDataUrls, triggerZipDownload } from "@/lib/export-zip";
import { uploadLogoFile } from "@/lib/upload-logo-client";

interface UserWelcomeProps {
  user: FarcasterUser | undefined;
}

/**
 * Component for displaying user welcome message
 */
export const UserWelcome = ({ user }: UserWelcomeProps) => {
  if (!user) return null;

  return (
    <div className="mb-4 text-center">
      <p className="text-sm text-gray-300">
        Welcome, {user.displayName || user.username || `FID: ${user.fid}`}
      </p>
    </div>
  );
};

interface CampaignAssetResult {
  format: CampaignFormat;
  resultUrl?: string;
  previewUrl?: string;
}

interface CampaignAssetsDisplayProps {
  assets: CampaignAssetResult[];
  handleOpenStudio: () => void;
}

export const CampaignAssetsDisplay = ({
  assets,
  handleOpenStudio,
}: CampaignAssetsDisplayProps) => {
  const [isZipping, setIsZipping] = useState(false);

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const files = (
        await Promise.all(
          assets.map(async (asset) => {
            const url = asset.resultUrl || asset.previewUrl;
            if (!url) return null;
            const response = await fetch(url);
            const blob = await response.blob();
            const dataUrl = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
            return { filename: `toka-${asset.format}.png`, dataUrl };
          }),
        )
      ).filter((entry): entry is { filename: string; dataUrl: string } =>
        Boolean(entry),
      );

      if (files.length === 0) return;
      const zip = await buildZipFromDataUrls(files);
      triggerZipDownload(zip, "toka-campaign.zip");
    } finally {
      setIsZipping(false);
    }
  };

  return (
  <div className="flex flex-col gap-3 w-full">
    {assets.length > 1 && (
      <button
        type="button"
        onClick={() => void handleDownloadZip()}
        disabled={isZipping}
        className="w-full py-2 px-4 bg-purple-700 hover:bg-purple-600 disabled:opacity-50 text-white rounded-md text-sm"
      >
        {isZipping ? "Preparing ZIP…" : "Download all (ZIP)"}
      </button>
    )}
    {assets.map((asset) => {
      const url = asset.resultUrl || asset.previewUrl;
      if (!url) return null;
      return (
        <div key={asset.format} className="w-full">
          <p className="text-xs text-gray-400 mb-1 capitalize">{asset.format}</p>
          <div className="relative w-full aspect-square mb-2">
            <Image
              src={url}
              alt={`${asset.format} artwork`}
              fill
              className="object-contain rounded-md"
            />
          </div>
          <a
            href={url}
            download={`toka-${asset.format}.png`}
            className="block w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-center text-sm"
          >
            Export {asset.format}
          </a>
        </div>
      );
    })}
    <button
      className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md"
      onClick={handleOpenStudio}
    >
      Refine in Studio
    </button>
  </div>
  );
};

interface BrandCampaignFieldsProps {
  logoUrl: string;
  setLogoUrl: (value: string) => void;
  caption: string;
  setCaption: (value: string) => void;
  formats: CampaignFormat[];
  onToggleFormat: (format: CampaignFormat) => void;
  onLoadBrandKit: (kit: BrandKit) => void;
}

export const BrandCampaignFields = ({
  logoUrl,
  setLogoUrl,
  caption,
  setCaption,
  formats,
  onToggleFormat,
  onLoadBrandKit,
}: BrandCampaignFieldsProps) => {
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const handleLogoFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    void uploadLogoFile(file)
      .then((url) => setLogoUrl(url))
      .finally(() => setIsUploadingLogo(false));
  };

  return (
  <div className="flex flex-col gap-3">
    <BrandKitPanel onLoad={onLoadBrandKit} compact theme="dark" />
    <div>
      <label className="block text-xs text-gray-400 mb-1">Brand mark URL</label>
      <input
        type="url"
        value={logoUrl}
        onChange={(e) => setLogoUrl(e.target.value)}
        placeholder="https://example.com/logo.png"
        className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded-md text-sm"
      />
      <label className="mt-2 block w-full py-2 px-3 bg-gray-700 hover:bg-gray-600 rounded-md text-center text-xs cursor-pointer">
        {isUploadingLogo ? "Uploading…" : "Upload logo file"}
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml"
          onChange={handleLogoFile}
          className="hidden"
        />
      </label>
    </div>
    <div>
      <label className="block text-xs text-gray-400 mb-1">Campaign copy</label>
      <input
        type="text"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
        placeholder="Headline or caption…"
        className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded-md text-sm"
      />
    </div>
    <FormatSelector
      selected={formats}
      onToggle={onToggleFormat}
      compact
      theme="dark"
    />
  </div>
  );
};

interface GeneratedImageDisplayProps {
  generatedImage: string;
  groveUrl: string | null;
  handleOpenGroveUrl: () => void;
  handleOpenStudio: () => void;
}

/**
 * Component for displaying generated image
 */
export const GeneratedImageDisplay = ({
  generatedImage,
  groveUrl,
  handleOpenGroveUrl,
  handleOpenStudio,
}: GeneratedImageDisplayProps) => {
  return (
    <div className="flex flex-col items-center w-full">
      <div className="mb-4 relative w-full aspect-square">
        <Image
          src={generatedImage}
          alt="Generated image"
          fill
          className="object-contain rounded-md"
          priority
        />
      </div>

      <div className="flex flex-col gap-2 w-full">
        {groveUrl && (
          <button
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center justify-center gap-2"
            onClick={handleOpenGroveUrl}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
              <polyline points="15 3 21 3 21 9"></polyline>
              <line x1="10" y1="14" x2="21" y2="3"></line>
            </svg>
            View on Grove
          </button>
        )}

        <a
          href={generatedImage}
          download="toka-artwork.png"
          className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-md text-center"
        >
          Export
        </a>

        <button
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-md"
          onClick={handleOpenStudio}
        >
          Refine in Studio
        </button>
      </div>
    </div>
  );
};

interface PromptInputProps {
  prompt: string;
  setPrompt: (prompt: string) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
}

/**
 * Component for prompt input
 */
export const PromptInput = ({
  prompt,
  setPrompt,
  isGenerating,
  handleGenerate,
}: PromptInputProps) => {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        className="w-full p-2 border border-gray-700 bg-gray-800 text-white rounded-md"
        placeholder="Describe your campaign brief…"
        rows={2}
        disabled={isGenerating}
      ></textarea>

      <button
        className={`w-full py-2 px-4 ${
          isGenerating
            ? "bg-gray-600 cursor-not-allowed"
            : "bg-blue-600 hover:bg-blue-700"
        } text-white rounded-md`}
        onClick={handleGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? "Creating…" : STUDIO_COPY.brief.writeBrief}
      </button>
    </div>
  );
};

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onGhiblify: () => void;
  onClear: () => void;
  selectedImage: string | null;
  isTransforming: boolean;
}

/**
 * Component for uploading and previewing images
 */
export const ImageUpload = ({
  onImageSelect,
  onGhiblify,
  onClear,
  selectedImage,
  isTransforming,
}: ImageUploadProps) => {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
    }
  };

  return (
    <div className="w-full">
      {!selectedImage ? (
        <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-800 hover:bg-gray-700">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <svg
              className="w-8 h-8 mb-3 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mb-2 text-sm text-gray-400">
              <span className="font-semibold">Click to upload</span> or drag and
              drop
            </p>
            <p className="text-xs text-gray-500">PNG, JPG or GIF</p>
          </div>
          <input
            type="file"
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </label>
      ) : (
        <div className="relative w-full">
          <div className="relative w-full aspect-square mb-4">
            <Image
              src={selectedImage}
              alt="Selected image"
              fill
              className="object-contain rounded-lg"
              priority
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={onGhiblify}
              disabled={isTransforming}
              className={`flex-1 py-3 px-4 rounded-lg text-white font-medium ${
                isTransforming
                  ? "bg-pink-800 cursor-wait"
                  : "bg-pink-600 hover:bg-pink-700"
              } transition-colors`}
            >
              {isTransforming ? (
                <div className="flex items-center justify-center gap-2">
                  <span>Transforming</span>
                  <span className="animate-pulse">✨</span>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span>Ghiblify</span>
                  <span>✨</span>
                </div>
              )}
            </button>
            <button
              onClick={onClear}
              disabled={isTransforming}
              className="py-3 px-4 rounded-lg text-white font-medium bg-gray-600 hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center justify-center gap-2">
                <span>Clear</span>
                <span>🗑️</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
