"use client";

/**
 * Unified Web3 provider tree — SINGLE SOURCE OF TRUTH.
 *
 * Replaces these four parallel modules that previously composed the app:
 *   - src/components/Web3Provider.tsx (ConnectKit web path)
 *   - src/components/providers/WagmiProvider.tsx (Wagmi + QueryClient shell)
 *   - src/components/providers/WagmiConfig.ts (Farcaster frame connector config)
 *   - src/components/providers/FarcasterFrameProvider.tsx (Frame SDK bootstrap)
 *   - src/components/providers/Providers.tsx (dynamic SSR-false wrapper)
 *
 * The new tree:
 *   1. Detects `isFrame` once at mount (cannot change — wagmi config is
 *      created once via useMemo).
 *   2. Picks a wagmi config from @/lib/web3/config (single factory).
 *   3. Composes WagmiProvider > QueryClientProvider > ConnectKitProvider
 *      (web only) > Farcaster frame bootstrap (frame only) > children.
 *
 * Must be mounted under next/dynamic({ ssr: false }) at the layout level
 * because wagmi + connectkit + Farcaster SDK rely on `window`.
 */

import { ReactNode, useEffect, useMemo, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, useConfig } from "wagmi";
import { connect } from "wagmi/actions";
import { ConnectKitProvider } from "connectkit";
import { farcasterFrame } from "@farcaster/frame-wagmi-connector";

import FrameSDK from "@farcaster/frame-sdk";
import {
  createWagmiConfig,
  CONNECTKIT_THEME,
  CONNECTKIT_OPTIONS,
} from "@/lib/web3/config";
import { logger } from "@/lib/logger";

// One module-level QueryClient — Next.js will re-create the module per
// hot reload, but the provider tree mounts once per app instance, so we
// avoid the per-render churn of `new QueryClient()` inside the component.
const queryClient = new QueryClient();

/**
 * Detects whether we're executing inside a Farcaster Mini App / Frame.
 * Runs once at mount via useState lazy initializer — wagmi config cannot
 * change after mount, so this value must be locked in immediately.
 */
function detectIsFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (window.parent === window) return false;
    const w = window as unknown as Record<string, unknown>;
    return Boolean(w.farcaster || w.miniapp);
  } catch {
    return false;
  }
}

interface Web3ProviderProps {
  children: ReactNode;
}

/**
 * Lightweight inner component that runs the Farcaster frame handshake
 * (auto-connect + actions.ready()). Rendered only when isFrame is true,
 * so the browser bundle skips it on web routes.
 */
function FarcasterFrameMount(): null {
  const config = useConfig();
  useEffect(() => {
    const init = async () => {
      try {
        const context = await FrameSDK.context;
        logger.info("Farcaster Frame context", {
          contextData: JSON.stringify(context),
        });
        if (context?.client.clientFid) {
          connect(config, { connector: farcasterFrame() });
          logger.info("Connected to Farcaster wallet", {
            clientFid: context.client.clientFid,
          });
        }
        // Defer ready() until the React tree has had a frame to mount,
        // so the host client never flashes a blank splash.
        setTimeout(() => {
          FrameSDK.actions.ready();
          logger.info("Farcaster Frame ready");
        }, 500);
      } catch (error) {
        logger.error("Error initializing Farcaster Frame", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    };
    void init();
  }, [config]);
  return null;
}

export function Web3Provider({ children }: Web3ProviderProps) {
  const [isFrame] = useState(detectIsFrame);
  const [mounted, setMounted] = useState(false);

  // Create the wagmi config once. Depends on isFrame so the connector set
  // matches the runtime context (ConnectKit vs Farcaster frame).
  const wagmiConfig = useMemo(() => createWagmiConfig(isFrame), [isFrame]);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {isFrame ? (
          // Frame mode — skip ConnectKit UI, mount frame handshake
          <>
            <FarcasterFrameMount />
            {mounted && children}
          </>
        ) : (
          <ConnectKitProvider
            customTheme={CONNECTKIT_THEME}
            options={CONNECTKIT_OPTIONS}
          >
            {mounted && children}
          </ConnectKitProvider>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  );
}

// Note: layout.tsx wraps children in `dynamic(() => import("./Web3Provider"))`
// with `ssr: false` because wagmi / ConnectKit / Farcaster-SDK all touch
// `window`. Self-importing would be a circular dependency.
