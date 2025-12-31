'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import MyAccountShell from '@/components/ecommerce/my-account/MyAccountShell';
import checkoutService, { Order } from '@/services/checkoutService';

export default function MyAccountOrderDetailsPage({ params }: { params: { orderNumber: string } }) {
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setError('');
      setLoading(true);
      try {
        const o = await checkoutService.getOrderByNumber(params.orderNumber);
        setOrder(o);
      } catch (e: any) {
        setError(e.message || 'Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.orderNumber]);

  return (
    <MyAccountShell title={`Order #${params.orderNumber}`} subtitle="Order details and items.">
      <button onClick={() => router.back()} className="text-sm underline text-gray-700 mb-4">
        Back
      </button>

      {error ? (
        <div className="border border-red-200 bg-red-50 text-red-700 rounded-md p-3 text-sm mb-4">
          {error}
        </div>
      ) : null}

      {loading ? (
        <div className="text-gray-600">Loading...</div>
      ) : !order ? (
        <div className="text-gray-600">Not found.</div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-lg p-4 text-sm">
            <div><span className="text-gray-500">Status:</span> {order.status}</div>
            <div><span className="text-gray-500">Payment:</span> {order.payment_status}</div>
            <div><span className="text-gray-500">Total:</span> {order.total_amount}৳</div>
          </div>

          <div className="border rounded-lg p-4">
            <div className="font-semibold mb-3">Items</div>
            <div className="space-y-2 text-sm">
              {(order.items || []).map((it, idx) => (
                <div key={idx} className="flex justify-between border-b pb-2 last:border-b-0">
                  <div>
                    <div className="font-medium">{it.product_name}</div>
                    <div className="text-gray-600">Qty: {it.quantity}</div>
                  </div>
                  <div>{it.total}৳</div>
                </div>
              ))}
            </div>
          </div>

          <div className="border rounded-lg p-4 text-sm">
            <div className="font-semibold mb-2">Shipping Address</div>
            <div className="text-gray-700">
              {order.shipping_address?.name}<br />
              {order.shipping_address?.phone}<br />
              {order.shipping_address?.address_line_1}, {order.shipping_address?.city}
            </div>
          </div>
        </div>
      )}
    </MyAccountShell>
  );
}
