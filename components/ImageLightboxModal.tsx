"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  src: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
};

export default function ImageLightboxModal({ open, src, title, subtitle, onClose }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />

      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4 dark:border-gray-700">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{title || "Image"}</p>
            {subtitle ? (
              <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">{subtitle}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950">
            <img
              src={src}
              alt={subtitle || title || "Image"}
              className="max-h-[75vh] w-full object-contain"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/placeholder-product.png";
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
