import { NextResponse } from 'next/server';
import {
  AnyObj,
  inRange,
  nowStamp,
  parseDateRange,
  readJsonIfExists,
  safeNum,
  toCsv,
  tryFetchJson,
} from '../_shared';

function getCreatedAt(row: AnyObj): Date | null {
  const raw = row.created_at || row.createdAt || row.created || row.order_date || row.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  // Some demo data uses "06-Oct-2025" style
  const try2 = new Date(String(raw).replace(/-/g, ' '));
  return Number.isNaN(try2.getTime()) ? null : try2;
}

function normalizeAddress(order: AnyObj): string {
  const a = order.shipping_address || order.deliveryAddress || {};
  if (typeof a === 'string') return a;
  const parts = [a.address, a.area, a.zone, a.city, a.district, a.division, a.postalCode]
    .map((x) => String(x || '').trim())
    .filter(Boolean);
  return parts.join(', ');
}

function normalizeProducts(order: AnyObj): AnyObj[] {
  if (Array.isArray(order.items)) return order.items;
  if (Array.isArray(order.products)) return order.products;
  if (Array.isArray(order?.sale?.items)) return order.sale.items;
  return [];
}

function orderPaymentMethod(order: AnyObj): string {
  // Backend order shape
  const payments = order.payments || order.payment || {};
  if (typeof payments?.payment_method === 'string') return payments.payment_method;
  if (typeof payments?.paymentMethod === 'string') return payments.paymentMethod;
  if (typeof payments?.payment_method_id !== 'undefined') return `method#${payments.payment_method_id}`;

  // Demo social order shape
  const keys = ['cash', 'card', 'bkash', 'nagad', 'sslCommerz', 'advance'];
  for (const k of keys) {
    if (safeNum(payments?.[k]) > 0) return k;
  }
  return '';
}

