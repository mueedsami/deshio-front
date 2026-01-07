'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Loader2, Package, Search, AlertCircle, Phone as PhoneIcon } from 'lucide-react';

import Navigation from '@/components/ecommerce/Navigation';
import guestCheckoutService from '@/services/guestCheckoutService';

function cleanPhone(input: string) {
  return input.replace(/[^0-9+]/g, '');
}

function isValidBDPhone(input: string) {
  const cleaned = input.replace(/\D/g, '');
  return /^(?:880|0)?1[3-9]\d{8}$/.test(cleaned);
}

export default function OrderTrackingByPhonePage() {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ phone: string; name?: string } | null>(null);
  const [orders, setOrders] = useState<any[]>([]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!phone.trim() || !isValidBDPhone(phone)) {
      setError('Please enter a valid Bangladesh phone number (e.g. 017xxxxxxxx)');
      return;
    }

    setLoading(true);
    try {
      const res: any = await guestCheckoutService.ordersByPhone({ phone: cleanPhone(phone) });
      setCustomer(res?.data?.customer || null);
      setOrders(res?.data?.orders || []);
    } catch (err: any) {
      console.error('Failed to fetch guest orders:', err);
      setCustomer(null);
      setOrders([]);
      setError(err?.response?.data?.message || 'No orders found for this phone number.');
    } finally {
      setLoading(false);
    }
  };

  const badge = (status: string) => {
    const s = String(status || '').toLowerCase();
    if (s.includes('deliver')) return 'bg-green-50 text-green-700 border-green-200';
    if (s.includes('cancel')) return 'bg-red-50 text-red-700 border-red-200';
    if (s.includes('ship')) return 'bg-orange-50 text-orange-700 border-orange-200';
    if (s.includes('process')) return 'bg-blue-50 text-blue-700 border-blue-200';
    return 'bg-yellow-50 text-yellow-700 border-yellow-200';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Track Orders by Phone</h1>
              <p className="text-gray-600 mt-1">Enter your phone number to see your recent orders.</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center">
              <PhoneIcon className="text-red-700" />
            </div>
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" size={20} />
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={onSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="017XXXXXXXX"
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="mt-6 sm:mt-0 sm:self-end inline-flex items-center justify-center gap-2 bg-red-700 hover:bg-red-800 text-white font-semibold px-5 py-3 rounded-lg disabled:opacity-60"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
              {loading ? 'Searching…' : 'Find Orders'}
            </button>
          </form>
        </div>

        {customer && (
          <div className="mt-6 bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{customer?.name || 'Customer'}</h2>
                <p className="text-gray-600 text-sm">Phone: {customer.phone}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                <Package className="text-gray-700" size={20} />
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="text-gray-600 mt-4">No orders found for this phone number.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {orders.map((o) => (
                  <div key={o.order_id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900">Order #{o.order_number}</p>
                      <p className="text-sm text-gray-600">
                        {o.created_at} • {o.items_count} item(s) • ৳{Number(o.total_amount).toFixed(0)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${badge(o.status)}`}>
                        {String(o.status || '').replace(/_/g, ' ').toUpperCase()}
                      </span>
                      <Link
                        href={`/e-commerce/order-tracking/${o.order_number}`}
                        className="text-red-700 font-semibold text-sm hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
