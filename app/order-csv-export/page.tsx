'use client';

import { useState } from 'react';
import axiosInstance from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

const extractFilename = (contentDisposition?: string) => {
  if (!contentDisposition) return '';

  const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].replace(/['"]/g, ''));
    } catch {
      return utf8Match[1].replace(/['"]/g, '');
    }
  }

  const normalMatch = contentDisposition.match(/filename="?([^";]+)"?/i);
  return normalMatch?.[1] || '';
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
      const response = await axiosInstance.get('/orders/export/full-csv', {
        responseType: 'blob',
        headers: {
          Accept: 'text/csv',
        },
      });

      const blob = new Blob([response.data], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const filename = extractFilename(response.headers['content-disposition']) ||
        `deshio_full_orders_export_${new Date().toISOString().slice(0, 10)}.csv`;

      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      setMessage('CSV download started.');
    } catch (err: any) {
      console.error('Order CSV export failed:', err);
      setError(err?.response?.data?.message || 'Could not download the order CSV. Please check login/session and try again.');
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
