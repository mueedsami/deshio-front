"use client";

import { useEffect, useRef, useState } from "react";
import axios from "axios";

type Customer = {
  id: number;
  name?: string;
  phone?: string;
  email?: string;
};

type LastOrderSummary = {
  last_order_date?: string;
  last_order_total?: number;
  last_order_items_count?: number;
  last_order_id?: number;
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
    if (raw.length < minLength) {
      setCustomer(null);
      setLastOrder(null);
      setError(null);
      lastQueried.current = "";
      return;
    }

    // avoid spamming same query
    if (raw === lastQueried.current) return;

    const t = setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);

        lastQueried.current = raw;

        // 1) lookup customer by phone
        const res = await axiosInstance.get("/customers/by-phone", {
          params: { phone: raw },
        });

        const payload = res.data?.data ?? res.data; // supports both shapes
        const found = payload?.customer ?? payload; // in case backend nests

        if (!found?.id) {
          setCustomer(null);
          setLastOrder(null);
          return;
        }

        setCustomer(found);

        // 2) fetch last purchase/summary
        const lastRes = await axiosInstance.get(
          `/customers/${found.id}/last-order-summary`
        );
        const lastPayload = lastRes.data?.data ?? lastRes.data;
        setLastOrder(lastPayload ?? null);
      } catch (e: any) {
        setCustomer(null);
        setLastOrder(null);
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
    loading,
    error,
    clear: () => {
      setPhone("");
      setCustomer(null);
      setLastOrder(null);
      setError(null);
      lastQueried.current = "";
    },
  };
}
