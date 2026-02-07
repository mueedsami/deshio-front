// lib/posReceiptHtml.ts
// Detailed POS receipt (RISE-style) - no barcode, no VAT row.
// Works with the same ReceiptPreviewModalHost.

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

function fmtDateTime(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return String(iso);
  const pad = (x: number) => String(x).padStart(2, '0');
  const date = `${pad(d.getDate())}-${d.toLocaleString('en-US', { month: 'short' })}-${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { date, time };
}

function wrapHtml(title: string, inner: string, opts?: { embed?: boolean }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: 80mm auto; margin: 6mm; }
    body {
      font-family: Calibri, Arial, Helvetica, sans-serif;
      color: #111;
      font-size: 13px;
      font-weight: 700;
      line-height: 1.35;
      margin: 0;
    }
    .center { text-align: center; }
    .muted { color: #333; }
    .tiny { font-size: 12px; }
    .small { font-size: 13px; }
    .h { font-size: 24px; font-weight: 800; letter-spacing: 0.7px; margin: 0; }
    .line { border-top: 1px dashed #999; margin: 10px 0; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    th { text-align: left; border-bottom: 1px solid #ddd; padding: 5px 0; font-weight: 800; }
    td { padding: 4px 0; vertical-align: top; }
    .right { text-align: right; }
    .nowrap { white-space: nowrap; }
    .totals td { padding: 3px 0; }
    .totals .label { width: 60%; }
    .totals .val { width: 40%; text-align: right; }
    .footer { margin-top: 10px; font-size: 12px; text-align: center; color: #333; font-weight: 700; }
    ${opts?.embed ? 'html,body{height:100%;}' : ''}
  </style>
</head>
<body>
${inner}
</body>
</html>`;
}

function companyBlock() {
  return `
    <div class="center">
      <div class="h">DESHIO</div>
      <div class="small muted">Deshio-দেশীয়</div>
      <div class="tiny muted">House: 4, Road: 1, Dhaka Housing, Adabor, Mohammadpur, Dhaka-1207.</div>
      <div class="tiny muted">Mobile: 01711-585400</div>
      <div class="tiny muted">BIN : 007243936-0402</div>
    </div>
  `;
}

function render(order: any) {
  const r = normalizeOrderForReceipt(order);

  const dt = fmtDateTime(r.dateTime);
  const sub = Number(r.totals?.subtotal ?? 0);
  const disc = Number(r.totals?.discount ?? 0);
  const ship = Number(r.totals?.shipping ?? 0);
  // VAT is intentionally ignored in this template
  const net = Number(r.totals?.total ?? Math.max(0, sub - disc + ship));

  const paid = Number(r.totals?.paid ?? 0);
  const change = Number(r.totals?.change ?? 0);

  // Attempt to find payment breakdown if present
  const payments: { label: string; amount: number }[] = [];
  const p = (order?.payments || order?.payment || {}) as any;

  const push = (label: string, val: any) => {
    const num = Number(val ?? 0);
    if (isFinite(num) && num > 0) payments.push({ label, amount: num });
  };

  push('CASH', p.cash || p.cash_paid || order?.cashPaid);
  push('CARD', p.card || p.card_paid || order?.cardPaid);
  push('BKASH', p.bkash || p.bkash_paid || order?.bkashPaid);
  push('NAGAD', p.nagad || p.nagad_paid || order?.nagadPaid);

  const header = companyBlock();

  const meta = `
    <div class="small">
      <div>Order: <span class="nowrap">${escapeHtml(r.orderNo || '')}</span> <span class="right"></span></div>
      ${dt ? `<div>Date: ${escapeHtml((dt as any).date)} <span class="right">Time: ${escapeHtml((dt as any).time)}</span></div>` : ''}
      ${r.salesBy ? `<div>Served by: ${escapeHtml(r.salesBy)}</div>` : ''}
      ${r.customerName ? `<div>Name: ${escapeHtml(r.customerName)}</div>` : ''}
      ${r.customerPhone ? `<div>Mobile: ${escapeHtml(r.customerPhone)}</div>` : ''}
      ${r.customerAddressLines?.length ? `<div>Address: ${escapeHtml(r.customerAddressLines.join(', '))}</div>` : ''}
    </div>
  `;

  const rows = (r.items || [])
    .map((it: any) => {
      const desc = [it.name, it.variant].filter(Boolean).join(' - ');
      return `
        <tr>
          <td>${escapeHtml(desc)}</td>
          <td class="right nowrap">${escapeHtml(it.qty)}</td>
          <td class="right nowrap">${escapeHtml(money(it.unitPrice))}</td>
          <td class="right nowrap">${escapeHtml(money(it.lineTotal))}</td>
        </tr>
      `;
    })
    .join('');

  const totals = `
    <table class="totals">
      <tbody>
        <tr><td class="label">Sub Total</td><td class="val">${escapeHtml(money(sub))}</td></tr>
        ${disc > 0 ? `<tr><td class="label">Discount</td><td class="val">-${escapeHtml(money(disc))}</td></tr>` : ''}
        ${ship > 0 ? `<tr><td class="label">Delivery Fee</td><td class="val">${escapeHtml(money(ship))}</td></tr>` : ''}
        <tr><td class="label"><b>Net Amount</b></td><td class="val"><b>${escapeHtml(money(net))}</b></td></tr>
        ${paid > 0 ? `<tr><td class="label">Paid Amount</td><td class="val">${escapeHtml(money(paid))}</td></tr>` : ''}
        ${change > 0 ? `<tr><td class="label">Change Amount</td><td class="val">${escapeHtml(money(change))}</td></tr>` : ''}
      </tbody>
    </table>
  `;

  const paymentInfo = payments.length
    ? `
      <div class="line"></div>
      <div class="small"><b>Payment Info:</b></div>
      <table>
        <thead>
          <tr><th>DESCRIPTION</th><th class="right">AMOUNT</th></tr>
        </thead>
        <tbody>
          ${payments
            .map((x) => `<tr><td>${escapeHtml(x.label)}</td><td class="right">${escapeHtml(money(x.amount))}</td></tr>`)
            .join('')}
        </tbody>
      </table>
    `
    : '';

  const footer = `
    <div class="line"></div>
    <div class="footer">
      Items sold cannot be returned but may only be exchanged in their unworn condition with tags and original receipt within 7 days.<br/>
      Undergarments are final sale and cannot be exchanged.<br/><br/>
      Thank you for shopping at Deshio.
    </div>
  `;

  return `
    ${header}
    <div class="line"></div>
    ${meta}
    <div class="line"></div>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="right">Qty</th>
          <th class="right">MRP</th>
          <th class="right">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${rows || '<tr><td colspan="4" class="center muted">No items</td></tr>'}
      </tbody>
    </table>
    <div class="line"></div>
    ${totals}
    ${paymentInfo}
    ${footer}
  `;
}

export function posReceiptHtml(order: any, opts?: { embed?: boolean }) {
  return wrapHtml('POS Receipt', render(order), opts);
}

export function posReceiptBulkHtml(orders: any[], opts?: { embed?: boolean }) {
  const pages = (orders || [])
    .map((o) => `<div style="page-break-after: always;">${render(o)}</div>`)
    .join('');
  return wrapHtml('POS Receipts', pages || '<p>No orders</p>', opts);
}
