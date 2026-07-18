import type { CampaignFormat, ParsedCommand } from "@/lib/agent-types";
import { CAMPAIGN_FORMATS } from "@/lib/agent-types";
import type { BrandKit } from "@/lib/brand-kits";
import { parseBrandKitRef } from "@/lib/brand-kits";

export interface BrandKitContractFailure {
  ok: false;
  status: number;
  error: string;
}

export interface BrandKitContractSuccess {
  ok: true;
  brandKitId: string;
  brandKitVersion: number;
  kit: BrandKit;
  formats: CampaignFormat[];
}

export type BrandKitContractResult = BrandKitContractFailure | BrandKitContractSuccess;

function isContractFailure(
  value: CampaignFormat[] | BrandKitContractFailure,
): value is BrandKitContractFailure {
  return typeof value === "object" && value !== null && "ok" in value && value.ok === false;
}

export function normalizeCampaignFormats(
  requested: unknown,
): CampaignFormat[] | null | BrandKitContractFailure {
  if (requested === undefined) return null;

  if (
    !Array.isArray(requested) ||
    requested.length === 0 ||
    requested.length > CAMPAIGN_FORMATS.length ||
    !requested.every((format) => CAMPAIGN_FORMATS.includes(format as CampaignFormat))
  ) {
    return {
      ok: false,
      status: 400,
      error: "formats must contain square, landscape, and/or portrait",
    };
  }

  return [...new Set(requested)] as CampaignFormat[];
}

/** Resolve output formats: explicit request wins, then kit defaults. */
export function resolveCampaignFormats(
  requested: CampaignFormat[] | null,
  kit: BrandKit | null | undefined,
): CampaignFormat[] | BrandKitContractFailure {
  if (requested?.length) return requested;
  if (kit?.formats?.length) return [...kit.formats];
  return {
    ok: false,
    status: 400,
    error:
      "Brand Kit v1 requires output formats. Pass parameters.formats or use a brand kit that defines formats.",
  };
}

/**
 * Brand Kit v1 contract for POST /api/agent.
 * Requires brandKitId, resolvable approved kit, compositable logo, and formats.
 */
export function enforceBrandKitAgentContract(options: {
  brandKitRef?: string;
  kit: BrandKit | null;
  parsedCommand: ParsedCommand;
  requestedFormats: CampaignFormat[] | null;
  enforcementEnabled?: boolean;
}): BrandKitContractResult {
  if (options.enforcementEnabled === false) {
    throw new Error("enforceBrandKitAgentContract requires enforcementEnabled: true");
  }

  const { brandKitRef, kit, parsedCommand, requestedFormats } = options;

  if (!brandKitRef?.trim()) {
    return {
      ok: false,
      status: 400,
      error:
        "Brand Kit v1 requires parameters.brandKitId (e.g. demo-launch). Upload a kit via POST /api/brand-kits or use the demo kit.",
    };
  }

  const { id, version: pinnedVersion } = parseBrandKitRef(brandKitRef);

  if (!kit) {
    if (pinnedVersion !== undefined) {
      return {
        ok: false,
        status: 404,
        error: `Brand kit not found or version mismatch for ${id}@${pinnedVersion}. Fetch GET /api/brand-kits/${id} for the current version.`,
      };
    }
    return { ok: false, status: 404, error: `Brand kit not found: ${id}` };
  }

  if (pinnedVersion !== undefined && kit.version !== pinnedVersion) {
    return {
      ok: false,
      status: 409,
      error: `Brand kit version mismatch for ${id}. Requested @${pinnedVersion}, current @${kit.version}. Pin brandKitId as "${id}@${kit.version}".`,
    };
  }

  if (!kit.approved) {
    return {
      ok: false,
      status: 403,
      error: `Brand kit "${kit.id}" is not approved for agent use. Approve it in Studio or set approved: true when saving via POST /api/brand-kits.`,
    };
  }

  if (!parsedCommand.logoUrl?.trim()) {
    return {
      ok: false,
      status: 400,
      error:
        "Brand Kit v1 requires a compositable logo. Set logoUrl on the kit or pass parameters.logoUrl as an override.",
    };
  }

  const formats = resolveCampaignFormats(requestedFormats, kit);
  if (isContractFailure(formats)) return formats;
  if (!formats.length) {
    return {
      ok: false,
      status: 400,
      error: "Brand Kit v1 requires at least one output format.",
    };
  }

  return {
    ok: true,
    brandKitId: kit.id,
    brandKitVersion: kit.version,
    kit,
    formats,
  };
}

export function isBrandKitContractEnabled(): boolean {
  const flag = process.env.BRAND_KIT_REQUIRED?.trim().toLowerCase();
  if (flag === "false" || flag === "0") return false;
  return true;
}
