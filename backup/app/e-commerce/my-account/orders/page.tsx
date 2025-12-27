'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import MyAccountShell from '@/components/ecommerce/my-account/MyAccountShell';
import checkoutService, { Order } from '@/services/checkoutService';

export default function MyAccountOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [status, setStatus] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const load = async () => {
    setError('');
    setLoading(true);
    try {
      const data = await checkoutService.getOrders({
        per_page: 15,
        status: status || undefined,
        search: search || undefined,
      } as any);

      // backend returns { orders, pagination }
      setOrders((data as any).orders || []);
    } catch (e: any) {
      setError(e.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MyAccountShell
      title="Orders"
      subtitle="View your recent orders and track delivery status."
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search order number..."
            className="border rounded-md px-3 py-2 text-sm w-64"
          />
          <button
            onClick={load}
            className="bg-red-700 text-white px-4 py-2 rounded-md text-sm hover:bg-red-800"
          >
            Search
          </button>
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border rounded-md px-3 py-2 text-sm w-52"
        >
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="processing">Processing</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <button
        onClick={load}
        className="mb-6 text-sm text-gray-700 underline"
      >
        Apply filters
      </button>

      {error ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm mb-4">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-gray-600">Loading orders...</div>
      ) : (
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="p-3">Order</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3">Total</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.order_number} className="border-t">
                  <td className="p-3 font-medium">#{o.order_number}</td>
                  <td className="p-3">{new Date(o.created_at).toLocaleString()}</td>
                  <td className="p-3">{o.status}</td>
                  <td className="p-3">{o.total_amount}৳</td>
                  <td className="p-3">
                    <Link
                      className="text-red-700 hover:underline"
                      href={`/e-commerce/my-account/orders/${o.order_number}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}

              {!orders.length ? (
                <tr>
                  <td className="p-4 text-gray-600" colSpan={5}>
                    No orders found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </MyAccountShell>
  );
}
