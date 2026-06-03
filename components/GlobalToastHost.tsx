"use client";

import { useEffect, useMemo, useState } from "react";
import Toast from "@/components/Toast";

type ToastType = "success" | "error" | "info" | "warning";

type GlobalToastDetail = {
  message: string;
  type?: ToastType;
  duration?: number;
  meta?: Record<string, any>;
};

/**
 * Listens for `window.dispatchEvent(new CustomEvent('global-toast', { detail }))`
 * and renders a Toast in the top-right.
 */
export default function GlobalToastHost() {
  const [toasts, setToasts] = useState<Array<{ message: string; type: ToastType; key: number; duration: number }>>([]);

  const handler = useMemo(() => {
    return (event: Event) => {
      const custom = event as CustomEvent<GlobalToastDetail>;
      const detail = custom.detail;
      if (!detail?.message) return;

      const key = Date.now() + Math.floor(Math.random() * 1000);
      setToasts((prev) => [
        ...prev.slice(-5),
        {
          message: detail.message,
          type: detail.type || "info",
          key,
          duration: detail.duration || 5000,
        },
      ]);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.addEventListener("global-toast", handler as EventListener);
    return () => window.removeEventListener("global-toast", handler as EventListener);
  }, [handler]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex w-[min(92vw,420px)] flex-col gap-3">
      {toasts.map((toast) => (
        <Toast
          key={toast.key}
          message={toast.message}
          type={toast.type}
          duration={toast.duration}
          floating={false}
          onClose={() => setToasts((prev) => prev.filter((item) => item.key !== toast.key))}
        />
      ))}
    </div>
  );
}
