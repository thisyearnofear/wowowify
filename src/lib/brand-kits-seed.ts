import { APP_URL } from "@/lib/env";
import type { BrandKit } from "@/lib/brand-kits";

/** Stable id for the demo Lisk community launch kit — safe to reference in docs and deep links. */
export const LISK_LAUNCH_KIT_ID = "lisk-launch";

export function buildLiskLaunchKit(appUrl: string = APP_URL): BrandKit {
  const now = new Date().toISOString();
  return {
    id: LISK_LAUNCH_KIT_ID,
    name: "Lisk Launch",
    logoUrl: `${appUrl}/lisk/lisk-mark.svg`,
    text: {
      content: "BUILD ON LISK",
      position: "bottom",
      fontSize: 48,
      color: "white",
      style: "bold",
    },
    controls: {
      scale: 0.45,
      x: 0,
      y: -20,
      overlayAlpha: 0,
    },
    formats: ["square", "landscape", "portrait"],
    createdAt: now,
    updatedAt: now,
  };
}

export const SEED_BRAND_KIT_BUILDERS = [buildLiskLaunchKit] as const;

export function getSeedBrandKit(id: string, appUrl: string = APP_URL): BrandKit | null {
  if (id === LISK_LAUNCH_KIT_ID) return buildLiskLaunchKit(appUrl);
  return null;
}

export function listSeedBrandKits(appUrl: string = APP_URL): BrandKit[] {
  return SEED_BRAND_KIT_BUILDERS.map((builder) => builder(appUrl));
}
