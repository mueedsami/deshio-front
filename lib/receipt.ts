// lib/receipt.ts
// Normalizes different order shapes (social commerce UI, backend API order, POS order)
// into a single receipt-friendly model for printing.

export type ReceiptItem = {
  name: string;
  variant?: string; // size/color/etc.
  qty: number;
  unitPrice: number;
  lineTotal: number;
  discount?: number;
  barcodes?: string[];
};

export type ReceiptTotals = {
  subtotal: number;
  discount: number;
  tax: number;
  shipping: number;
  total: number;
  paid: number;
  due: number;
  change: number;
};

export type ReceiptOrder = {
  id: number | string;
  orderNo: string;
  dateTime: string; // human readable
  storeName?: string;
  salesBy?: string;
  customerName?: string;
  customerPhone?: string;
  customerAddressLines?: string[];
  items: ReceiptItem[];
  totals: ReceiptTotals;
  notes?: string;
};

export function parseMoney(v: unknown): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const cleaned = v.replace(/[^0-9.+\-]/g, '');
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function safeString(v: unknown): string {
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  return '';
}

function formatDateTime(input: unknown): string {
  const s = safeString(input);
  const d = s ? new Date(s) : new Date();
  if (Number.isNaN(d.getTime())) return s || '';
  return d.toLocaleString();
}

