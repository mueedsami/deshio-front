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
  barcodes?: string[];
}

let qzConnectionPromise: Promise<void> | null = null;
let qzConnected = false;

async function ensureQZConnection() {
  const qz = (window as any).qz;
  if (!qz) {
    throw new Error("QZ Tray not available");
  }

  if (qzConnected && await qz.websocket.isActive()) {
    return;
  }

  if (qzConnectionPromise) {
    return qzConnectionPromise;
  }

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

  useEffect(() => {
    if (externalBarcodes && externalBarcodes.length > 0) {
      setBarcodes(externalBarcodes);
    }
  }, [externalBarcodes]);

  const loadDefaultPrinter = async () => {
    try {
      const qz = (window as any).qz;
      if (!qz) return;

      await ensureQZConnection();

      try {
        const printer = await qz.printers.getDefault();
        console.log("✅ Default printer loaded:", printer);
        setDefaultPrinter(printer);
        setPrinterError(null);
      } catch (err: any) {
        console.error("❌ No default printer found:", err);
        
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

  const fetchBarcodes = async () => {
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
      const response = await barcodeTrackingService.getBatchBarcodes(batch.id);
      
      if (response.success && response.data.barcodes) {
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

    if (!defaultPrinter) {
      console.log("Loading printer before print...");
      await loadDefaultPrinter();
    }

    if (!defaultPrinter) {
      alert("No printer available. Please check your printer settings and try again.");
      return;
    }

    try {
      await ensureQZConnection();

      const config = qz.configs.create(defaultPrinter);
      console.log(`Using printer: ${defaultPrinter}`);

      const data: any[] = [];
      selected.forEach((code) => {
        const qty = quantities[code] || 1;
        for (let i = 0; i < qty; i++) {
          const productName = (product?.name || 'Product').substring(0, 20);
          const price = batch.sellingPrice.toLocaleString('en-BD');
          
          data.push({
            type: "html",
            format: "plain",
            data: `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <script src="https://cdnjs.cloudflare.com/ajax/libs/jsbarcode/3.11.5/JsBarcode.all.min.js"></script>
                  <style>
                    * { 
                      margin: 0; 
                      padding: 0; 
                      box-sizing: border-box; 
                    }
                    
                    @page { 
                      size: 39mm 25mm;
                      margin: 0;
                    }
                    
                    html, body { 
                      width: 38mm;
                      height: 24mm;
                      margin: 0;
                      padding: 0;
                      overflow: hidden;
                    }
                    
                    body {
                      font-family: Arial, sans-serif;
                      background: white;
                      text-align: center;
                      display: flex;
                      align-items: center;
                      justify-content: center;
                    }
                    
                    .label-container {
                      width: 100%;
                      padding: 3mm 3mm;
                      text-align: center;
                    }
                    
                    .product-name { 
                      font-size: 5.5pt;
                      font-weight: bold;
                      margin: 0 auto 0.8mm auto;
                      text-align: center;
                      width: 100%;
                      line-height: 1.1;
                    }
                    
                    .barcode-section {
                      width: 100%;
                      margin: 2 auto;
                      text-align: center;
                    }
                    
                    svg { 
                      width: 100%;
                      max-width: 30mm;
                      height: auto;
                      display: block;
                      margin: 0 auto;
                    }
                    
                    .barcode-number {
                      font-size: 6.5pt;
                      margin: 0.5mm auto;
                      text-align: center;
                      width: 100%;
                      letter-spacing: 0.3pt;
                    }
                    
                    .price { 
                      font-size: 8.5pt;
                      font-weight: bold;
                      margin: 0.8mm auto 0 auto;
                      text-align: center;
                      width: 100%;
                    }
                  </style>
                </head>
                <body>
                  <div class="label-container">
                    <div class="product-name">${productName}</div>
                    <div class="barcode-section">
                      <svg id="barcode${i}"></svg>
                    </div>
                    <div class="barcode-number">${code}</div>
                    <div class="price">৳ ${price}</div>
                  </div>
                  <script>
                    window.onload = function() {
                      try {
                        JsBarcode("#barcode${i}", "${code}", {
                          format: "CODE128",
                          width: 1,
                          height: 24,
                          displayValue: false,
                          margin: 0,
                          marginTop: 0,
                          marginBottom: 0,
                          marginLeft: 0,
                          marginRight: 10
                        });
                      } catch(e) {
                        console.error('Barcode generation error:', e);
                      }
                    };
                  </script>
                </body>
              </html>
            `,
          });
        }
      });

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
