import { PurchaseOrder } from '@/services/purchase-order.service';

const esc = (value: any): string => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const num = (value: any): number => {
  const parsed = typeof value === 'string' ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: any): string => num(value).toFixed(2);

const intVal = (value: any): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmtDate = (value: any): string => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const employeeName = (value: any): string => {
  if (!value) return '—';
  return value.name || value.full_name || value.employee_name || value.username || value.email || String(value);
};

const poSubtotal = (po: any): number => num(po?.subtotal ?? po?.subtotal_amount ?? po?.items?.reduce?.((sum: number, item: any) => sum + num(item?.total_cost), 0) ?? 0);
const poTotal = (po: any): number => num(po?.total_amount ?? poSubtotal(po));
const poPaid = (po: any): number => num(po?.paid_amount);
const poOutstanding = (po: any): number => num(po?.outstanding_amount ?? (poTotal(po) - poPaid(po)));
const orderedQty = (po: any): number => (po?.items || []).reduce((sum: number, item: any) => sum + intVal(item?.quantity_ordered), 0);
const receivedQty = (po: any): number => (po?.items || []).reduce((sum: number, item: any) => sum + intVal(item?.quantity_received), 0);

const baseStyle = `
  * { box-sizing: border-box; }
  body { font-family: Calibri, Arial, sans-serif; color: #111827; margin: 0; padding: 24px; background: #f3f4f6; }
  .sheet { max-width: 1120px; margin: 0 auto; background: #fff; padding: 28px; border: 1px solid #e5e7eb; border-radius: 14px; }
  .top { display: flex; justify-content: space-between; gap: 18px; border-bottom: 2px solid #111827; padding-bottom: 16px; margin-bottom: 18px; }
  .brand { font-size: 24px; font-weight: 800; letter-spacing: .02em; }
  .muted { color: #6b7280; font-size: 12px; }
  h1 { margin: 0; font-size: 22px; }
  h2 { margin: 24px 0 10px; font-size: 16px; }
  .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; }
  .card { border: 1px solid #e5e7eb; border-radius: 10px; padding: 10px 12px; background: #fafafa; }
  .label { color: #6b7280; font-size: 11px; text-transform: uppercase; letter-spacing: .04em; }
  .value { margin-top: 3px; font-size: 14px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
  th { background: #111827; color: #fff; text-align: left; padding: 8px; border: 1px solid #111827; }
  td { padding: 7px 8px; border: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .right { text-align: right; }
  .center { text-align: center; }
  .summary { width: 360px; margin-left: auto; margin-top: 14px; }
  .summary td:first-child { font-weight: 700; }
  .grand td { font-size: 14px; font-weight: 800; background: #f9fafb; }
  .status { display: inline-block; padding: 2px 8px; border-radius: 999px; background: #eef2ff; color: #3730a3; font-weight: 700; font-size: 11px; }
  .print-actions { position: sticky; top: 0; background: #fff; padding: 8px 0 16px; text-align: right; }
  .print-actions button { border: 0; border-radius: 8px; padding: 9px 14px; background: #111827; color: white; cursor: pointer; font-weight: 700; }
  @media print { body { background: #fff; padding: 0; } .sheet { border: 0; border-radius: 0; max-width: none; } .print-actions { display: none; } }
`;

export function openPurchaseOrderPrintWindow(html: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) return;
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
}