function uniqNonEmpty(arr: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const x of arr) {
    const t = (x || '').trim();
    if (!t) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

function normalizeText(v: unknown): string {
  return String(v ?? '').trim().toLowerCase();
}

function looksLikeService(it: any): boolean {
  const t = normalizeText(it?.item_type || it?.type);
  return Boolean(it?.service_id || it?.serviceId || it?.is_service || it?.isService || t === 'service');
}

function changeFromNotes(notes: string): number {
  if (!notes) return 0;
  const m = notes.match(/change\s*(?:given|amount)?\s*[:\-]?\s*(?:৳|tk\.?|bdt)?\s*([0-9]+(?:\.[0-9]+)?)/i);
  return m ? parseMoney(m[1]) : 0;
}

/**
 * Accepts:
 * - Backend orderService Order (order_number, items[], store, customer, totals as strings)
 * - UI Order types/order.ts (orderNumber, products/items arrays, amounts/payments)
 * - Orders page local UI model (orderNumber, items[], amounts)
 */
export function normalizeOrderForReceipt(order: any): ReceiptOrder {
  const id = order?.id ?? order?.order_id ?? '';

  const orderNo =
    safeString(order?.order_number) || safeString(order?.orderNumber) || safeString(order?.order_no) || (id ? String(id) : '');

  const dateTime = formatDateTime(order?.order_date || order?.created_at || order?.createdAt || order?.date);

  // Store
  const storeName = safeString(order?.store?.name) || safeString(order?.store) || safeString(order?.storeName);

  // Salesperson
  const salesBy = safeString(order?.salesBy) || safeString(order?.salesman?.name) || safeString(order?.created_by?.name);

  // Customer
  const customerName = safeString(order?.customer?.name) || safeString(order?.customerName);
  const customerPhone = safeString(order?.customer?.phone) || safeString(order?.mobileNo);

  // Address (supports social-commerce deliveryAddress OR backend shipping_address OR generic customer.address)
  const addrLines: string[] = [];
  const deliveryAddress = order?.deliveryAddress;
  if (deliveryAddress?.address) {
    addrLines.push(safeString(deliveryAddress.address));
    const areaLine = [deliveryAddress.area, deliveryAddress.zone].filter(Boolean).join(', ');
    if (areaLine) addrLines.push(areaLine);
    const cityLine = [deliveryAddress.city, deliveryAddress.district].filter(Boolean).join(', ');
    if (cityLine) addrLines.push(cityLine);
    const divLine = [deliveryAddress.division, deliveryAddress.postalCode].filter(Boolean).join(' - ');
    if (divLine) addrLines.push(divLine);
  }

  const shippingAddress = order?.shipping_address || order?.shippingAddress;
  if (shippingAddress && typeof shippingAddress === 'object') {
    if (shippingAddress.address) addrLines.push(safeString(shippingAddress.address));
    const areaLine = [shippingAddress.area, shippingAddress.zone].filter(Boolean).join(', ');
    if (areaLine) addrLines.push(areaLine);
    const cityLine = [shippingAddress.city, shippingAddress.district].filter(Boolean).join(', ');
    if (cityLine) addrLines.push(cityLine);
    const divLine = [shippingAddress.division, shippingAddress.postal_code || shippingAddress.postalCode].filter(Boolean).join(' - ');
    if (divLine) addrLines.push(divLine);
  }

  const customerAddr = safeString(order?.customer?.address);
  if (customerAddr) addrLines.push(customerAddr);

  const customerAddressLines = uniqNonEmpty(addrLines);

  // Items (products + services)
  const items: ReceiptItem[] = [];
  const seenLines = new Set<string>();

  const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;

  const emitItem = (args: {
    src: any;
    kind: 'product' | 'service';
    name: string;
    variant: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
    discount: number;
    barcodes: string[];
  }) => {
    const { src, kind, name, variant, qty, unitPrice, lineTotal, discount, barcodes } = args;

    // IMPORTANT:
    // Keep same-product lines separate when barcode is different
    // (e.g., 2 pieces of the same SKU scanned as 2 unique barcodes).
    // This prevents receipts from hiding one line while subtotal still includes it.
    const stableId = safeString(
      src?.id ??
        src?.item_id ??
        src?.order_item_id ??
        src?.orderItemId ??
        src?.line_id ??
        src?.lineId ??
        src?.product_barcode_id ??
        src?.barcode_id ??
        src?.barcodeId
    );

    const barcodeSig = barcodes.length > 0 ? [...barcodes].sort().join('|') : '';
    const batchSig = safeString(src?.batch_number ?? src?.batchNo ?? src?.batch ?? src?.batch_id ?? src?.product_batch_id);
    const skuSig = safeString(src?.sku ?? src?.product_sku ?? src?.productSku);

    // If a row has a stable id but also barcode(s), include barcode in dedupe key.
    // Otherwise split rows coming from one aggregated line (qty 2, barcode A+B)
    // can collapse back into one line.
    const dedupeKey = stableId
      ? `${kind}|id:${stableId}|bc:${barcodeSig || '-'}|batch:${batchSig}|sku:${skuSig}`
      : `${kind}|${name}|${variant}|${qty}|${unitPrice}|${lineTotal}|bc:${barcodeSig}|batch:${batchSig}|sku:${skuSig}`;

    if (seenLines.has(dedupeKey)) return;
    seenLines.add(dedupeKey);

    items.push({
      name: name || (kind === 'service' ? 'Service' : 'Item'),
      variant,
      qty,
      unitPrice,
      discount,
      lineTotal,
      barcodes: barcodes.length ? barcodes : undefined,
    });
  };

  const pushItem = (src: any, kind: 'product' | 'service') => {
    const qtyRaw = Number(src?.quantity ?? src?.qty ?? 0) || 0;
    const unitPrice = parseMoney(src?.unit_price ?? src?.price ?? src?.unitPrice ?? src?.base_price);
    const discount = parseMoney(src?.discount_amount ?? src?.discount ?? 0);
    const computed = Math.max(0, qtyRaw * unitPrice - discount);
    const lineTotal = parseMoney(src?.total_amount ?? src?.amount ?? src?.lineTotal) || computed;

    const rawBarcodes = Array.isArray(src?.barcodes)
      ? (src.barcodes as string[])
      : src?.barcode
      ? [String(src.barcode)]
      : [];

    const barcodes = rawBarcodes
      .map((b) => String(b || '').trim())
      .filter(Boolean);

    const name =
      kind === 'service'
        ? safeString(src?.service_name || src?.name || src?.service?.name || src?.product_name || 'Service')
        : safeString(src?.product_name || src?.productName || src?.name || 'Item');

    const variant =
      kind === 'service'
        ? safeString(src?.category || src?.service_category || src?.service?.category || '')
        : safeString(src?.size || src?.variant || '');

    // Some service rows come with qty=0 but valid amount.
    const qty = qtyRaw > 0 ? qtyRaw : lineTotal > 0 || unitPrice > 0 ? 1 : 0;
    if (!name && qty <= 0 && lineTotal <= 0) return;

    // Option 1 behavior (preferred):
    // If backend gives one aggregated row with multiple barcodes and qty matches,
    // split into one line per barcode (qty 1 each).
    const qtyInt = Number.isInteger(qty) ? qty : Math.round(qty);
    const canSplitPerBarcode = qtyInt > 1 && barcodes.length === qtyInt;

    if (canSplitPerBarcode) {
      // Keep financial totals consistent with original row.
      const perUnitLine = qtyInt > 0 ? round2(lineTotal / qtyInt) : round2(unitPrice);
      let remaining = round2(lineTotal);

      barcodes.forEach((bc, idx) => {
        const thisLine = idx === barcodes.length - 1 ? round2(remaining) : perUnitLine;
        remaining = round2(remaining - thisLine);

        emitItem({
          src,
          kind,
          name,
          variant,
          qty: 1,
          unitPrice,
          lineTotal: thisLine,
          discount: 0,
          barcodes: [bc],
        });
      });
      return;
    }

    emitItem({
      src,
      kind,
      name,
      variant,
      qty,
      unitPrice,
      lineTotal,
      discount,
      barcodes,
    });
  };

  if (Array.isArray(order?.products)) {
    for (const p of order.products) {
      pushItem(p, looksLikeService(p) ? 'service' : 'product');
    }
  }

  if (Array.isArray(order?.items)) {
    for (const it of order.items) {
      pushItem(it, looksLikeService(it) ? 'service' : 'product');
    }
  }

  const rawServices: any[] =
    (order?.services ?? order?.service_items ?? order?.order_services ?? order?.orderServices ?? order?.serviceItems ?? []) as any[];

  if (Array.isArray(rawServices) && rawServices.length > 0) {
    for (const s of rawServices) {
      pushItem(s, 'service');
    }
  }

  // Totals
  const itemsSubtotal = items.reduce((s, i) => s + i.lineTotal, 0);
  const itemsDiscount = items.reduce((s, i) => s + parseMoney(i.discount), 0);

  const subtotalRaw =
    parseMoney(order?.amounts?.subtotal) ||
    parseMoney(order?.subtotal_amount) ||
    parseMoney(order?.subtotal) ||
    parseMoney(order?.subtotal_including_tax);

  const subtotal = subtotalRaw > 0 ? subtotalRaw : itemsSubtotal;

  const discount =
    parseMoney(order?.amounts?.totalDiscount) ||
    parseMoney(order?.discount_amount) ||
    parseMoney(order?.discount) ||
    parseMoney(order?.total_discount) ||
    itemsDiscount ||
    0;

  const tax =
    parseMoney(order?.amounts?.vat) ||
    parseMoney(order?.amounts?.tax) ||
    parseMoney(order?.tax_amount) ||
    parseMoney(order?.vat_amount) ||
    parseMoney(order?.vat) ||
    0;

  const shipping =
    parseMoney(order?.amounts?.transportCost) ||
    parseMoney(order?.amounts?.shipping) ||
    parseMoney(order?.shipping_amount) ||
    parseMoney(order?.shipping) ||
    0;

  const total =
    parseMoney(order?.amounts?.total) ||
    parseMoney(order?.total_amount) ||
    parseMoney(order?.grand_total) ||
    Math.max(0, subtotal - discount + tax + shipping);

  const paid =
    parseMoney(order?.payments?.paid) ||
    parseMoney(order?.payments?.totalPaid) ||
    parseMoney(order?.paid_amount) ||
    parseMoney(order?.amounts?.paid) ||
    (Array.isArray(order?.payments) ? (order.payments as any[]).reduce((s, p) => s + parseMoney(p?.amount), 0) : 0);

  const due =
    parseMoney(order?.payments?.due) ||
    parseMoney(order?.outstanding_amount) ||
    parseMoney(order?.amounts?.due) ||
    Math.max(0, total - paid);

  const notes = safeString(order?.notes);

  const explicitChange = parseMoney(order?.change_amount) || parseMoney(order?.changeAmount) || parseMoney(order?.change) || 0;
  const noteChange = changeFromNotes(notes);
  const overpayChange = Math.max(0, paid - total);
  const change = Math.max(explicitChange, noteChange, overpayChange);

  return {
    id,
    orderNo,
    dateTime,
    storeName,
    salesBy,
    customerName,
    customerPhone,
    customerAddressLines,
    items,
    totals: {
      subtotal,
      discount,
      tax,
      shipping,
      total,
      paid,
      due,
      change,
    },
    notes,
  };
}
