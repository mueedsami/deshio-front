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

export type RecentOrder = {
  id: number;
  order_number?: string;
  order_date?: string;
  total_amount?: string | number;
  status?: string;
  items?: any[];
};

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

        // 1) lookup customer by phone
        let found: any = null;
        try {
          const res = await axiosInstance.post('/customers/find-by-phone', { phone: formatted });
          const payload = res.data?.data ?? res.data;
          found = payload?.customer ?? payload;
        } catch (err: any) {
          try {
            const res = await axiosInstance.get('/customers/by-phone', { params: { phone: formatted } });
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

        // 2) fetch last 5 orders for history
        try {
          const ordersRes = await axiosInstance.get(`/customers/${found.id}/orders`, {
            params: { per_page: 5, sort_by: 'order_date', sort_order: 'desc' },
          });
          const ordersPayload = ordersRes.data?.data ?? ordersRes.data;
          const list = ordersPayload?.data ?? ordersPayload?.orders ?? ordersPayload ?? [];
          const orders = Array.isArray(list) ? list : [];
          
          setRecentOrders(orders);

          if (orders.length > 0) {
            const last = orders[0];
            setLastOrder({
              last_order_id: last?.id,
              last_order_date: last?.order_date || last?.created_at || last?.date,
              last_order_total: Number(last?.total_amount ?? last?.total ?? 0),
              last_order_items_count: Number(last?.items_count ?? last?.total_items ?? last?.items?.length ?? 0),
            });
          } else {
            setLastOrder(null);
          }
        } catch {
          setRecentOrders([]);
          setLastOrder(null);
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