export function buildSinglePurchaseOrderPrintHtml(po: PurchaseOrder | any): string {
  const items = Array.isArray(po?.items) ? po.items : [];
  const rows = items.map((item: any, index: number) => {
    const qOrdered = intVal(item?.quantity_ordered);
    const qReceived = intVal(item?.quantity_received);
    const pending = intVal(item?.quantity_pending ?? (qOrdered - qReceived));
    const unitCost = num(item?.unit_cost);
    const totalCost = num(item?.total_cost ?? unitCost * qOrdered);
    const batch = item?.productBatch || item?.product_batch || item?.batch;
    return `
      <tr>
        <td class="center">${index + 1}</td>
        <td><strong>${esc(item?.product_name || item?.product?.name || '—')}</strong><br><span class="muted">${esc(item?.product_sku || item?.product?.sku || '')}</span></td>
        <td class="right">${qOrdered}</td>
        <td class="right">${qReceived}</td>
        <td class="right">${pending}</td>
        <td class="right">${money(unitCost)}</td>
        <td class="right">${money(item?.unit_sell_price)}</td>
        <td>${esc(batch?.batch_number || item?.batch_number || '—')}</td>
        <td class="right">${money(totalCost)}</td>
      </tr>`;
  }).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>PO Report - ${esc(po?.po_number || po?.id || '')}</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="sheet">
    <div class="print-actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="top">
      <div>
        <div class="brand">Deshio</div>
        <div class="muted">Purchase Order Report generated from frontend live PO data</div>
      </div>
      <div class="right">
        <h1>Purchase Order</h1>
        <div class="muted">Generated: ${fmtDate(new Date().toISOString())}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card"><div class="label">PO Number</div><div class="value">${esc(po?.po_number)}</div></div>
      <div class="card"><div class="label">Status</div><div class="value"><span class="status">${esc(po?.status)}</span></div></div>
      <div class="card"><div class="label">Payment</div><div class="value">${esc(po?.payment_status)}</div></div>
      <div class="card"><div class="label">Order Date</div><div class="value">${fmtDate(po?.order_date || po?.created_at)}</div></div>
      <div class="card"><div class="label">Vendor</div><div class="value">${esc(po?.vendor?.name || '—')}</div></div>
      <div class="card"><div class="label">Store / Warehouse</div><div class="value">${esc(po?.store?.name || '—')}</div></div>
      <div class="card"><div class="label">Created By</div><div class="value">${esc(employeeName(po?.createdBy || po?.created_by))}</div></div>
      <div class="card"><div class="label">Received By</div><div class="value">${esc(employeeName(po?.receivedBy || po?.received_by))}</div></div>
      <div class="card"><div class="label">Ordered Qty</div><div class="value">${orderedQty(po)}</div></div>
      <div class="card"><div class="label">Received Qty</div><div class="value">${receivedQty(po)}</div></div>
      <div class="card"><div class="label">Expected Delivery</div><div class="value">${fmtDate(po?.expected_delivery_date)}</div></div>
      <div class="card"><div class="label">Received At</div><div class="value">${fmtDate(po?.received_at)}</div></div>
    </div>

    <h2>Items</h2>
    <table>
      <thead><tr><th>#</th><th>Product</th><th class="right">Ordered</th><th class="right">Received</th><th class="right">Pending</th><th class="right">Cost</th><th class="right">Sell</th><th>Batch</th><th class="right">Total Cost</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="9" class="center">No items found</td></tr>'}</tbody>
    </table>

    <table class="summary">
      <tr><td>Subtotal</td><td class="right">${money(poSubtotal(po))}</td></tr>
      <tr><td>Tax</td><td class="right">${money(po?.tax_amount)}</td></tr>
      <tr><td>Discount</td><td class="right">${money(po?.discount_amount)}</td></tr>
      <tr><td>Shipping</td><td class="right">${money(po?.shipping_cost)}</td></tr>
      <tr class="grand"><td>Total</td><td class="right">${money(poTotal(po))}</td></tr>
      <tr><td>Paid</td><td class="right">${money(poPaid(po))}</td></tr>
      <tr><td>Outstanding</td><td class="right">${money(poOutstanding(po))}</td></tr>
    </table>

    ${po?.notes ? `<h2>Notes</h2><div class="card">${esc(po.notes)}</div>` : ''}
  </div>
</body>
</html>`;
}

export function buildPurchaseOrderSummaryPrintHtml(purchaseOrders: any[], filters: Record<string, any> = {}): string {
  const totals = purchaseOrders.reduce((acc, po) => {
    acc.count += 1;
    acc.ordered += orderedQty(po);
    acc.received += receivedQty(po);
    acc.subtotal += poSubtotal(po);
    acc.total += poTotal(po);
    acc.paid += poPaid(po);
    acc.outstanding += poOutstanding(po);
    return acc;
  }, { count: 0, ordered: 0, received: 0, subtotal: 0, total: 0, paid: 0, outstanding: 0 });

  const filterText = Object.entries(filters)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}: ${value}`)
    .join(' | ') || 'All purchase orders';

  const rows = purchaseOrders.map((po, index) => `
    <tr>
      <td class="center">${index + 1}</td>
      <td><strong>${esc(po?.po_number)}</strong><br><span class="muted">ID: ${esc(po?.id)}</span></td>
      <td>${esc(po?.vendor?.name || '—')}</td>
      <td>${esc(po?.store?.name || '—')}</td>
      <td>${fmtDate(po?.order_date || po?.created_at)}</td>
      <td><span class="status">${esc(po?.status)}</span></td>
      <td>${esc(po?.payment_status)}</td>
      <td class="right">${orderedQty(po)}</td>
      <td class="right">${receivedQty(po)}</td>
      <td class="right">${money(poTotal(po))}</td>
      <td class="right">${money(poPaid(po))}</td>
      <td class="right">${money(poOutstanding(po))}</td>
    </tr>`).join('');

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Purchase Order Summary Report</title>
  <style>${baseStyle}</style>
