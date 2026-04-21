// lib/socialInvoiceHtml.ts
// Social commerce invoice (A5 / Half A4), clean two-column header and compact items table.

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

function paymentStatus(total: number, paid: number, due: number) {
  if (due <= 0 && total > 0) return 'Paid';
  if (paid > 0 && due > 0) return 'Partial';
  return 'Due';
}

function compactAddress(lines: string[]) {
  return lines.filter(Boolean).join('<br/>');
}

function wrapHtml(title: string, inner: string, opts?: { embed?: boolean }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A5 portrait; margin: 8mm; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      color: #111827;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page { width: 100%; }
    .topRow {
      display: grid;
      grid-template-columns: 1fr 1.15fr;
      gap: 12px;
      align-items: start;
      margin-bottom: 8px;
    }
    .brandBlock { padding-top: 2px; }
    .brandLine {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }
    .logo {
      max-height: 30px;
      max-width: 108px;
      object-fit: contain;
      display: block;
    }
    .brandText {
      font-size: 16px;
      font-weight: 800;
      color: #ea580c;
      letter-spacing: 0.2px;
      line-height: 1;
    }
    .title { margin: 6px 0 0; font-size: 17px; font-weight: 800; letter-spacing: 0.8px; }
    .subtitle { margin-top: 2px; font-size: 10px; color: #6b7280; }
    .seller {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 8px 10px;
      min-height: 72px;
    }
    .sellerTitle, .sectionTitle {
      font-size: 11px;
      font-weight: 700;
      margin: 0 0 5px;
      color: #111827;
    }
    .sellerBody, .bodyText {
      font-size: 11px;
      line-height: 1.36;
      color: #1f2937;
    }
    .infoGrid {
      display: grid;
      grid-template-columns: 1.35fr 0.9fr;
      gap: 8px;
      margin-bottom: 8px;
      align-items: start;
    }
    .stack { display: grid; gap: 8px; }
    .box {
      border: 1px solid #d1d5db;
      border-radius: 10px;
      padding: 8px 10px;
    }
    .metaRow {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      padding: 1px 0;
      font-size: 11px;
    }
    .metaLabel { color: #6b7280; }
    .metaValue { font-weight: 700; text-align: right; }
    table { width: 100%; border-collapse: collapse; margin-top: 2px; font-size: 11px; }
    th {
      text-align: left;
      font-size: 10.5px;
      color: #374151;
      font-weight: 700;
      padding: 7px 6px;
      border-bottom: 1px solid #111827;
    }
    td {
      padding: 7px 6px;
      border-bottom: 1px solid #e5e7eb;
      vertical-align: top;
    }
    .right { text-align: right; }
    .muted { color: #6b7280; }
    .qtyBadge {
      display: inline-block;
      min-width: 30px;
      text-align: center;
      border: 1px solid #d1d5db;
      border-radius: 999px;
      padding: 1px 8px;
      font-weight: 700;
    }
    .totalsWrap { width: 48%; margin-left: auto; margin-top: 8px; }
    .totalsWrap table { margin-top: 0; }
    .totalsWrap td { border-bottom: none; padding: 3px 4px; }
    .totalsWrap tr.grand td {
      border-top: 1px solid #111827;
      padding-top: 6px;
      font-weight: 800;
    }
    .footer { margin-top: 8px; text-align: center; font-size: 10px; color: #6b7280; }
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
    <div class="seller">
      <div class="sellerTitle">Seller</div>
      <div class="sellerBody">
        <b>Deshio-দেশীয়</b><br/>
        House: 4, Road: 1, Dhaka Housing, Adabor, Mohammadpur, Dhaka-1207.<br/>
        Mobile: 01711-585400<br/>
        BIN: 007243936-0402
      </div>
    </div>
  `;
}

function render(order: any) {
  const r = normalizeOrderForReceipt(order);
  const orderNo = r.orderNo || '';
  const invNo = invoiceNoFromOrderNo(orderNo);
  const sub = Number(r.totals?.subtotal ?? 0);
  const disc = Number(r.totals?.discount ?? 0);
  const delivery = Number(r.totals?.shipping ?? 0);
  const grand = Number(r.totals?.total ?? Math.max(0, sub - disc + delivery));
  const paid = Number(r.totals?.paid ?? 0);
  const due = Number(r.totals?.due ?? Math.max(0, grand - paid));
  const status = paymentStatus(grand, paid, due);

  const customerAddress = compactAddress(r.customerAddressLines || []);
  const noteText = escapeHtml(r.notes || '').replace(/\n/g, '<br/>');

  const items = (r.items || []).map((it: any, i: number) => {
    const desc = [it.name, it.variant].filter(Boolean).join(' - ');
    return `
      <tr>
        <td class="right">${i + 1}</td>
        <td>${escapeHtml(desc)}</td>
        <td class="right"><span class="qtyBadge">${escapeHtml(it.qty)}</span></td>
      </tr>
    `;
  }).join('');

  return `
    <div class="page">
      <div class="topRow">
        <div class="brandBlock">
          <div class="brandLine">
            <img class="logo" src="/logo.png" alt="Logo" />
            <div class="brandText">দেশীয়</div>
          </div>
          <h1 class="title">INVOICE</h1>
          <div class="subtitle">Social Commerce Order</div>
        </div>
        ${companyInfoBlock()}
      </div>

      <div class="infoGrid">
        <div class="stack">
          <div class="box">
            <div class="sectionTitle">Bill To</div>
            <div class="bodyText">
              ${r.customerName ? `<b>${escapeHtml(r.customerName)}</b><br/>` : ''}
              ${r.customerPhone ? `Phone: ${escapeHtml(r.customerPhone)}<br/>` : ''}
              ${customerAddress || '<span class="muted">No address provided</span>'}
            </div>
          </div>

          ${noteText ? `
            <div class="box">
              <div class="sectionTitle">Order Notes</div>
              <div class="bodyText">${noteText}</div>
            </div>
          ` : ''}
        </div>

        <div class="box">
          <div class="sectionTitle">Invoice Details</div>
          <div class="metaRow"><span class="metaLabel">Invoice No</span><span class="metaValue">${escapeHtml(invNo)}</span></div>
          <div class="metaRow"><span class="metaLabel">Order No</span><span class="metaValue">${escapeHtml(orderNo)}</span></div>
          <div class="metaRow"><span class="metaLabel">Status</span><span class="metaValue">${escapeHtml(status)}</span></div>
          ${disc > 0 ? `<div class="metaRow"><span class="metaLabel">Discount</span><span class="metaValue">-৳${escapeHtml(money(disc))}</span></div>` : ''}
          <div class="metaRow"><span class="metaLabel">Paid Amount</span><span class="metaValue">৳${escapeHtml(money(paid))}</span></div>
          <div class="metaRow"><span class="metaLabel">Due Amount</span><span class="metaValue">৳${escapeHtml(money(due))}</span></div>
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 30px;" class="right">#</th>
            <th>Item</th>
            <th style="width: 56px;" class="right">Qty</th>
          </tr>
        </thead>
        <tbody>
          ${items || `<tr><td colspan="3" class="muted">No items</td></tr>`}
        </tbody>
      </table>

      <div class="totalsWrap">
        <table>
          <tbody>
            <tr><td>Subtotal</td><td class="right">${escapeHtml(money(sub))}</td></tr>
            <tr><td>Delivery Fee</td><td class="right">${escapeHtml(money(delivery))}</td></tr>
            ${disc > 0 ? `<tr><td>Discount</td><td class="right">-${escapeHtml(money(disc))}</td></tr>` : ''}
            <tr class="grand"><td>Grand Total</td><td class="right">${escapeHtml(money(grand))}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="footer">This is a computer-generated invoice. Please keep it for your records.</div>
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
