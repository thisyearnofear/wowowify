/**
 * Chain-agnostic commerce & provenance configuration.
 *
 * Set per deployment / marketplace (e.g. OKX AI + x402 on X Layer).
 * Creation and human approval never require a chain — these env vars apply
 * only when paid agent calls or optional receipts are enabled.
 */

export function getX402Network(): string {
  return process.env.X402_NETWORK?.trim() || "";
}

export function getEntitlementNetwork(): string {
  return process.env.ENTITLEMENT_NETWORK?.trim() || "";
}

export function getProvenanceNetwork(): string {
  return process.env.PROVENANCE_NETWORK?.trim() || "offchain";
}
