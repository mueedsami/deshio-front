"use client";

import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

type Props = {
  open: boolean;
  src: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
};

export default function ImageLightboxModal({ open, src, title, subtitle, onClose }: Props) {
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [src, open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || !src) return null;

  const handleZoomIn = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.min(prev + 0.5, 4));
  };

  const handleZoomOut = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale((prev) => Math.max(prev - 0.5, 0.5));
  };

  const handleReset = (e: React.MouseEvent) => {
    e.stopPropagation();
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

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
          <div 
            className="relative overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-950 flex items-center justify-center min-h-[50vh]"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
          >
            <img
              src={src}
              alt={subtitle || title || "Image"}
              className={`max-h-[75vh] w-full object-contain ${isDragging ? '' : 'transition-transform duration-200'}`}
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
                transformOrigin: 'center'
              }}
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).src = "/placeholder-product.png";
              }}
            />

            {/* Zoom Controls */}
            <div className="absolute bottom-4 right-4 flex items-center bg-black/70 backdrop-blur-md rounded-lg p-1.5 gap-1.5 z-10 shadow-lg border border-white/10">
              <button 
                onClick={handleZoomOut} 
                className="p-1.5 text-white hover:bg-white/20 rounded transition-colors disabled:opacity-50"
                disabled={scale <= 0.5}
                title="Zoom Out"
              >
                <ZoomOut className="w-5 h-5" />
              </button>
              <button 
                onClick={handleReset} 
                className="p-1.5 text-white hover:bg-white/20 rounded min-w-[3.5rem] flex items-center justify-center transition-colors"
                title="Reset Zoom"
              >
                <span className="text-xs font-semibold tabular-nums">{Math.round(scale * 100)}%</span>
              </button>
              <button 
                onClick={handleZoomIn} 
                className="p-1.5 text-white hover:bg-white/20 rounded transition-colors disabled:opacity-50"
                disabled={scale >= 4}
                title="Zoom In"
              >
                <ZoomIn className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
