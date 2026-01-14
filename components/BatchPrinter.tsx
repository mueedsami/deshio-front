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

      // ✅ IMPORTANT: Explicit label size prevents "1 label then blanks" and mis-sizing.
      // Your label is roughly 2.5cm × 3.9cm (25mm × 39mm). If your printer treats
      // width/height swapped, swap width/height below.
      const config = qz.configs.create(defaultPrinter, {
        units: 'mm',
        size: { width: 39, height: 25 },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        rasterize: true,
        scaleContent: false,
      });
      console.log(`Using printer: ${defaultPrinter}`);

      // ✅ IMPORTANT: Send as ONE HTML job with page-breaks.
      // Some label printers advance extra labels between separate pages/jobs.
      // We also embed the barcode value per SVG via data-barcode for reliable rendering.
      const labels: string[] = [];
      selected.forEach((code) => {
        const qty = quantities[code] || 1;
        for (let i = 0; i < qty; i++) {
          const safeId = `${code}`.replace(/[^a-zA-Z0-9]/g, '') + `-${i}`;
          const productName = (product?.name || 'Product').substring(0, 28);
          const priceText = `৳${batch.sellingPrice.toLocaleString('en-BD')}`;
          labels.push(`
            <div class="label">
              <div class="brand">deshio</div>
              <div class="product-name">${productName}</div>
              <svg class="barcode" id="barcode-${safeId}" data-barcode="${String(code).replace(/"/g, '&quot;')}"></svg>
              <div class="price">Price (Vat Inclusive): <span>${priceText}</span></div>
            </div>
          `);
        }
      });

      const html = `
        <html>
          <head>
            <meta charset="utf-8" />
            <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              @page { size: 39mm 25mm; margin: 0; }
              /* IMPORTANT: don't force body height when printing multiple labels */
              html, body { width: 39mm; margin: 0; padding: 0; }

              /* Each label is one page */
              .label {
                width: 39mm;
                height: 25mm;
                padding: 1mm;
                font-family: Arial, sans-serif;
                color: #000;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: center;
                gap: 1mm;
                page-break-after: always;
                overflow: hidden;
              }

              .brand { font-size: 7pt; font-weight: 700; letter-spacing: 0.4px; text-transform: lowercase; }
              .product-name {
                font-size: 6.5pt;
                font-weight: 600;
                line-height: 1.05;
                max-width: 37mm;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                text-align: center;
              }

              /* Ensure SVG fits label width */
              svg.barcode { width: 37mm; height: 11mm; display: block; }

              .price { font-size: 6.5pt; font-weight: 600; line-height: 1; text-align: center; }
              .price span { font-weight: 800; }
            </style>
          </head>
          <body>
            ${labels.join('\n')}
          </body>
        </html>
      `;

      // Render barcodes in one pass using the embedded data-barcode attribute.
      const htmlWithBarcodes = html.replace(
        '</body>',
        `
          <script>
            (function(){
              try {
                document.querySelectorAll('svg.barcode').forEach(function(svg){
                  const val = svg.getAttribute('data-barcode') || '';
                  if (!val) return;
                  JsBarcode('#' + svg.id, String(val), {
                    format: 'CODE128',
                    width: 1.0,
                    height: 34,
                    displayValue: true,
                    fontSize: 10,
                    textMargin: 0,
                    margin: 0
                  });
                });
              } catch(e) {}
            })();
          </script>
        </body>`
      );

      const data: any[] = [{ type: 'html', format: 'plain', data: htmlWithBarcodes }];

      console.log(`📄 Printing ${data.length} labels to printer: ${defaultPrinter}`);
      
      await qz.print(config, data);
      // data.length is 1 now; use labels count for UX
      const labelsCount = selected.reduce((sum, c) => sum + (quantities[c] || 1), 0);
      alert(`✅ ${labelsCount} label(s) sent to printer "${defaultPrinter}" successfully!`);
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