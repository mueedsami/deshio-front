"use client";

import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";

type ToastType = "success" | "error" | "info" | "warning";

type GlobalToastDetail = {
  message: string;
  type?: ToastType;
  meta?: Record<string, any>;
};

/**
 * Listens for `window.dispatchEvent(new CustomEvent('global-toast', { detail }))`
 * and renders a Toast in the top-right.
 */
export default function GlobalToastHost() {
  const [toast, setToast] = useState<{ message: string; type: ToastType; key: number } | null>(null);

  const handler = useMemo(() => {
    return (event: Event) => {
      const custom = event as CustomEvent<GlobalToastDetail>;
      const detail = custom.detail;
      if (!detail?.message) return;

      setToast({
        message: detail.message,
        type: detail.type || "info",
        key: Date.now(),
      });
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("global-toast", handler as EventListener);
    return () => window.removeEventListener("global-toast", handler as EventListener);
  }, [handler]);

  if (!toast) return null;

  return (
    <Toast
      key={toast.key}
      message={toast.message}
      type={toast.type}
      onClose={() => setToast(null)}
    />
  );
}
