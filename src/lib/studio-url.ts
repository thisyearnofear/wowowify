/**
 * Build deep links into the Studio from agent/command flows.
 */
export function buildStudioUrl(options: {
  brief?: string;
  logoUrl?: string;
  caption?: string;
  brandKitId?: string;
  draftId?: string;
  autostart?: boolean;
}): string {
  const params = new URLSearchParams();
  if (options.draftId?.trim()) params.set("draftId", options.draftId.trim());
  if (options.brief?.trim()) params.set("brief", options.brief.trim());
  if (options.logoUrl?.trim()) params.set("logoUrl", options.logoUrl.trim());
  if (options.caption?.trim()) params.set("caption", options.caption.trim());
  if (options.brandKitId?.trim()) params.set("brandKitId", options.brandKitId.trim());
  if (options.autostart) params.set("autostart", "1");
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
