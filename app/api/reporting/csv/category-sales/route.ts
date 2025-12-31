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

type CategoryAgg = {
  category: string;
  soldQty: number;
  subtotal: number;
  discount: number;
  exchangeAmount: number;
  returnAmount: number;
};

function getCreatedAt(row: AnyObj): Date | null {
  const raw = row.created_at || row.createdAt || row.created || row.date;
  if (!raw) return null;
  const d = new Date(raw);
  if (!Number.isNaN(d.getTime())) return d;
  // Some demo data uses "06-Oct-2025" style
  const try2 = new Date(String(raw).replace(/-/g, ' '));
  return Number.isNaN(try2.getTime()) ? null : try2;
}

function normalizeCategoryName(product: AnyObj, categoriesById: Map<number, AnyObj>): string {
  const catId = Number(product?.category_id || product?.category?.id || 0);
  const cat = catId ? categoriesById.get(catId) : null;
  if (!cat) return 'Uncategorized';

  // Build a "Parent / Child" label if parent exists
  const title = String(cat.title || cat.name || 'Uncategorized');
  const parentId = Number(cat.parent_id || 0);
  if (!parentId) return title;
  const parent = categoriesById.get(parentId);
  if (!parent) return title;
  const pTitle = String(parent.title || parent.name || '').trim();
  return pTitle ? `${pTitle} / ${title}` : title;
}

function sumOrderReturns(order: AnyObj): number {
  const hist = Array.isArray(order.returnHistory) ? order.returnHistory : [];
  // Each entry has refundAmount (total reduction)
  return hist.reduce((sum: number, h: AnyObj) => sum + safeNum(h.refundAmount || h.refund_amount || 0), 0);
}

function sumOrderExchanges(order: AnyObj): number {
  const hist = Array.isArray(order.exchangeHistory) ? order.exchangeHistory : [];
  // "Value of exchanged products" is ambiguous; for demo we use the removed-products value.
  // If removedProducts includes amount/price, use that; otherwise fallback to abs(difference).
  return hist.reduce((sum: number, h: AnyObj) => {
    const removed = Array.isArray(h.removedProducts) ? h.removedProducts : [];
    const removedValue = removed.reduce((s: number, rp: AnyObj) => {
      const qty = safeNum(rp.quantity ?? rp.qty ?? 0);
      const price = safeNum(rp.price ?? rp.unit_price ?? rp.unitPrice ?? 0);
      const amount = safeNum(rp.amount ?? 0);
      return s + (amount || qty * price);
    }, 0);
    if (removedValue > 0) return sum + removedValue;
    const diff = safeNum(h.difference ?? 0);
    return sum + Math.abs(diff);
  }, 0);
}