</head>
<body>
  <div class="sheet">
    <div class="print-actions"><button onclick="window.print()">Print / Save as PDF</button></div>
    <div class="top">
      <div>
        <div class="brand">Deshio</div>
        <div class="muted">Purchase Order Summary generated from frontend live PO API data</div>
      </div>
      <div class="right">
        <h1>PO Summary Report</h1>
        <div class="muted">Generated: ${fmtDate(new Date().toISOString())}</div>
      </div>
    </div>

    <div class="grid">
      <div class="card"><div class="label">PO Count</div><div class="value">${totals.count}</div></div>
      <div class="card"><div class="label">Ordered Qty</div><div class="value">${totals.ordered}</div></div>
      <div class="card"><div class="label">Received Qty</div><div class="value">${totals.received}</div></div>
      <div class="card"><div class="label">Total Amount</div><div class="value">${money(totals.total)}</div></div>
      <div class="card"><div class="label">Paid</div><div class="value">${money(totals.paid)}</div></div>
      <div class="card"><div class="label">Outstanding</div><div class="value">${money(totals.outstanding)}</div></div>
      <div class="card" style="grid-column: span 2;"><div class="label">Filters</div><div class="value" style="font-size:12px;">${esc(filterText)}</div></div>
    </div>

    <h2>Purchase Orders</h2>
    <table>
      <thead><tr><th>#</th><th>PO</th><th>Vendor</th><th>Store</th><th>Date</th><th>Status</th><th>Payment</th><th class="right">Ordered</th><th class="right">Received</th><th class="right">Total</th><th class="right">Paid</th><th class="right">Outstanding</th></tr></thead>
      <tbody>${rows || '<tr><td colspan="12" class="center">No purchase orders found</td></tr>'}</tbody>
    </table>
  </div>
</body>
</html>`;
}

export function purchaseOrdersToCsv(purchaseOrders: any[]): string {
  const headers = ['PO ID','PO Number','Vendor','Store','Order Date','Status','Payment Status','Ordered Qty','Received Qty','Subtotal','Tax','Discount','Shipping','Total','Paid','Outstanding','Created By','Received By'];
  const lines = [headers];
  purchaseOrders.forEach((po) => {
    lines.push([
      po?.id,
      po?.po_number,
      po?.vendor?.name || '',
      po?.store?.name || '',
      fmtDate(po?.order_date || po?.created_at),
      po?.status,
      po?.payment_status,
      orderedQty(po),
      receivedQty(po),
      money(poSubtotal(po)),
      money(po?.tax_amount),
      money(po?.discount_amount),
      money(po?.shipping_cost),
      money(poTotal(po)),
      money(poPaid(po)),
      money(poOutstanding(po)),
      employeeName(po?.createdBy || po?.created_by),
      employeeName(po?.receivedBy || po?.received_by),
    ]);
  });
  return lines.map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}