async function getRemoteOrders(req: Request, params: URLSearchParams): Promise<AnyObj[] | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;

  const auth = req.headers.get('authorization') || '';
  const commonInit: RequestInit = auth ? { headers: { Authorization: auth } } : {};

  const q = new URLSearchParams();
  ['date_from', 'date_to', 'store_id', 'status', 'customer_id'].forEach((k) => {
    const v = params.get(k);
    if (v) q.set(k, v);
  });
  q.set('per_page', '500');
  q.set('page', '1');

  const first = await tryFetchJson(`${base.replace(/\/+$/g, '')}/orders?${q.toString()}`, commonInit);
  if (!first) return null;

  const root = first?.data ?? first;
  const firstPage: AnyObj[] = Array.isArray(root?.data) ? root.data : Array.isArray(root) ? root : [];
  const lastPage = safeNum(root?.last_page || root?.pagination?.last_page || 1) || 1;

  const orders: AnyObj[] = [...firstPage];
  for (let page = 2; page <= Math.min(100, lastPage); page++) {
    q.set('page', String(page));
    const next = await tryFetchJson(`${base.replace(/\/+$/g, '')}/orders?${q.toString()}`, commonInit);
    const nRoot = next?.data ?? next;
    const nPage: AnyObj[] = Array.isArray(nRoot?.data) ? nRoot.data : Array.isArray(nRoot) ? nRoot : [];
    orders.push(...nPage);
    if (!nPage.length) break;
  }

  return orders;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const range = parseDateRange(params.get('date_from'), params.get('date_to'));
  const statusFilter = params.get('status');
  const storeId = params.get('store_id');
  const customerId = params.get('customer_id');

  const remoteOrders = await getRemoteOrders(req, params);

  const localOrders: AnyObj[] = readJsonIfExists('orders.json') || [];
  const localSales: AnyObj[] = readJsonIfExists('sales.json') || [];

  // Prefer remote if configured; fallback to local demo JSON.
  const allRows: AnyObj[] = remoteOrders ? remoteOrders : [...localOrders, ...localSales];

  const csvRows: any[][] = [
    [
      'Creation Date',
      'Invoice Number',
      'Customer Name',
      'Customer Phone',
      'Customer Address',
      'Product Name And QTY',
      'Product Specification',
      'Product Attribute',
      'Sub Total Price',
      'Discount',
      'Price After Discount',
      'Delivery Charge',
      'Total Price',
      'Paid Amount',
      'Due Amount',
      'Delivery Partner',
      'Delivery Area',
      'Payment Method',
      'Order Status',
    ],
  ];

  for (const row of allRows) {
    const createdAt = getCreatedAt(row);
    if (!inRange(createdAt, range)) continue;

    // Optional filters (only when row has these fields)
    if (statusFilter) {
      const st = String(row.status || row.order_status || '').toLowerCase();
      if (st && st !== String(statusFilter).toLowerCase()) continue;
    }
    if (storeId) {
      const sid = String(row.store_id || row.storeId || row.store?.id || '');
      if (sid && sid !== String(storeId)) continue;
    }
    if (customerId) {
      const cid = String(row.customer_id || row.customer?.id || '');
      if (cid && cid !== String(customerId)) continue;
    }

    const customer = row.customer || {};
    const products = normalizeProducts(row);

    const productNameQty = products
      .map((p) => {
        const name = p.product_name || p.productName || p.name || '';
        const qty = safeNum(p.quantity ?? p.qty ?? 0);
        return `${name} x${qty}`;
      })
      .filter(Boolean)
      .join(' | ');

    const productSpec = products
      .map((p) => {
        const size = p.size ?? p.variant ?? '';
        const sku = p.product_sku || p.sku || '';
        const parts = [sku ? `SKU:${sku}` : '', size ? `Size:${size}` : ''].filter(Boolean);
        return parts.join(' ');
      })
      .filter(Boolean)
      .join(' | ');

    // Financials (support multiple shapes)
    const subtotal = safeNum(row.subtotal ?? row.amounts?.subtotal ?? row.sub_total ?? row.subTotalPrice ?? 0);
    const discount = safeNum(row.discount_amount ?? row.amounts?.totalDiscount ?? row.discount ?? 0);
    const afterDiscount = subtotal - discount;
    const delivery = safeNum(row.shipping_amount ?? row.amounts?.transportCost ?? row.delivery_charge ?? row.deliveryCharge ?? 0);
    const total = safeNum(row.total_amount ?? row.amounts?.total ?? row.total ?? 0);
    const paid = safeNum(row.paid_amount ?? row.payments?.totalPaid ?? row.payments?.paid ?? 0);
    const due = safeNum(row.outstanding_amount ?? row.payments?.due ?? (total - paid));

    const invoice = row.order_number || row.invoice_number || row.orderNumber || row.id || '';
    const orderStatus = row.status || row.order_status || (due > 0 ? 'pending' : 'completed');
    const deliveryPartner = row.delivery_partner || row.deliveryPartner || '';
    const deliveryArea = row.delivery_area || row.deliveryAddress?.district || row.deliveryAddress?.city || '';
    const paymentMethod = orderPaymentMethod(row);

    csvRows.push([
      createdAt ? createdAt.toISOString() : '',
      invoice,
      customer.name || row.customer_name || '',
      customer.phone || row.customer_phone || '',
      normalizeAddress(row),
      productNameQty,
      productSpec,
      '',
      subtotal.toFixed(2),
      discount.toFixed(2),
      afterDiscount.toFixed(2),
      delivery.toFixed(2),
      total.toFixed(2),
      paid.toFixed(2),
      due.toFixed(2),
      deliveryPartner,
      deliveryArea,
      paymentMethod,
      String(orderStatus),
    ]);
  }

  const csv = toCsv(csvRows);
  const filename = `sales-report-${nowStamp()}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Report-Source': remoteOrders ? 'remote' : 'local',
    },
  });
}
