"use client";

/**
 * ClientRoot — the single client-only boundary under the root layout.
 *
 * Wraps children with:
 *   1. Web3Provider (wagmi + connectkit OR Farcaster-frame, picked at mount)
 *   2. ToastContainer (in-app non-blocking notifications)
 *
 * Must be a client component (it composes other client components and
 * relies on `window`). The root layout imports this once and never
 * touches wagmi/toasts directly.
 */

import { ReactNode } from "react";
import dynamic from "next/dynamic";
import { ToastContainer } from "@/components/ui/Toast";

// Loading state is intentionally null — wagmi/connectkit render to a
// stable <></> until mount, so a loader here would just flash a blank
// panel. Better: render nothing and let the React tree hydrate normally.
const Web3Provider = dynamic(
  () => import("./Web3Provider").then((m) => m.Web3Provider),
  { ssr: false, loading: () => null },
);

interface ClientRootProps {
  children: ReactNode;
}

export default function ClientRoot({ children }: ClientRootProps) {
  return (
    <Web3Provider>
      <ToastContainer>{children}</ToastContainer>
    </Web3Provider>
  );
}
