'use client';

import { useState } from 'react';
import axiosInstance from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

const getApiBaseUrl = () => {
  const baseUrl = axiosInstance.defaults.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  return String(baseUrl).replace(/\/$/, '');
};

export default function OrderCsvExportPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const downloadFullOrderCsv = async () => {
    setDownloading(true);
    setMessage('');
    setError('');

    try {
      // First create a short-lived token with the normal authenticated API request.
      // Then let the browser download the CSV directly instead of loading a huge Blob in JS.
      const response = await axiosInstance.post('/orders/export/full-csv-token');
      const token = response.data?.data?.token;

      if (!token) {
        throw new Error('CSV download token was not returned by the server.');
      }

      const downloadUrl = `${getApiBaseUrl()}/orders/export/full-csv-download?token=${encodeURIComponent(token)}`;
      window.location.assign(downloadUrl);
      setMessage('CSV download started.');
    } catch (err: any) {
      console.error('Order CSV export failed:', err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Could not start the order CSV download. Please check login/session and try again.'
      );
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <p className="text-sm text-slate-300">Checking access…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
          <h1 className="text-2xl font-semibold">Order CSV Export</h1>
          <p className="mt-3 text-sm text-slate-300">Please log in first, then open this URL again.</p>
          <a
            href="/login"
            className="mt-6 inline-flex rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-slate-200"
          >
            Go to login
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
        <h1 className="text-2xl font-semibold">Order CSV Export</h1>
        <p className="mt-3 text-sm text-slate-300">
          Download the complete order CSV with customer, order, payment, product, category, barcode, batch, store and service details.
        </p>

        <button
          type="button"
          onClick={downloadFullOrderCsv}
          disabled={downloading}
          className="mt-8 w-full rounded-2xl bg-white px-5 py-4 text-sm font-bold text-slate-950 shadow-lg transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {downloading ? 'Preparing CSV…' : 'Download Full Order CSV'}
        </button>

        {message && <p className="mt-4 text-sm text-emerald-300">{message}</p>}
        {error && <p className="mt-4 text-sm text-red-300">{error}</p>}
      </div>
    </main>
  );
}
