"use client";

/**
 * ClientRoot — the single client-only boundary under the root layout.
 *
 * Wraps children with the shared ToastContainer. Wallet interaction is an
 * explicit, future X Layer action rather than a global app dependency.
 *
 * Must be a client component because toast state is interactive. The root
 * layout imports this once.
 */

import { ReactNode } from "react";
import { ToastContainer } from "@/components/ui/Toast";

interface ClientRootProps {
  children: ReactNode;
}

export default function ClientRoot({ children }: ClientRootProps) {
  return <ToastContainer>{children}</ToastContainer>;
}
