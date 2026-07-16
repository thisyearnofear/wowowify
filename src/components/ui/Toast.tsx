"use client";

/**
 * Toast — single in-app notification system.
 *
 * Replaces `window.alert(...)` calls (thread-blocking, breaks iOS Safari
 * audio context, unstyled, not accessible) with a queued, ARIA-live,
 * dark-mode-aware notification surface.
 *
 * Three exports from this file:
 *   - <ToastContainer> children + provider; mounts two portals (one for
 *     polite info/success, one for assertive errors)
 *   - <ToastProvider> if a sub-tree needs its own scoped provider
 *   - useToast() hook → { showError, showSuccess, showInfo }
 *
 * Mounted once at src/components/providers/ClientRoot.tsx — the boundary
 * is lazy (also client-only) so toasts survive in-app navigation cleanly.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type ToastVariant = "info" | "success" | "error";

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
  /** ms — set 0 for sticky (no auto-dismiss) */
  ttl: number;
}

interface ToastContextValue {
  showToast: (message: string, options?: { variant?: ToastVariant; ttl?: number }) => void;
  // Convenience helpers
  showError: (message: string, options?: { ttl?: number }) => void;
  showSuccess: (message: string, options?: { ttl?: number }) => void;
  showInfo: (message: string, options?: { ttl?: number }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Hook to imperatively push toasts. Throws if used outside ToastProvider —
 * surfaces wiring mistakes instead of silently rendering nothing.
 */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastContainer> or <ToastProvider>");
  }
  return ctx;
}

const DEFAULT_TTL: Record<ToastVariant, number> = {
  info: 3500,
  success: 3500,
  error: 6000,
};

// --- ToastProvider ----------------------------------------------------------

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const t = timersRef.current.get(id);
    if (t) {
      clearTimeout(t);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback<ToastContextValue["showToast"]>(
    (message, options = {}) => {
      const id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `toast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const variant = options.variant ?? "info";
      const ttl = options.ttl ?? DEFAULT_TTL[variant];
      setToasts((prev) => [...prev, { id, message, variant, ttl }]);
      if (ttl > 0) {
        const handle = setTimeout(() => dismiss(id), ttl);
        timersRef.current.set(id, handle);
      }
    },
    [dismiss],
  );

  const ctx = useMemo<ToastContextValue>(
    () => ({
      showToast,
      showError: (message, options) =>
        showToast(message, { ...options, variant: "error" }),
      showSuccess: (message, options) =>
        showToast(message, { ...options, variant: "success" }),
      showInfo: (message, options) =>
        showToast(message, { ...options, variant: "info" }),
      dismiss,
    }),
    [showToast, dismiss],
  );

  // Cleanup pending timers on unmount so we don't leak
  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      timers.forEach((handle) => clearTimeout(handle));
      timers.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={ctx}>
      {children}
      <ToastSurface toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// --- Render surface ---------------------------------------------------------

interface ToastSurfaceProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

const VARIANT_CLASSES: Record<ToastVariant, string> = {
  info: "bg-blue-600 text-white border-blue-700",
  success: "bg-emerald-600 text-white border-emerald-700",
  error: "bg-red-600 text-white border-red-700",
};

const VARIANT_ICON: Record<ToastVariant, string> = {
  info: "ℹ️",
  success: "✅",
  error: "⚠️",
};

function ToastSurface({ toasts, onDismiss }: ToastSurfaceProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  if (!mounted) return null;
  if (typeof document === "undefined") return null;

  const polite = toasts.filter((t) => t.variant !== "error");
  const assertive = toasts.filter((t) => t.variant === "error");

  const renderList = (list: Toast[], ariaRole: "status" | "alert") => {
    if (list.length === 0) return null;
    return (
      <div
        role={ariaRole}
        aria-live={ariaRole === "alert" ? "assertive" : "polite"}
        aria-atomic="true"
        className="pointer-events-none fixed inset-x-0 bottom-4 z-[2147483647] flex flex-col items-center gap-2 px-4 sm:bottom-6"
      >
        {list.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm transition-all ${VARIANT_CLASSES[toast.variant]}`}
          >
            <span aria-hidden="true" className="text-lg leading-6">
              {VARIANT_ICON[toast.variant]}
            </span>
            <p className="flex-1 text-sm font-medium leading-5 break-words">
              {toast.message}
            </p>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              aria-label="Dismiss notification"
              className="-m-1 rounded p-1 text-white/80 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="currentColor"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 0 1 1.414 0L10 8.586l4.293-4.293a1 1 0 1 1 1.414 1.414L11.414 10l4.293 4.293a1 1 0 0 1-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 0 1-1.414-1.414L8.586 10 4.293 5.707a1 1 0 0 1 0-1.414Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {createPortal(renderList(polite, "status"), document.body)}
      {createPortal(renderList(assertive, "alert"), document.body)}
    </>
  );
}

// --- ToastContainer (provider + surface mount) ------------------------------

interface ToastContainerProps {
  children: ReactNode;
}

/**
 * Mount this once at the app root (we mount it in ClientRoot).
 * If a sub-tree needs its own queue, wrap it in <ToastProvider> directly;
 * the provider already includes the surface.
 */
export function ToastContainer({ children }: ToastContainerProps) {
  return <ToastProvider>{children}</ToastProvider>;
}
