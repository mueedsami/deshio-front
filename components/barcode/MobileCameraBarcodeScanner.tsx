'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Camera, Loader, XCircle } from 'lucide-react';

type MobileCameraBarcodeScannerProps = {
  enabled: boolean;
  scannerId: string;
  onScan: (barcode: string) => void | Promise<void>;
  disabled?: boolean;
  buttonLabel?: string;
  activeLabel?: string;
  helperText?: string;
};

type Html5QrcodeScannerLike = {
  render: (onSuccess: (decodedText: string) => void, onFailure?: (errorMessage: string) => void) => void;
  clear: () => Promise<void>;
};

export default function MobileCameraBarcodeScanner({
  enabled,
  scannerId,
  onScan,
  disabled = false,
  buttonLabel = 'Use Mobile Camera',
  activeLabel = 'Camera Scanner Active',
  helperText = 'Use the rear camera on mobile. Camera access requires HTTPS or localhost.',
}: MobileCameraBarcodeScannerProps) {
  const [cameraOpen, setCameraOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScannerLike | null>(null);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: '', at: 0 });
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stopScanner = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (scanner) {
      try {
        await scanner.clear();
      } catch (error) {
        // html5-qrcode may throw if the camera was already stopped/unmounted.
        console.warn('Camera scanner clear skipped:', error);
      }
    }
  };

  useEffect(() => {
    if (!cameraOpen || !enabled || disabled) {
      stopScanner();
      return;
    }

    let cancelled = false;
    const containerId = scannerId;

    const startScanner = async () => {
      setIsStarting(true);
      setCameraError(null);

      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        if (cancelled) return;

        await stopScanner();

        const scanner = new Html5QrcodeScanner(
          containerId,
          {
            fps: 10,
            qrbox: { width: 260, height: 160 },
            aspectRatio: 1.7777778,
            rememberLastUsedCamera: true,
            showTorchButtonIfSupported: true,
            videoConstraints: {
              facingMode: { ideal: 'environment' },
            },
          },
          false
        ) as Html5QrcodeScannerLike;

        scanner.render(
          (decodedText: string) => {
            const barcode = String(decodedText || '').trim();
            if (!barcode) return;

            const now = Date.now();
            const last = lastScanRef.current;
            if (last.value === barcode && now - last.at < 1500) return;

            lastScanRef.current = { value: barcode, at: now };
            onScanRef.current(barcode);
          },
          () => {
            // Scan failures happen many times per second while the camera is searching.
          }
        );

        scannerRef.current = scanner;
      } catch (error: any) {
        console.error('Failed to start mobile camera scanner:', error);
        setCameraError(
          error?.message ||
            'Could not open camera. Please allow camera permission and make sure the site is running on HTTPS.'
        );
        setCameraOpen(false);
      } finally {
        if (!cancelled) setIsStarting(false);
      }
    };

    // Give React one paint so the scanner div exists in the DOM.
    const timer = window.setTimeout(startScanner, 150);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      stopScanner();
    };
  }, [cameraOpen, enabled, disabled, scannerId]);

  useEffect(() => {
    if (!enabled || disabled) {
      setCameraOpen(false);
    }
  }, [enabled, disabled]);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="mt-4 rounded-lg border border-dashed border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-900/10 p-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Mobile camera scan
          </p>
          <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">{helperText}</p>
        </div>

        <button
          type="button"
          onClick={() => setCameraOpen((v) => !v)}
          disabled={!enabled || disabled || isStarting}
          className={`inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            cameraOpen
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isStarting ? (
            <>
              <Loader className="h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : cameraOpen ? (
            <>
              <XCircle className="h-4 w-4" />
              Close Camera
            </>
          ) : (
            <>
              <Camera className="h-4 w-4" />
              {buttonLabel}
            </>
          )}
        </button>
      </div>

      {cameraError && (
        <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-3 py-2 text-xs text-red-700 dark:text-red-300">
          {cameraError}
        </div>
      )}

      {cameraOpen && enabled && !disabled && (
        <div className="mt-3 overflow-hidden rounded-xl border border-blue-200 dark:border-blue-800 bg-white dark:bg-gray-950">
          <style
            dangerouslySetInnerHTML={{
              __html: `
                #${scannerId} { border: none !important; width: 100%; }
                #${scannerId} video { border-radius: 12px !important; object-fit: cover !important; }
                #${scannerId}__dashboard_section_csr button,
                #${scannerId}__dashboard_section_swaplink {
                  background: #2563eb !important;
                  color: #fff !important;
                  border: none !important;
                  border-radius: 8px !important;
                  padding: 8px 12px !important;
                  font-weight: 700 !important;
                  margin-top: 8px !important;
                }
                #${scannerId}__status_span { font-size: 12px !important; color: #64748b !important; }
              `,
            }}
          />
          <div id={scannerId} className="min-h-[260px] p-2" />
          <div className="border-t border-gray-100 dark:border-gray-800 px-3 py-2 text-xs text-gray-600 dark:text-gray-400 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            {activeLabel}. Point camera at the barcode; successful scans are submitted automatically.
          </div>
        </div>
      )}
    </div>
  );
}
