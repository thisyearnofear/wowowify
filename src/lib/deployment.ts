export type DeploymentMode = "all" | "asp" | "studio";

const DEFAULT_APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://wowowify.vercel.app";

/** Runtime deployment shape — `asp` serves API-only; `studio` serves the full app. */
export function getDeploymentMode(): DeploymentMode {
  const raw = process.env.TOKA_DEPLOYMENT?.trim().toLowerCase();
  if (raw === "asp" || raw === "studio") return raw;
  return "all";
}

export function isAspDeployment(): boolean {
  return getDeploymentMode() === "asp";
}

export function isStudioDeployment(): boolean {
  const mode = getDeploymentMode();
  return mode === "studio" || mode === "all";
}

export const ASP_URL: string =
  process.env.ASP_URL?.trim() || DEFAULT_APP_URL;

export const STUDIO_URL: string =
  process.env.STUDIO_URL?.trim() || DEFAULT_APP_URL;

/** Routes allowed when TOKA_DEPLOYMENT=asp */
export const ASP_ALLOWED_PREFIXES = [
  "/api/agent",
  "/api/fetch-image",
  "/api/brand-kits",
  "/api/drafts",
  "/api/upload-logo",
  "/api/provenance",
  "/api/entitlements",
  "/api/image",
  "/api/metrics",
  "/.well-known/agent.json",
] as const;

export function isAspAllowedPath(pathname: string): boolean {
  return ASP_ALLOWED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
