import type { CampaignFormat } from "@/lib/agent-types";

export const FORMAT_ASPECT_RATIOS: Record<CampaignFormat, number> = {
  square: 1,
  landscape: 1.91,
  portrait: 0.8,
};

/** Center-crop dimensions matching server-side composeImage format logic. */
export function getFormatCropDimensions(
  width: number,
  height: number,
  format: CampaignFormat,
): { sourceX: number; sourceY: number; sourceWidth: number; sourceHeight: number; width: number; height: number } {
  const targetRatio = FORMAT_ASPECT_RATIOS[format];
  const baseRatio = width / height;

  const cropWidth =
    baseRatio > targetRatio ? Math.round(height * targetRatio) : width;
  const cropHeight =
    baseRatio > targetRatio ? height : Math.round(width / targetRatio);
  const sourceX = Math.max(0, Math.round((width - cropWidth) / 2));
  const sourceY = Math.max(0, Math.round((height - cropHeight) / 2));

  return {
    sourceX,
    sourceY,
    sourceWidth: cropWidth,
    sourceHeight: cropHeight,
    width: cropWidth,
    height: cropHeight,
  };
}

export function cropCanvasToFormat(
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
  format: CampaignFormat,
): HTMLCanvasElement {
  const dims = getFormatCropDimensions(sourceWidth, sourceHeight, format);
  const canvas = document.createElement("canvas");
  canvas.width = dims.width;
  canvas.height = dims.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");
  ctx.drawImage(
    source,
    dims.sourceX,
    dims.sourceY,
    dims.sourceWidth,
    dims.sourceHeight,
    0,
    0,
    dims.width,
    dims.height,
  );
  return canvas;
}

export function triggerDownload(dataUrl: string, filename: string): void {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}
