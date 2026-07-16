/**
 * Type guard helpers — single source of truth for null/undefined narrowing.
 *
 * Designed for the strictNullChecks flip. Reduce boilerplate around `if (!x)
 * return;` patterns; surface typed errors when an invariant is violated.
 *
 * NO side effects beyond: returning a boolean, throwing, or logging.
 * Lives under `lib/types/` so both client and server code can import it.
 */

/**
 * Predicate: returns true when `v` is neither `undefined` nor `null`.
 *
 * Use when mapping over a possibly-empty array or filtering React props.
 *
 *   const valid = connectors.filter(isDefined);
 *
 * NOTE: range-narrows `T | undefined | null` to `T`.
 */
export function isDefined<T>(
  v: T | undefined | null,
): v is T {
  return v !== undefined && v !== null;
}

/**
 * Non-throwing assertion: returns `v` if defined, returns `fallback` otherwise.
 *
 * Use when the absence is acceptable — e.g. optional wallet address passed
 * to "Connect wallet to mint" prompts.
 *
 *   const title = defined(overlayMode, "your image");
 *
 * NOTE: range-narrows.
 */
export function defined<T>(
  v: T | undefined | null,
  fallback: T,
): T {
  return isDefined(v) ? v : fallback;
}

/**
 * Throwing assertion: returns `v` if defined, throws otherwise.
 *
 * Use at INVARIANT boundaries — config loaders, RPC handlers, mint flows —
 * where absence indicates a programmer or environment error, not a normal
 * data case.
 *
 *   const address = require(accounts[0], "first connected account");
 *
 * Throws Error with the label so the caller's stack points back to where
 * the invariant was expected.
 */
export function require<T>(
  v: T | undefined | null,
  label: string,
): T {
  if (isDefined(v)) return v;
  throw new Error(`Required value missing: ${label}`);
}
