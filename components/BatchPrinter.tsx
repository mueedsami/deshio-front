"use client";
import React, { useState, useEffect } from "react";
import BarcodeSelectionModal from "./BarcodeSelectionModal";
import { barcodeTrackingService } from "@/services/barcodeTrackingService";

interface Product {
  id: number;
  name: string;
}

interface Batch {
  id: number;
  productId: number;
  quantity: number;
  costPrice: number;
  sellingPrice: number;
  baseCode: string;
}

interface BatchPrinterProps {
  batch: Batch;
  product?: Product;
  barcodes?: string[]; // Accept pre-fetched barcodes from parent
}

// Global QZ connection state to prevent multiple connection attempts
let qzConnectionPromise: Promise<void> | null = null;
let qzConnected = false;

async function ensureQZConnection() {
  const qz = (window as any).qz;
  if (!qz) {
    throw new Error("QZ Tray not available");
  }

  // If already connected, return immediately
  if (qzConnected && await qz.websocket.isActive()) {
    return;
  }

  // If connection is in progress, wait for it
  if (qzConnectionPromise) {
    return qzConnectionPromise;
  }

  // Start new connection
  qzConnectionPromise = (async () => {
    try {
      if (!(await qz.websocket.isActive())) {
        await qz.websocket.connect();
        qzConnected = true;
        console.log("✅ QZ Tray connected");
      }
    } catch (error) {
      console.error("❌ QZ Tray connection failed:", error);
      throw error;
    } finally {
      qzConnectionPromise = null;
    }
  })();

  return qzConnectionPromise;
}


// Label geometry
const LABEL_WIDTH_MM = 39;
const LABEL_HEIGHT_MM = 25;
const DEFAULT_DPI = 300; // set to 203 for 203dpi printers
// Fine alignment tweak: shift whole label content horizontally.
// Negative moves left, positive moves right.
// Positive = shift right, Negative = shift left
const SHIFT_X_MM = 2; // requested: move right by 2mm

function mmToIn(mm: number) {
  return mm / 25.4;
}

async function ensureJsBarcode() {
  // QzTrayLoader loads JsBarcode globally, but keep a fallback for safety.
  if (typeof window === 'undefined') return;
  if ((window as any).JsBarcode) return;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load JsBarcode'));
    document.head.appendChild(s);
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const ellipsis = '…';
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + ellipsis).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t.length ? (t + ellipsis) : '';
}

function wrapTwoLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const clean = (text || '').trim().replace(/\s+/g, ' ');
  if (!clean) return ['', ''];

  if (ctx.measureText(clean).width <= maxWidth) return [clean, ''];

  const words = clean.split(' ');
  // If no spaces, fall back to a simple char-based split
  if (words.length <= 1) {
    let line1 = clean;
    while (line1.length > 0 && ctx.measureText(line1).width > maxWidth) {
      line1 = line1.slice(0, -1);
    }
    const rest = clean.slice(line1.length).trim();
    const line2 = rest ? fitText(ctx, rest, maxWidth) : '';
    return [line1 || fitText(ctx, clean, maxWidth), line2];
  }

  // Build the first line word-by-word
  let line1 = '';
  let i = 0;
  for (; i < words.length; i++) {
    const test = line1 ? `${line1} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxWidth) {
      line1 = test;
    } else {
      break;
    }
  }

  if (!line1) {
    return [fitText(ctx, clean, maxWidth), ''];
  }

  const line2Raw = words.slice(i).join(' ').trim();
  const line2 = line2Raw ? fitText(ctx, line2Raw, maxWidth) : '';
  return [line1, line2];
}


async function renderLabelBase64(opts: {
  code: string;
  productName: string;
  price: number;
  dpi?: number;
}) {
  await ensureJsBarcode();

  const dpi = opts.dpi ?? DEFAULT_DPI;
  const wIn = mmToIn(LABEL_WIDTH_MM);
  const hIn = mmToIn(LABEL_HEIGHT_MM);
  const wPx = Math.max(50, Math.round(wIn * dpi));
  const hPx = Math.max(50, Math.round(hIn * dpi));

  const canvas = document.createElement('canvas');
  canvas.width = wPx;
  canvas.height = hPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, wPx, hPx);

  const pad = Math.round(wPx * 0.04); // ~4%
  const shiftPx = Math.round((SHIFT_X_MM / 25.4) * dpi);
  const centerX = wPx / 2 + shiftPx;

  // Brand
  ctx.fillStyle = '#000';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.font = `800 ${Math.round(hPx * 0.11)}px Arial`; // ~22px @ 200px
  ctx.fillText('Deshio', centerX, pad);

  // Product name (wrap to 2 lines when long)
  const nameY = pad + Math.round(hPx * 0.14);
  const nameMaxW = wPx - pad * 2;

  let nameFont = Math.round(hPx * 0.09);
  ctx.font = `700 ${nameFont}px Arial`;

  let [name1, name2] = wrapTwoLines(ctx, (opts.productName || 'Product').trim(), nameMaxW);
  if (name2) {
    // Slightly smaller font when using 2 lines to keep spacing comfortable
    nameFont = Math.round(hPx * 0.082);
    ctx.font = `700 ${nameFont}px Arial`;
    [name1, name2] = wrapTwoLines(ctx, (opts.productName || 'Product').trim(), nameMaxW);
  }

  ctx.fillText(name1, centerX, nameY);
  const lineGap = Math.max(2, Math.round(hPx * 0.01));
  let afterNameBottom = nameY + nameFont;
  if (name2) {
    ctx.fillText(name2, centerX, nameY + nameFont + lineGap);
    afterNameBottom = nameY + (nameFont + lineGap) * 2;
  }

  const afterNameY = afterNameBottom + Math.round(hPx * 0.03);

  // Barcode (pixel-perfect): JsBarcode will override canvas.width/height based on content.
  // So we render, then center it horizontally and scale down ONLY if it would overflow.
  const JsBarcode = (window as any).JsBarcode;

  // Slightly larger barcode + number (still safe within 39x25mm)
  const maxBcW = Math.round((wPx - pad * 2) * 0.98);
  const maxBcH = Math.round(hPx * 0.56);
  const bcHeight = Math.round(hPx * 0.28);
  const bcFontSize = Math.round(hPx * 0.09);

  const renderBarcodeCanvas = (barWidth: number) => {
    const c = document.createElement('canvas');
    JsBarcode(c, opts.code, {
      format: 'CODE128',
      width: Math.max(1, Math.floor(barWidth)),
      height: bcHeight,
      displayValue: true,
      fontSize: bcFontSize,
      fontOptions: 'bold',
      textMargin: 0,
      margin: 0,
    });
    return c;
  };

  // Pick the largest integer barWidth that fits (keeps prints crisp on thermal printers)
  let bw = 1;
  let bcCanvas = renderBarcodeCanvas(bw);
  while (bw < 6) {
    const next = renderBarcodeCanvas(bw + 1);
    if (next.width <= maxBcW && next.height <= maxBcH) {
      bw += 1;
      bcCanvas = next;
      continue;
    }
    break;
  }

  const bcY = Math.max(pad + Math.round(hPx * 0.27), Math.round(afterNameY));
  const scale = Math.min(1, maxBcW / bcCanvas.width, maxBcH / bcCanvas.height);
  const drawW = Math.round(bcCanvas.width * scale);
  const drawH = Math.round(bcCanvas.height * scale);
  const bcX = Math.round((wPx - drawW) / 2 + shiftPx);

  // Keep it crisp on thermal printers
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bcCanvas, bcX, bcY, drawW, drawH);

  // Price
  const priceText = `Price (VAT Inclusive): ৳${Number(opts.price || 0).toLocaleString('en-BD')}`;
  ctx.textBaseline = 'bottom';
  ctx.font = `800 ${Math.round(hPx * 0.085)}px Arial`;
  const priceY = hPx - pad;
  ctx.fillText(fitText(ctx, priceText, wPx - pad * 2), centerX, priceY);

  const dataUrl = canvas.toDataURL('image/png');
  return dataUrl.split(',')[1];
}

export default function BatchPrinter({ batch, product, barcodes: externalBarcodes }: BatchPrinterProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isQzLoaded, setIsQzLoaded] = useState(false);
  const [barcodes, setBarcodes] = useState<string[]>(externalBarcodes || []);
  const [isLoadingBarcodes, setIsLoadingBarcodes] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);
  const [defaultPrinter, setDefaultPrinter] = useState<string | null>(null);
  const [printerError, setPrinterError] = useState<string | null>(null);

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 20;

    const checkQZ = () => {
      attempts++;
      
      if (typeof window !== "undefined" && (window as any).qz) {
        console.log("✅ QZ Tray library loaded");
        setIsQzLoaded(true);
        return true;
      }
      
      return false;
    };

    if (checkQZ()) return;

    const interval = setInterval(() => {
      if (checkQZ() || attempts >= maxAttempts) {
        clearInterval(interval);
        if (attempts >= maxAttempts) {
          console.warn("QZ Tray not detected. Install QZ Tray to enable barcode printing.");
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

  // Update barcodes if external barcodes change
  useEffect(() => {
    if (externalBarcodes && externalBarcodes.length > 0) {
      setBarcodes(externalBarcodes);
    }
  }, [externalBarcodes]);

  // Don't load printer automatically - only when user clicks print

  const loadDefaultPrinter = async () => {
    try {
      const qz = (window as any).qz;
      if (!qz) return;

      // Use singleton connection
      await ensureQZConnection();

      // Get default printer
      try {
        const printer = await qz.printers.getDefault();
        console.log("✅ Default printer loaded:", printer);
        setDefaultPrinter(printer);
        setPrinterError(null);
      } catch (err: any) {
        console.error("❌ No default printer found:", err);
        
        // Try to get first available printer as fallback
        try {
          const printers = await qz.printers.find();
          if (printers && printers.length > 0) {
            console.log("✅ Using first available printer:", printers[0]);
            setDefaultPrinter(printers[0]);
            setPrinterError(null);
          } else {
            setPrinterError("No printers found");
          }
        } catch (findErr) {
          console.error("❌ Failed to find printers:", findErr);
          setPrinterError("Failed to load printers");
        }
      }
    } catch (err) {
      console.error("❌ Error loading default printer:", err);
      setPrinterError("QZ Tray connection failed");
    }
  };

  // Fetch barcodes from backend when modal opens (only if not provided externally)
  const fetchBarcodes = async () => {
    // If barcodes are already provided from parent, don't fetch
    if (externalBarcodes && externalBarcodes.length > 0) {
      setBarcodes(externalBarcodes);
      return;
    }

    if (!batch?.id) {
      setBarcodeError("Batch information not available");
      return;
    }

    setIsLoadingBarcodes(true);
    setBarcodeError(null);

    try {
      // Use batch-specific endpoint instead of product endpoint
      const response = await barcodeTrackingService.getBatchBarcodes(batch.id);
      
      if (response.success && response.data.barcodes) {
        // Extract active barcode strings from the response
        const barcodeCodes = response.data.barcodes
          .filter((b) => b.is_active)
          .map((b) => b.barcode);
        
        if (barcodeCodes.length === 0) {
          setBarcodeError("No active barcodes found for this batch");
        } else {
          setBarcodes(barcodeCodes);
          console.log(`✅ Loaded ${barcodeCodes.length} barcodes for batch ${batch.id}`);
        }
      } else {
        setBarcodeError("Failed to fetch barcodes");
      }
    } catch (error: any) {
      console.error("Error fetching barcodes:", error);
      setBarcodeError(error.message || "Failed to fetch barcodes from server");
    } finally {
      setIsLoadingBarcodes(false);
    }
  };

  const handleOpenModal = async () => {
    setIsModalOpen(true);
    
    // Load printer when user actually wants to print
    if (!defaultPrinter && isQzLoaded) {
      await loadDefaultPrinter();
    }
    
    if (!externalBarcodes || externalBarcodes.length === 0) {
      fetchBarcodes();
    }
  };

  const handleQZPrint = async (
    selected: string[],
    quantities: Record<string, number>
  ) => {
    const qz = (window as any).qz;
    
    if (!qz) {
      alert("QZ Tray library not loaded. Please refresh the page or install QZ Tray.");
      return;
    }

    // Load printer if not already loaded
    if (!defaultPrinter) {
      console.log("Loading printer before print...");
      await loadDefaultPrinter();
    }

    // Check if printer is available after loading
    if (!defaultPrinter) {
      alert("No printer available. Please check your printer settings and try again.");
      return;
    }

    try {
      // Use singleton connection
      await ensureQZConnection();

// Print as a pixel-perfect image instead of HTML.
// HTML printing can be affected by OS/browser scaling and may clip on small labels.
// Pixel printing lets us control exact label dimensions.
const dpi = DEFAULT_DPI;
const config = qz.configs.create(defaultPrinter, {
  units: 'in',
  size: { width: mmToIn(LABEL_WIDTH_MM), height: mmToIn(LABEL_HEIGHT_MM) },
  margins: { top: 0, right: 0, bottom: 0, left: 0 },
  density: dpi,
  colorType: 'blackwhite',
  interpolation: 'nearest-neighbor',
  scaleContent: false,
});
console.log(`Using printer: ${defaultPrinter}`);

const data: any[] = [];
for (const code of selected) {
  const qty = quantities[code] || 1;
  for (let i = 0; i < qty; i++) {
    const base64 = await renderLabelBase64({
      code,
      productName: (product?.name || 'Product').substring(0, 28),
      price: batch.sellingPrice,
      dpi,
    });
    data.push({
      type: 'pixel',
      format: 'image',
      flavor: 'base64',
      data: base64,
    });
  }
}

console.log(`📄 Printing ${data.length} labels to printer: ${defaultPrinter}`);

await qz.print(config, data);
      alert(`✅ ${data.length} barcode(s) sent to printer "${defaultPrinter}" successfully!`);
      setIsModalOpen(false);
    } catch (err: any) {
      console.error("❌ Print error:", err);
      
      if (err.message && err.message.includes("Unable to establish connection")) {
        alert("QZ Tray is not running. Please start QZ Tray and try again.\n\nDownload from: https://qz.io/download/");
      } else if (err.message && err.message.includes("printer must be specified")) {
        alert("Printer not properly configured. Reloading printer settings...");
        await loadDefaultPrinter();
      } else {
        alert(`Print failed: ${err.message || "Unknown error"}`);
      }
    }
  };

  const canPrint = isQzLoaded;
  const buttonText = !isQzLoaded 
    ? "QZ Tray Not Detected" 
    : "Print Barcodes";

  const buttonTitle = !isQzLoaded 
    ? "QZ Tray not detected. Install QZ Tray to enable printing." 
    : defaultPrinter
    ? `Print barcodes using ${defaultPrinter}`
    : "Print barcodes";

  return (
    <>
      <button
        onClick={handleOpenModal}
        className="w-full px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!canPrint}
        title={buttonTitle}
      >
        {buttonText}
      </button>

      {defaultPrinter && (
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
          Printer: {defaultPrinter}
        </div>
      )}

      <BarcodeSelectionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        codes={barcodes}
        productName={product?.name || "Product"}
        price={batch.sellingPrice}
        onPrint={handleQZPrint}
        isLoading={isLoadingBarcodes}
        error={barcodeError}
      />
    </>
  );
}