async function getRemoteData(req: Request, params: URLSearchParams): Promise<{
  orders: AnyObj[];
  products: AnyObj[];
  categories: AnyObj[];
} | null> {
  const base = process.env.NEXT_PUBLIC_API_URL;
  if (!base) return null;

  const auth = req.headers.get('authorization') || '';
  const commonInit: RequestInit = auth ? { headers: { Authorization: auth } } : {};

  // 1) Orders (paginated)
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

  // 2) Products (we need category_id)
  const products: AnyObj[] = [];
  for (let page = 1; page <= 30; page++) {
    const pq = new URLSearchParams({ per_page: '1000', page: String(page) });
    const pres = await tryFetchJson(`${base.replace(/\/+$/g, '')}/products?${pq.toString()}`, commonInit);
    if (!pres) break;
    const pRoot = pres?.data ?? pres;
    const list: AnyObj[] = Array.isArray(pRoot?.products)
      ? pRoot.products
      : Array.isArray(pRoot?.data)
        ? pRoot.data
        : Array.isArray(pRoot)
          ? pRoot
          : [];
    products.push(...list);
    const pLast = safeNum(pRoot?.last_page || pRoot?.pagination?.last_page || 1) || 1;
    if (page >= pLast) break;
    if (!list.length) break;
  }

  // 3) Categories
  const cq = new URLSearchParams({ per_page: '2000' });
  const cres = await tryFetchJson(`${base.replace(/\/+$/g, '')}/categories?${cq.toString()}`, commonInit);
  const cRoot = cres?.data ?? cres;
  const categories: AnyObj[] = Array.isArray(cRoot?.data) ? cRoot.data : Array.isArray(cRoot) ? cRoot : [];

  return { orders, products, categories };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const params = url.searchParams;

  const range = parseDateRange(params.get('date_from'), params.get('date_to'));
  const statusFilter = params.get('status');
  const storeId = params.get('store_id');

  // Prefer remote (real backend) if configured; fallback to demo JSON files.
  const remote = await getRemoteData(req, params);

  const localOrders: AnyObj[] = readJsonIfExists('orders.json') || [];
  const localSales: AnyObj[] = readJsonIfExists('sales.json') || [];

  const allRows: AnyObj[] = remote ? remote.orders : [...localOrders, ...localSales];

  // Product->Category mapping (remote best-effort)
  const productsById = new Map<number, AnyObj>();
  (remote?.products || []).forEach((p) => {
    const id = Number(p?.id);
    if (id) productsById.set(id, p);
  });
  const categoriesById = new Map<number, AnyObj>();
  (remote?.categories || []).forEach((c) => {
    const id = Number(c?.id);
    if (id) categoriesById.set(id, c);
  });

  const agg = new Map<string, CategoryAgg>();

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

    // Normalize items
    const items: AnyObj[] = Array.isArray(row.items)
      ? row.items
      : Array.isArray(row.products)
        ? row.products
        : Array.isArray(row?.sale?.items)
          ? row.sale.items
          : [];

    const rowReturns = sumOrderReturns(row);
    const rowExchanges = sumOrderExchanges(row);

    // If we can't split returns/exchanges by category, we apportion by gross share.
    const itemGross = items.map((it) => {
      const qty = safeNum(it.quantity ?? it.qty ?? 0);
      const unit = safeNum(it.unit_price ?? it.price ?? 0);
      const gross = qty * unit;
      return { it, gross, qty };
    });
    const totalGross = itemGross.reduce((s, x) => s + x.gross, 0) || 1;

    for (const { it, gross, qty } of itemGross) {
      const productId = Number(it.product_id ?? it.productId ?? it.id ?? 0);
      const product = productId ? productsById.get(productId) : null;
      const category = product ? normalizeCategoryName(product, categoriesById) : 'Uncategorized';

      const discount = safeNum(it.discount_amount ?? it.discount ?? 0);

      const share = gross / totalGross;
      const exch = rowExchanges * share;
      const ret = rowReturns * share;

      const existing = agg.get(category) || {
        category,
        soldQty: 0,
        subtotal: 0,
        discount: 0,
        exchangeAmount: 0,
        returnAmount: 0,
      };

      existing.soldQty += qty;
      existing.subtotal += gross;
      existing.discount += discount;
      existing.exchangeAmount += exch;
      existing.returnAmount += ret;

      agg.set(category, existing);
    }
  }

  const rows = Array.from(agg.values()).sort((a, b) => b.subtotal - a.subtotal);
  const vatRate = 0.075;

  const csvRows: any[][] = [
    [
      'Category',
      'Sold Qty',
      'SUB Total',
      'Discount Amount',
      'Exchange Amount',
      'Return Amount',
      'Net Sales (without VAT)',
      'VAT Amount (7.5)',
      'Net Amount',
    ],
  ];

  for (const r of rows) {
    const netWithoutVat = r.subtotal - r.discount - r.returnAmount - r.exchangeAmount;
    const vat = netWithoutVat * vatRate;
    const net = netWithoutVat + vat;
    csvRows.push([
      r.category,
      Math.round(r.soldQty),
      r.subtotal.toFixed(2),
      r.discount.toFixed(2),
      r.exchangeAmount.toFixed(2),
      r.returnAmount.toFixed(2),
      netWithoutVat.toFixed(2),
      vat.toFixed(2),
      net.toFixed(2),
    ]);
  }

  const csv = toCsv(csvRows);
  const filename = `category-sales-report-${nowStamp()}.csv`;

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
      'X-Report-Source': remote ? 'remote' : 'local',
    },
  });
}
