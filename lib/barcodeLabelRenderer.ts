"use client";

// Shared barcode label renderer so BatchPrinter, Grouped/Multi, and Lookup
// print with the exact same size/layout/style.

export const LABEL_WIDTH_MM = 39;
export const LABEL_HEIGHT_MM = 25;
export const DEFAULT_DPI = 300; // set to 203 for 203dpi printers
export const TOP_GAP_MM = 1; // legacy top gap
export const SHIFT_X_MM = 0; // keep 0 for perfect centering

export function mmToIn(mm: number) {
  return mm / 25.4;
}

async function ensureJsBarcode() {
  if (typeof window === "undefined") return;
  if ((window as any).JsBarcode) return;

  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load JsBarcode"));
    document.head.appendChild(s);
  });
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const ellipsis = "…";
  if (ctx.measureText(text).width <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && ctx.measureText(t + ellipsis).width > maxWidth) {
    t = t.slice(0, -1);
  }
  return t.length ? t + ellipsis : "";
}

function wrapTwoLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const clean = (text || "").trim().replace(/\s+/g, " ");
  if (!clean) return ["", ""] as const;
  if (ctx.measureText(clean).width <= maxWidth) return [clean, ""] as const;

  const words = clean.split(" ");
  if (words.length <= 1) {
    let line1 = clean;
    while (line1.length > 0 && ctx.measureText(line1).width > maxWidth) {
      line1 = line1.slice(0, -1);
    }
    const rest = clean.slice(line1.length).trim();
    const line2 = rest ? fitText(ctx, rest, maxWidth) : "";
    return [line1 || fitText(ctx, clean, maxWidth), line2] as const;
  }

  let line1 = "";
  let i = 0;
  for (; i < words.length; i++) {
    const test = line1 ? `${line1} ${words[i]}` : words[i];
    if (ctx.measureText(test).width <= maxWidth) line1 = test;
    else break;
  }

  if (!line1) return [fitText(ctx, clean, maxWidth), ""] as const;
  const line2Raw = words.slice(i).join(" ").trim();
  const line2 = line2Raw ? fitText(ctx, line2Raw, maxWidth) : "";
  return [line1, line2] as const;
}

function normalizeLabelName(text: string) {
  const clean = (text || "").trim().replace(/\s+/g, " ");
  if (!clean) return "";
  return clean.replace(/\s*[-–—]\s*/g, " - ");
}

export async function renderBarcodeLabelBase64(opts: {
  code: string;
  productName: string;
  price: number;
  dpi?: number;
  brandName?: string;
}) {
  await ensureJsBarcode();

  const dpi = opts.dpi ?? DEFAULT_DPI;
  const wIn = mmToIn(LABEL_WIDTH_MM);
  const hIn = mmToIn(LABEL_HEIGHT_MM);
  const wPx = Math.max(50, Math.round(wIn * dpi));
  const hPx = Math.max(50, Math.round(hIn * dpi));

  const canvas = document.createElement("canvas");
  canvas.width = wPx;
  canvas.height = hPx;

  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, wPx, hPx);

  const pad = Math.round(wPx * 0.04);
  const topGapPx = Math.round((TOP_GAP_MM / 25.4) * dpi);
  const topPad = pad + topGapPx;
  const shiftPx = Math.round((SHIFT_X_MM / 25.4) * dpi);
  const centerX = wPx / 2 + shiftPx;

  // Brand
  ctx.fillStyle = "#000";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = `800 ${Math.round(hPx * 0.11)}px Arial`;
  ctx.fillText((opts.brandName || "Deshio").trim(), centerX, topPad);

  // Product name
  const nameY = topPad + Math.round(hPx * 0.14);
  const nameMaxW = wPx - pad * 2;
  const lineGap = Math.max(2, Math.round(hPx * 0.01));
  const fullName = normalizeLabelName(opts.productName || "Product");

  let name1 = "";
  let name2 = "";
  let nameFont = Math.round(hPx * 0.095);
  ctx.font = `700 ${nameFont}px Arial`;

  [name1, name2] = wrapTwoLines(ctx, fullName, nameMaxW);

  if (name2) {
    nameFont = Math.round(hPx * 0.082);
    ctx.font = `700 ${nameFont}px Arial`;
    [name1, name2] = wrapTwoLines(ctx, fullName, nameMaxW);
  }

  ctx.fillText(name1, centerX, nameY);

  let afterNameBottom = nameY + nameFont;
  if (name2) {
    ctx.fillText(name2, centerX, nameY + nameFont + lineGap);
    afterNameBottom = nameY + (nameFont + lineGap) * 2;
  }

  const afterNameY = afterNameBottom + Math.round(hPx * 0.03);

  // Barcode
  const JsBarcode = (window as any).JsBarcode;
  const maxBcW = Math.round((wPx - pad * 2) * 0.98);
  const maxBcH = Math.round(hPx * 0.56);
  const bcHeight = Math.round(hPx * 0.28);
  const bcFontSize = Math.round(hPx * 0.09);

  const renderBarcodeCanvas = (barWidth: number) => {
    const c = document.createElement("canvas");
    JsBarcode(c, opts.code, {
      format: "CODE128",
      width: Math.max(1, Math.floor(barWidth)),
      height: bcHeight,
      displayValue: true,
      fontSize: bcFontSize,
      fontOptions: "bold",
      textMargin: 0,
      margin: 0,
    });
    return c;
  };

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

  const bcY = Math.max(topPad + Math.round(hPx * 0.27), Math.round(afterNameY));
  const scale = Math.min(1, maxBcW / bcCanvas.width, maxBcH / bcCanvas.height);
  const drawW = Math.round(bcCanvas.width * scale);
  const drawH = Math.round(bcCanvas.height * scale);
  const bcX = Math.round((wPx - drawW) / 2 + shiftPx);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(bcCanvas, bcX, bcY, drawW, drawH);

  // Price
  const priceText = `Price (VAT inc.): ৳${Number(opts.price || 0).toLocaleString("en-BD")}`;
  ctx.textBaseline = "bottom";
  const priceFontSize = Math.round(hPx * 0.082);
  ctx.font = `700 ${priceFontSize}px "Consolas", "Lucida Console", "DejaVu Sans Mono", "Courier New", monospace`;
  const priceY = hPx - pad;
  ctx.fillText(fitText(ctx, priceText, wPx - pad * 2), centerX, priceY);

  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.split(",")[1];
}
