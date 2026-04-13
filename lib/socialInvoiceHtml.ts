// lib/socialInvoiceHtml.ts
// Social commerce invoice (A5 / Half A4), corporate style.
// - Includes Delivery Fee
// - No VAT row
// - Invoice No = part after 'ORD' prefix from Order No

import { normalizeOrderForReceipt } from '@/lib/receipt';

function escapeHtml(s: any) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function money(n: any) {
  const v = Number(n ?? 0);
  if (!isFinite(v)) return '0.00';
  return v.toFixed(2);
}

function invoiceNoFromOrderNo(orderNo?: string) {
  if (!orderNo) return '';
  const inv = String(orderNo).replace(/^ORD[-\s]?/i, '').trim();
  return inv || String(orderNo).trim();
}

function fmtDate(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const pad = (x: number) => String(x).padStart(2, '0');
  return `${pad(d.getDate())}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
}

function wrapHtml(title: string, inner: string, opts?: { embed?: boolean }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A5 portrait; margin: 7mm; }
    html, body { width: 148mm; }
    body { font-family: Arial, Helvetica, sans-serif; color:#111; margin:0; font-size: 11px; }
    * { box-sizing: border-box; }
    .sheet { width: 100%; max-width: 134mm; margin: 0 auto; }
    .row { display:flex; gap: 8px; align-items: stretch; }
    .col { flex: 1; min-width: 0; }
    .triple { display:grid; grid-template-columns: 1fr 1.05fr 1fr; gap: 8px; align-items: stretch; }
    .header { display:flex; align-items:flex-start; justify-content:space-between; gap: 10px; }
    .brandWrap { display:flex; flex-direction:column; align-items:flex-start; }
    .logo { height: 34px; width: auto; object-fit: contain; margin: 0 0 4px; }
    .brand { font-size: 18px; font-weight: 800; margin:0; letter-spacing: 0.3px; line-height:1; }
    .brandSub { font-size: 11px; margin-top: 2px; }
    .muted { color:#555; }
    .box { border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
    .metaGrid { display:grid; grid-template-columns: 1fr 1fr; gap: 4px 8px; font-size: 11px; }
    .metaGrid .k { color:#555; }
    .metaGrid .v { text-align:right; font-weight: 600; }
    .sectionTitle { font-size: 11px; font-weight: 700; margin: 0 0 5px; }
    .addr { font-size: 11px; line-height: 1.3; }
    table { width:100%; border-collapse: collapse; margin-top: 8px; font-size: 11px; }
    th { text-align:left; padding: 6px 5px; border-bottom: 1px solid #111; }
    td { padding: 5px; border-bottom: 1px solid #eee; vertical-align: top; }
    .right { text-align:right; }
    .totals { width: 58%; margin-left: auto; margin-top: 8px; }
    .totals td { border: none; padding: 3px 5px; }
    .totals tr:last-child td { border-top: 1px solid #111; padding-top: 6px; }
    .notesBox { margin-top: 10px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 8px; }
    .notesText { font-size: 11px; line-height: 1.35; white-space: pre-wrap; word-break: break-word; }
    .footer { margin-top: 10px; font-size: 10px; color:#444; text-align:center; }
    .spacer { height: 8px; }
    ${opts?.embed ? 'html,body{height:100%;}' : ''}
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

function companyInfoBlock() {
  return `
    <div class="box">
      <div class="sectionTitle">Seller</div>
      <div class="addr">
        <b>Deshio-দেশীয়</b><br/>
        House: 4, Road: 1, Dhaka Housing, Adabor, Mohammadpur, Dhaka-1207.<br/>
        Mobile: 01711-585400<br/>
        BIN : 007243936-0402
      </div>
    </div>
  `;
}

function render(order: any) {
  const r = normalizeOrderForReceipt(order);
  const orderNo = r.orderNo || '';
  const invNo = invoiceNoFromOrderNo(orderNo);
  const date = fmtDate(r.dateTime);

  const sub = Number(r.totals?.subtotal ?? 0);
  const disc = Number(r.totals?.discount ?? 0);
  const delivery = Number(r.totals?.shipping ?? 0); // Delivery Fee
  // VAT is intentionally ignored
  const grand = Number(r.totals?.total ?? Math.max(0, sub - disc + delivery));
  const paid = Number(r.totals?.paid ?? Math.max(0, grand - Number(r.totals?.due ?? 0)));
  const due = Number(r.totals?.due ?? Math.max(0, grand - paid));
  const notes = String(r.notes || '').trim();
  const paymentTerms = due > 0 ? `Partial payment received. Due amount: ৳${money(due)}` : 'Paid in full';
  const productDescription = (r.items || [])
    .map((it: any) => [it.name, it.variant].filter(Boolean).join(' - '))
    .filter(Boolean)
    .join(', ');

  const billToLines = [
    r.customerName ? `<b>${escapeHtml(r.customerName)}</b>` : '<b>Customer</b>',
    r.customerPhone ? `Phone: ${escapeHtml(r.customerPhone)}` : '',
    ...(r.customerAddressLines || []).map((x: string) => escapeHtml(x)),
  ].filter(Boolean);

  const items = (r.items || []).map((it: any, i: number) => {
    const desc = [it.name, it.variant].filter(Boolean).join(' - ');
    return `
      <tr>
        <td class="right">${i + 1}</td>
        <td>${escapeHtml(desc)}</td>
        <td class="right">${escapeHtml(it.qty)}</td>
        <td class="right">${escapeHtml(money(it.unitPrice))}</td>
        <td class="right">${escapeHtml(money(it.lineTotal))}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="sheet">
      <div class="header">
        <div class="brandWrap">
          <img src="/logo.png" alt="Deshio logo" class="logo" />
          <h1 class="brand">INVOICE</h1>
          <div class="brandSub muted">Social Commerce Order</div>
        </div>
        <div style="flex:1; max-width: 68mm;">
          ${companyInfoBlock()}
        </div>
      </div>

      <div class="spacer"></div>

      <div class="triple">
      <div class="box">
        <div class="sectionTitle">Bill To</div>
        <div class="addr">${billToLines.join('<br/>')}</div>
      </div>

      <div class="box">
        <div class="sectionTitle">Product Description</div>
        <div class="notesText">${escapeHtml(productDescription || 'No product description available')}</div>
      </div>

      <div class="box">
        <div class="sectionTitle">Invoice Details</div>
        <div class="metaGrid">
          <div class="k">Invoice No</div><div class="v">${escapeHtml(invNo)}</div>
          <div class="k">Order No</div><div class="v">${escapeHtml(orderNo)}</div>
          <div class="k">Date</div><div class="v">${escapeHtml(date)}</div>
          ${r.storeName ? `<div class="k">Store</div><div class="v">${escapeHtml(r.storeName)}</div>` : ''}
          <div class="k">Payment Terms</div><div class="v">${escapeHtml(paymentTerms)}</div>
        </div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th style="width:36px;" class="right">#</th>
          <th>Item</th>
          <th style="width:60px;" class="right">Qty</th>
          <th style="width:90px;" class="right">Unit</th>
          <th style="width:100px;" class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${items || `<tr><td colspan="5" class="muted">No items</td></tr>`}
      </tbody>
    </table>

    <table class="totals">
      <tbody>
        <tr><td>Subtotal</td><td class="right">${escapeHtml(money(sub))}</td></tr>
        <tr><td>Delivery Fee</td><td class="right">${escapeHtml(money(delivery))}</td></tr>
        ${disc > 0 ? `<tr><td>Discount</td><td class="right">-${escapeHtml(money(disc))}</td></tr>` : ''}
        <tr><td>Paid Amount</td><td class="right">${escapeHtml(money(paid))}</td></tr>
        <tr><td><b>Due Amount</b></td><td class="right"><b>${escapeHtml(money(due))}</b></td></tr>
        <tr><td><b>Grand Total</b></td><td class="right"><b>${escapeHtml(money(grand))}</b></td></tr>
      </tbody>
    </table>

    ${notes ? `
      <div class="notesBox">
        <div class="sectionTitle">Order Notes</div>
        <div class="notesText">${escapeHtml(notes)}</div>
      </div>
    ` : ''}

    <div class="footer">
      This is a computer-generated invoice. Please keep it for your records.
    </div>
    </div>
  `;
}

export function socialInvoiceHtml(order: any, opts?: { embed?: boolean }) {
  return wrapHtml('Social Invoice', render(order), opts);
}

export function socialInvoiceBulkHtml(orders: any[], opts?: { embed?: boolean }) {
  const pages = (orders || [])
    .map((o) => `<div style="page-break-after: always;">${render(o)}</div>`)
    .join('');
  return wrapHtml('Social Invoices', pages || '<p>No orders</p>', opts);
}
