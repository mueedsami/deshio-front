"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

type Customer = {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
  tags?: string[];
  customer_type?: string;
  customer_code?: string;
  total_orders?: number;
  total_purchases?: string;
};

type LastOrderSummary = {
  last_order_date?: string;
  last_order_total?: number;
  last_order_items_count?: number;
  last_order_id?: number;
};

export type RecentOrderItem = {
  id?: number;
  product_name?: string;
  product_sku?: string;
  quantity?: number;
};

export type RecentOrder = {
  id: number;
  order_number?: string;
  order_date?: string;
  total_amount?: string | number;
  items: RecentOrderItem[];
};

function safeNum(v: any): number {
  const n = Number(String(v ?? "0").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function safeDateStr(v: any): string {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

function normalizeItems(raw: any): RecentOrderItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map((it: any) => {
      if (!it) return null;
      const id = it?.id ?? it?.order_item_id ?? it?.orderItemId;
      const product_name =
        it?.product_name ||
        it?.productName ||
        it?.name ||
        it?.product?.name ||
        it?.product?.title ||
        it?.title;
      const product_sku =
        it?.product_sku || it?.productSku || it?.sku || it?.product?.sku || it?.product_code;
      const quantity =
        typeof it?.quantity === "number"
          ? it.quantity
          : typeof it?.qty === "number"
          ? it.qty
          : safeNum(it?.quantity ?? it?.qty ?? 0);
      return {
        id: typeof id === "number" ? id : id != null ? safeNum(id) : undefined,
        product_name: product_name ? String(product_name) : undefined,
        product_sku: product_sku ? String(product_sku) : undefined,
        quantity,
      } as RecentOrderItem;
    })
    .filter(Boolean) as RecentOrderItem[];
}

function normalizeOrder(o: any): RecentOrder | null {
  if (!o) return null;
  const idRaw = o?.id ?? o?.order_id ?? o?.orderId;
  const id = typeof idRaw === "number" ? idRaw : idRaw != null ? parseInt(String(idRaw), 10) : NaN;
  if (!Number.isFinite(id)) return null;

  const order_number = o?.order_number || o?.orderNo || o?.number || o?.orderNumber;
  const order_date = o?.order_date || o?.created_at || o?.date || o?.orderDate;
  const total_amount = o?.total_amount ?? o?.total ?? o?.grand_total ?? o?.totalAmount;

  // items can come in many shapes
  const itemsRaw =
    o?.items ??
    o?.order_items ??
    o?.orderItems ??
    o?.products ??
    o?.lines ??
    o?.order_lines ??
    [];

  return {
    id,
    order_number: order_number ? String(order_number) : undefined,
    order_date: order_date ? String(order_date) : "",
    total_amount: total_amount ?? "0",
    items: normalizeItems(itemsRaw),
  };
}

function normalizeOrders(list: any): RecentOrder[] {
  const arr = Array.isArray(list) ? list : [];
  const out = arr.map(normalizeOrder).filter(Boolean) as RecentOrder[];

  // Ensure latest-first even if backend returns old-first
  out.sort((a, b) => {
    const da = new Date(a.order_date || "").getTime();
    const db = new Date(b.order_date || "").getTime();
    if (!Number.isFinite(da) && !Number.isFinite(db)) return 0;
    if (!Number.isFinite(da)) return 1;
    if (!Number.isFinite(db)) return -1;
    return db - da;
  });

  return out;
}

export function useCustomerLookup(opts?: {
  debounceMs?: number;
  minLength?: number;
  apiBaseUrl?: string;
}) {
  const debounceMs = opts?.debounceMs ?? 450;
  const minLength = opts?.minLength ?? 6;

  const [phone, setPhone] = useState("");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [lastOrder, setLastOrder] = useState<LastOrderSummary | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lastQueried = useRef<string>("");

  // same auth header logic you use elsewhere
  const axiosInstance = axios.create({
    baseURL: opts?.apiBaseUrl ?? process.env.NEXT_PUBLIC_API_URL,
    headers: { "Content-Type": "application/json", Accept: "application/json" },
  });

  axiosInstance.interceptors.request.use((config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("authToken");
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  useEffect(() => {
    const raw = phone.trim();
    const formatted = raw.replace(/\D/g, "");
    if (formatted.length < minLength) {
      setCustomer(null);
      setLastOrder(null);
      setRecentOrders([]);
      setError(null);
      lastQueried.current = "";
      return;
    }

    // avoid spamming same query
    if (formatted === lastQueried.current) return;

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        lastQueried.current = formatted;

        // 1) lookup customer by phone (new endpoint preferred)
        let found: any = null;
        try {
          const res = await axiosInstance.post("/customers/find-by-phone", { phone: formatted });
          const payload = res.data?.data ?? res.data;
          found = payload?.customer ?? payload;
        } catch {
          // Fallbacks for older builds
          try {
            const res = await axiosInstance.get("/customers/by-phone", { params: { phone: formatted } });
            const payload = res.data?.data ?? res.data;
            found = payload?.customer ?? payload;
          } catch {
            found = null;
          }
        }

        if (!found?.id) {
          setCustomer(null);
          setLastOrder(null);
          setRecentOrders([]);
          return;
        }

        setCustomer(found);

        // 2) fetch last 5 orders (with items if API provides them)
        let orders: RecentOrder[] = [];
        try {
          const res = await axiosInstance.get(`/customers/${found.id}/orders`, {
            params: { per_page: 5, page: 1 },
          });
          const payload = res.data?.data ?? res.data;
          const list = payload?.data ?? payload?.orders ?? payload ?? [];
          orders = normalizeOrders(list).slice(0, 5);
        } catch {
          orders = [];
        }

        // 3) If order list is present but items are missing, best-effort fetch details (max 5 calls)
        const needsItems = orders.some((o) => !Array.isArray(o.items) || o.items.length === 0);
        if (orders.length > 0 && needsItems) {
          const detailed = await Promise.all(
            orders.map(async (o) => {
              try {
                const dres = await axiosInstance.get(`/orders/${o.id}`);
                const body = dres.data?.data ?? dres.data;
                const merged = {
                  ...o,
                  order_number: body?.order_number ?? o.order_number,
                  order_date: body?.order_date ?? body?.created_at ?? o.order_date,
                  total_amount: body?.total_amount ?? body?.total ?? o.total_amount,
                  items: body?.items ?? body?.order_items ?? body?.orderItems ?? o.items,
                };
                return normalizeOrder(merged) || o;
              } catch {
                return o;
              }
            })
          );
          orders = normalizeOrders(detailed).slice(0, 5);
        }

        setRecentOrders(orders);

        // 4) derive last order summary
        const first = orders[0];
        if (first) {
          setLastOrder({
            last_order_id: first.id,
            last_order_date: first.order_date || "",
            last_order_total: safeNum(first.total_amount),
            last_order_items_count: Array.isArray(first.items) ? first.items.length : 0,
          });
        } else {
          // fallback to old summary endpoint (if still present)
          try {
            const lastRes = await axiosInstance.get(`/customers/${found.id}/last-order-summary`);
            const lastPayload = lastRes.data?.data ?? lastRes.data;
            setLastOrder(lastPayload ?? null);
          } catch {
            setLastOrder(null);
          }
        }
      } catch (e: any) {
        setCustomer(null);
        setLastOrder(null);
        setRecentOrders([]);
        setError(e?.response?.data?.message || "Customer lookup failed");
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(t);
  }, [phone, debounceMs, minLength]);

  return {
    phone,
    setPhone,
    customer,
    lastOrder,
    recentOrders,
    loading,
    error,
    clear: () => {
      setPhone("");
      setCustomer(null);
      setLastOrder(null);
      setRecentOrders([]);
      setError(null);
      lastQueried.current = "";
    },
  };
}
