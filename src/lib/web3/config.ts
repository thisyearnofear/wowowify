/**
 * Web3 Configuration — SINGLE SOURCE OF TRUTH.
 *
 * Replaces two parallel chain/RPC definitions that previously lived in:
 *   - src/components/Web3Provider.tsx (ConnectKit + Alchemy RPCs)
 *   - src/components/providers/WagmiConfig.ts (Farcaster frame connector)
 *
 * The two configs had identical custom chain definitions for Mantle/Scroll
 * Sepolia, which was a maintenance hazard (drift risk). This module exports
 * a chain list + RPC transports, and a single `createWagmiConfig(isFrame)`
 * factory used by the unified Web3Provider.
 */

import { createConfig, http } from "wagmi";
import { mainnet, base, baseSepolia } from "wagmi/chains";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";
import { getDefaultConfig } from "connectkit";
// NOTE: ConnectKit v1.9 has a TYPE COLLISION on `Theme` — the top-level
// `connectkit` export's Theme is a string-literal union of named presets
// ("auto" | "web95" | ...), while the STRUCTURED custom-theme object lives
// at a deep internal path that TypeScript blocks under bundler resolution.
// We use the project-local `ConnectKitTheme` interface in `src/types/connectkit-
// theme.ts` (which re-declares only the slots we need) as the single source
// of truth. When ConnectKit exports the structured shape from its package
// root in a future major, this alias becomes a one-line re-export.
import type { ConnectKitTheme } from "@/types/connectkit-theme";
import { APP_URL, APP_ICON_URL } from "@/lib/env";

/**
 * Custom Mantle Sepolia chain (testnet used by Mantleify NFT minting).
 * No official wagmi export; defined here as the single source.
 */
export const mantleSepolia = {
  id: 5003,
  name: "Mantle Sepolia",
  network: "mantle-sepolia",
  nativeCurrency: { decimals: 18, name: "MNT", symbol: "MNT" },
  rpcUrls: {
    default: { http: ["https://rpc.sepolia.mantle.xyz"] },
    public: { http: ["https://rpc.sepolia.mantle.xyz"] },
  },
  blockExplorers: {
    default: {
      name: "Mantle Sepolia Explorer",
      url: "https://sepolia.mantlescan.xyz",
    },
  },
} as const;

/**
 * Custom Scroll Sepolia chain (testnet used by Scrollify NFT minting).
 */
export const scrollSepolia = {
  id: 534351,
  name: "Scroll Sepolia",
  network: "scroll-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Scroll Sepolia Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: ["https://sepolia-rpc.scroll.io"] },
    public: { http: ["https://sepolia-rpc.scroll.io"] },
  },
  blockExplorers: {
    default: {
      name: "Scroll Sepolia Explorer",
      url: "https://sepolia.scrollscan.com",
    },
  },
} as const;

/** Chains the app currently uses (NFT minting + wallet connect). */
export const SUPPORTED_CHAINS = [
  mainnet,
  base,
  baseSepolia,
  mantleSepolia,
  scrollSepolia,
] as const;

/**
 * Returns the best available RPC URL for a given chain.
 * Prefers Alchemy when NEXT_PUBLIC_ALCHEMY_ID is set (better rate limits,
 * lower latency). Falls back to public RPCs for dev / unconfigured envs.
 */
function rpcUrlFor(
  alchemyEnv: string,
  alchemyId: string,
  fallback: string,
): string {
  return alchemyId ? `https://${alchemyEnv}.g.alchemy.com/v2/${alchemyId}` : fallback;
}

const alchemyId = process.env.NEXT_PUBLIC_ALCHEMY_ID || "";

/**
 * Wagmi HTTP transports keyed by chain id. Single source of truth for RPCs.
 * Used by both the ConnectKit (web) and Farcaster-frame configs.
 */
export const RPC_TRANSPORTS = {
  [mainnet.id]: http(rpcUrlFor("eth-mainnet", alchemyId, "https://eth.llamarpc.com")),
  [base.id]: http(rpcUrlFor("base-mainnet", alchemyId, "https://base.llamarpc.com")),
  [baseSepolia.id]: http(
    rpcUrlFor("base-sepolia", alchemyId, "https://sepolia.base.org"),
  ),
  [mantleSepolia.id]: http("https://rpc.sepolia.mantle.xyz"),
  [scrollSepolia.id]: http("https://sepolia-rpc.scroll.io"),
} as const;

/**
 * Structured custom theme for ConnectKit (light, on-brand black/white).
 *
 * Replaces the previous CSS-variable workaround with ConnectKit's native
 * theme slots, so the shape is enforced by TypeScript and consumed by the
 * `customTheme` prop on `<ConnectKitProvider>` (NOT the `theme` prop, which
 * in v1.9 strictly accepts the named-preset string union).
 *
 * Visual outcome preserved: black text (`#000000`) on white background
 * (`#ffffff`), soft-grey hover (`#f5f5f5`). Future path to dark mode:
 * extend the shim interface in `src/types/connectkit-theme.ts` with
 * `light`/`dark` variants and supply both from a single `ThemeMode`
 * declaration.
 */
export const CONNECTKIT_THEME: ConnectKitTheme = {
  buttons: {
    primary: {
      color: "#000000",
      background: "#ffffff",
      hover: {
        background: "#f5f5f5",
      },
    },
  },
};

export const CONNECTKIT_OPTIONS = {
  hideNoWalletCTA: true,
  hideRecentBadge: true,
  hideTooltips: true,
  walletConnectCTA: "link" as const,
  embedGoogleFonts: true,
  avoidLayoutShift: true,
} as const;

/**
 * Factory that returns a wagmi config tailored to the runtime context.
 *
 * - `isFrame: false` → ConnectKit (web client), uses getDefaultConfig for
 *   wallet auto-detection (MetaMask, WalletConnect, Coinbase, Rainbow).
 * - `isFrame: true`  → Farcaster frame connector (in-app SDK wallet).
 *
 * The unified providers tree picks one based on Mini App context detection.
 */
export function createWagmiConfig(isFrame: boolean) {
  const sharedMeta = {
    appName: "WOWOWIFY",
    appDescription: "Image overlay tool",
    appUrl: APP_URL,
    appIcon: APP_ICON_URL,
  };

  if (isFrame) {
    return createConfig({
      chains: [...SUPPORTED_CHAINS],
      connectors: [farcasterFrame()],
      transports: RPC_TRANSPORTS,
    });
  }

  // Web client path — ConnectKit's getDefaultConfig wires wallet auto-detection
  // (MetaMask, WalletConnect, Coinbase, Rainbow, etc.).
  return createConfig(
    getDefaultConfig({
      ...sharedMeta,
      walletConnectProjectId:
        process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "",
      chains: [...SUPPORTED_CHAINS],
      transports: RPC_TRANSPORTS,
    }),
  );
}
