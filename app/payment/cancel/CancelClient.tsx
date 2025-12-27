'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Navigation from '@/components/ecommerce/Navigation';
import sslcommerzService from '@/services/sslcommerzService';
import { AlertTriangle, ShoppingBag, ArrowLeft } from 'lucide-react';

export default function PaymentCancelPage() {
  const router = useRouter();
  const intent = useMemo(() => sslcommerzService.getPaymentIntent(), []);

  useEffect(() => {
    // keep or clear intent based on your preference
    // Clearing is usually fine because cancel is a final state
    // but you can keep if you want user to re-check status.
    sslcommerzService.clearPaymentIntent();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="text-yellow-600 mt-1" size={28} />
            <div className="flex-1">
              <h1 className="text-xl font-bold text-gray-900">Payment Cancelled</h1>
              <p className="text-gray-600 mt-1">You cancelled the payment. You can try again anytime.</p>

              {intent?.order_number && (
                <p className="mt-3 text-sm text-gray-700">
                  <span className="font-medium">Order:</span> {intent.order_number}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() => router.push('/e-commerce/cart')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800"
            >
              <ArrowLeft size={18} />
              Back to Cart
            </button>

            <button
              type="button"
              onClick={() => router.push('/e-commerce/my-account')}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-800 hover:bg-gray-50"
            >
              <ShoppingBag size={18} />
              My Orders
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
