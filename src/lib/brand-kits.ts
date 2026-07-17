import { v4 as uuidv4 } from "uuid";
import type { CampaignFormat } from "@/lib/agent-types";
import { logger } from "@/lib/logger";
import {
  executeWithTimeout,
  getInMemoryData,
  getRedisClient,
  setInMemoryData,
} from "@/lib/redis";
import { APP_URL } from "@/lib/env";
import {
  getSeedBrandKit,
  listSeedBrandKits,
  DEMO_LAUNCH_KIT_ID,
} from "@/lib/brand-kits-seed";

export { DEMO_LAUNCH_KIT_ID };

const BRAND_KIT_PREFIX = "brand_kit:";
const BRAND_KIT_INDEX = "brand_kits:index";
const MAX_BRAND_KITS = 50;

export interface BrandKitText {
  content?: string;
  position?: string;
  fontSize?: number;
  color?: string;
  style?: string;
}

export interface BrandKitControls {
  scale?: number;
  x?: number;
  y?: number;
  overlayColor?: string;
  overlayAlpha?: number;
}

export interface BrandKit {
  id: string;
  name: string;
  logoUrl?: string;
  text?: BrandKitText;
  controls?: BrandKitControls;
  formats?: CampaignFormat[];
  createdAt: string;
  updatedAt: string;
}

export type BrandKitInput = Omit<BrandKit, "id" | "createdAt" | "updatedAt"> & {
  id?: string;
};

function sortByUpdated(kits: BrandKit[]): BrandKit[] {
  return [...kits].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

async function readIndex(): Promise<string[]> {
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      const raw = await executeWithTimeout(
        () => redis.get(BRAND_KIT_INDEX),
        3000,
        "[]",
      );
      const ids = JSON.parse(raw || "[]") as string[];
      return Array.isArray(ids) ? ids : [];
    } catch (error) {
      logger.warn("Brand kits index read failed, using memory fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return getInMemoryData<string>(BRAND_KIT_INDEX);
}

async function writeIndex(ids: string[]): Promise<void> {
  const trimmed = ids.slice(0, MAX_BRAND_KITS);
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      await executeWithTimeout(
        () => redis.set(BRAND_KIT_INDEX, JSON.stringify(trimmed)),
        3000,
      );
      return;
    } catch (error) {
      logger.warn("Brand kits index write failed, using memory fallback", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  setInMemoryData(BRAND_KIT_INDEX, trimmed);
}

async function readKit(id: string): Promise<BrandKit | null> {
  const key = `${BRAND_KIT_PREFIX}${id}`;
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      const raw = await executeWithTimeout(() => redis.get(key), 3000, null);
      if (!raw) return null;
      return JSON.parse(raw) as BrandKit;
    } catch (error) {
      logger.warn("Brand kit read failed, using memory fallback", {
        id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const kits = getInMemoryData<BrandKit>("brand_kits:data");
  return kits.find((kit) => kit.id === id) ?? null;
}

async function writeKit(kit: BrandKit): Promise<void> {
  const key = `${BRAND_KIT_PREFIX}${kit.id}`;
  if (process.env.REDIS_URL) {
    try {
      const redis = getRedisClient();
      await executeWithTimeout(
        () => redis.set(key, JSON.stringify(kit)),
        3000,
      );
    } catch (error) {
      logger.warn("Brand kit write failed, using memory fallback", {
        id: kit.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  const kits = getInMemoryData<BrandKit>("brand_kits:data");
  const next = kits.filter((entry) => entry.id !== kit.id);
  next.unshift(kit);
  setInMemoryData("brand_kits:data", next.slice(0, MAX_BRAND_KITS));
}

async function ensureSeedBrandKits(): Promise<void> {
  const seeds = listSeedBrandKits(APP_URL);
  const ids = await readIndex();
  let nextIds = [...ids];

  for (const seed of seeds) {
    const existing = await readKit(seed.id);
    if (!existing) {
      await writeKit(seed);
      if (!nextIds.includes(seed.id)) {
        nextIds = [seed.id, ...nextIds];
      }
    }
  }

  if (nextIds.length !== ids.length) {
    await writeIndex(nextIds);
  }
}

export async function listBrandKits(): Promise<BrandKit[]> {
  await ensureSeedBrandKits();
  const ids = await readIndex();
  const kits = await Promise.all(ids.map((id) => readKit(id)));
  return sortByUpdated(kits.filter((kit): kit is BrandKit => kit !== null));
}

export async function getBrandKit(id: string): Promise<BrandKit | null> {
  await ensureSeedBrandKits();
  const kit = await readKit(id);
  if (kit) return kit;
  return getSeedBrandKit(id, APP_URL);
}

export async function saveBrandKit(input: BrandKitInput): Promise<BrandKit> {
  const now = new Date().toISOString();
  const existing = input.id ? await readKit(input.id) : null;
  const kit: BrandKit = {
    id: input.id ?? uuidv4(),
    name: input.name.trim(),
    logoUrl: input.logoUrl?.trim() || undefined,
    text: input.text,
    controls: input.controls,
    formats: input.formats?.length ? [...new Set(input.formats)] : undefined,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (!kit.name) {
    throw new Error("Brand kit name is required");
  }

  await writeKit(kit);
  const ids = await readIndex();
  const nextIds = [kit.id, ...ids.filter((id) => id !== kit.id)].slice(0, MAX_BRAND_KITS);
  await writeIndex(nextIds);
  return kit;
}

/** Apply kit defaults without overwriting fields already set on the command. */
export function mergeBrandKitIntoCommand<
  T extends {
    logoUrl?: string;
    controls?: BrandKitControls;
    text?: BrandKitText;
  },
>(command: T, kit: BrandKit): T {
  return {
    ...command,
    logoUrl: command.logoUrl ?? kit.logoUrl,
    controls: {
      ...kit.controls,
      ...command.controls,
    },
    text: {
      ...kit.text,
      ...command.text,
    },
  };
}
