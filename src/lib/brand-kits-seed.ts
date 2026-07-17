import { APP_URL } from "@/lib/env";
import type { BrandKit } from "@/lib/brand-kits";

/** Stable id for the bundled demo launch kit — safe to reference in docs and deep links. */
export const DEMO_LAUNCH_KIT_ID = "demo-launch";

/** @deprecated Legacy alias — resolves to the same demo kit. */
export const LEGACY_LAUNCH_KIT_IDS = ["lisk-launch"] as const;

export function buildDemoLaunchKit(appUrl: string = APP_URL): BrandKit {
  const now = new Date().toISOString();
  return {
    id: DEMO_LAUNCH_KIT_ID,
    name: "Demo Launch",
    logoUrl: `${appUrl}/demo/launch-mark.svg`,
    text: {
      content: "LAUNCH NOW",
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

export const SEED_BRAND_KIT_BUILDERS = [buildDemoLaunchKit] as const;

export function getSeedBrandKit(id: string, appUrl: string = APP_URL): BrandKit | null {
  if (
    id === DEMO_LAUNCH_KIT_ID ||
    (LEGACY_LAUNCH_KIT_IDS as readonly string[]).includes(id)
  ) {
    return buildDemoLaunchKit(appUrl);
  }
  return null;
}

export function listSeedBrandKits(appUrl: string = APP_URL): BrandKit[] {
  return SEED_BRAND_KIT_BUILDERS.map((builder) => builder(appUrl));
}
