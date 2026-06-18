'use client';

import { useState } from 'react';
import axiosInstance from '@/lib/axios';
import { useAuth } from '@/contexts/AuthContext';

const getApiBaseUrl = () => {
  const baseUrl = axiosInstance.defaults.baseURL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  return String(baseUrl).replace(/\/$/, '');
};

const downloadBlob = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
};

const filenameFromDisposition = (disposition?: string, fallback = 'report.csv') => {
  if (!disposition) return fallback;
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return match?.[1] ? decodeURIComponent(match[1]) : fallback;
};

export default function OrderCsvExportPage() {
  const { isLoading, isAuthenticated } = useAuth();
  const [downloading, setDownloading] = useState(false);
  const [pathaoDownloading, setPathaoDownloading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [syncPathao, setSyncPathao] = useState(false);
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
      setMessage('Full order CSV download started.');
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

  const downloadPathaoSalesCsv = async () => {
    setPathaoDownloading(true);
    setMessage('');
    setError('');

    try {
      const params: Record<string, string | number> = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (syncPathao) params.sync_pathao = 1;

      const response = await axiosInstance.get('/reporting/csv/pathao-sales', {
        params,
        responseType: 'blob',
      });

      const filename = filenameFromDisposition(
        response.headers?.['content-disposition'],
        `pathao-sales-report-${new Date().toISOString().slice(0, 10)}.csv`
      );

      downloadBlob(response.data, filename);
      setMessage('Pathao-style sales report downloaded.');
    } catch (err: any) {
      console.error('Pathao sales CSV export failed:', err);
      setError(
        err?.response?.data?.message ||
        err?.message ||
        'Could not download the Pathao-style sales report.'
      );
    } finally {
      setPathaoDownloading(false);
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
      <div className="w-full max-w-2xl space-y-6">
        <section className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8 text-center shadow-2xl">
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
        </section>

        <section className="rounded-3xl border border-emerald-900/60 bg-emerald-950/30 p-8 shadow-2xl">
          <div className="text-center">
            <h2 className="text-2xl font-semibold">Pathao Sales Report</h2>
            <p className="mt-3 text-sm text-emerald-100/80">
              Exports the same 19-column format as the sample sales CSV, using Deshio order data and Pathao shipment status/details.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <label className="text-left text-sm text-emerald-50/90">
              Date from
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-emerald-900 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
              />
            </label>
            <label className="text-left text-sm text-emerald-50/90">
              Date to
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-emerald-900 bg-slate-950 px-4 py-3 text-sm text-white outline-none focus:border-emerald-400"
              />
            </label>
          </div>

          <label className="mt-5 flex items-start gap-3 rounded-2xl border border-emerald-900/70 bg-slate-950/60 p-4 text-sm text-emerald-50/90">
            <input
              type="checkbox"
              checked={syncPathao}
              onChange={(e) => setSyncPathao(e.target.checked)}
              className="mt-1 h-4 w-4"
            />
            <span>
              Refresh Pathao status before export. Use this for a smaller date range because it calls Pathao once for every consignment.
            </span>
          </label>

          <button
            type="button"
            onClick={downloadPathaoSalesCsv}
            disabled={pathaoDownloading}
            className="mt-6 w-full rounded-2xl bg-emerald-300 px-5 py-4 text-sm font-bold text-emerald-950 shadow-lg transition hover:bg-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pathaoDownloading ? 'Preparing Pathao report…' : 'Download Pathao Sales CSV'}
          </button>
        </section>

        {message && <p className="text-center text-sm text-emerald-300">{message}</p>}
        {error && <p className="text-center text-sm text-red-300">{error}</p>}
      </div>
    </main>
  );
}
