'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navigation from '@/components/ecommerce/Navigation';
import checkoutService from '@/services/checkoutService';
import sslcommerzService from '@/services/sslcommerzService';
import { CheckCircle2, Loader2, AlertCircle, ShoppingBag } from 'lucide-react';

type UiState = 'loading' | 'success' | 'processing' | 'failed';

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [state, setState] = useState<UiState>('loading');
  const [message, setMessage] = useState<string>('Verifying your payment...');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);

  const intent = useMemo(() => sslcommerzService.getPaymentIntent(), []);

  useEffect(() => {
    const fromIntent = intent?.order_number || null;

    // SSLCommerz may send order reference in value_a (depends on your integration)
    const fromQuery =
      searchParams.get('order_number') ||
      searchParams.get('value_a') ||
      null;

    const resolved = fromIntent || fromQuery;
    setOrderNumber(resolved);

    if (!resolved) {
      setState('failed');
      setMessage('Order reference not found. Please check “My Account → Orders”.');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 10;
    const delayMs = 2000;

    const poll = async () => {
      attempts += 1;

      try {
        const order = await checkoutService.getOrderByNumber(resolved);
        if (cancelled) return;

        const ps = (order.payment_status || '').toLowerCase();
        const paid = ps === 'paid' || ps === 'completed';
        const failed = ps === 'failed' || ps === 'cancelled' || order.status === 'cancelled';

        if (typeof order.total_amount === 'number') setAmount(order.total_amount);

        if (paid) {
          setState('success');
          setMessage('Payment confirmed! Your order has been placed.');
          sslcommerzService.clearPaymentIntent();
          return;
        }

        if (failed) {
          setState('failed');
          setMessage(`Payment status: ${order.payment_status}. Please check your orders.`);
          sslcommerzService.clearPaymentIntent();
          return;
        }

        if (attempts < maxAttempts) {
          setState('processing');
          setMessage('Payment is being processed. Please wait...');
          setTimeout(poll, delayMs);
        } else {
          setState('processing');
          setMessage('Still processing. You can go to “My Account → Orders” and refresh later.');
        }
      } catch (e: any) {
        if (cancelled) return;

        if (attempts < maxAttempts) {
          setState('processing');
          setMessage('Verifying payment...');
          setTimeout(poll, delayMs);
        } else {
          setState('failed');
          setMessage(e?.message || 'Could not verify payment. Please check “My Account → Orders”.');
          // keep intent for a bit? safe to clear because user is already here
          sslcommerzService.clearPaymentIntent();
        }
      }
    };

    poll();
    return () => {
      cancelled = true;
    };
  }, [intent, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start gap-3">
            {state === 'success' ? (
              <CheckCircle2 className="text-green-600 mt-1" size={28} />
            ) : state === 'failed' ? (
              <AlertCircle className="text-red-600 mt-1" size={28} />
            ) : (
              <Loader2 className="animate-spin text-red-700 mt-1" size={28} />
            )}

            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Payment Status</h1>
              <p className="text-gray-600 mt-1">{message}</p>

              <div className="mt-4 text-sm text-gray-700 space-y-1">
                {orderNumber && (
                  <div>
                    <span className="font-medium">Order:</span> {orderNumber}
                  </div>
                )}
                {amount !== null && !Number.isNaN(amount) && (
                  <div>
                    <span className="font-medium">Amount:</span> ৳{amount.toLocaleString('en-BD', { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push('/e-commerce/my-account')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800"
            >
              <ShoppingBag size={18} />
              My Orders
            </button>

            <button
              type="button"
              onClick={() => router.push('/e-commerce/cart')}
              className="px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
            >
              Back to Cart
            </button>
          </div>

          <div className="mt-6 text-xs text-gray-500">
            <p>Tip: IPN confirmation can take a few seconds to reflect here.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
