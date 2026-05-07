'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Barcode as BarcodeIcon, CheckCircle2, History, Loader2, Package, Printer, RefreshCw, ShieldCheck } from 'lucide-react';
import Barcode from 'react-barcode';
import barcodeService from '@/services/barcodeService';
import barcodeRelabelService, { ReplacementBarcodeResult } from '@/services/barcodeRelabelService';

type RelabelRow = any;

const reasonOptions = [
  { value: 'lost_sticker', label: 'Lost sticker' },
  { value: 'damaged_sticker', label: 'Damaged sticker' },
  { value: 'unreadable_barcode', label: 'Unreadable barcode' },
  { value: 'manual_recovery', label: 'Manual recovery' },
];

function getErrorMessage(error: any) {
  return error?.response?.data?.message || error?.response?.data?.error || error?.message || 'Something went wrong';
}

export default function BarcodeRelabelPage() {
  const [lookupBarcode, setLookupBarcode] = useState('');
  const [batchId, setBatchId] = useState('');
  const [productId, setProductId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [customBarcode, setCustomBarcode] = useState('');
  const [reason, setReason] = useState('lost_sticker');
  const [notes, setNotes] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [generated, setGenerated] = useState<ReplacementBarcodeResult | null>(null);
  const [history, setHistory] = useState<RelabelRow[]>([]);

  const canCreate = useMemo(() => Number(batchId) > 0 && !isCreating, [batchId, isCreating]);

  const loadHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const response = await barcodeRelabelService.listRelabels({ per_page: 10 });
      setHistory(response.data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleLookup = async () => {
    if (!lookupBarcode.trim()) return;
    setError(null);
    setMessage(null);
    setIsLookingUp(true);
    try {
      const response = await barcodeService.scanBarcode(lookupBarcode.trim());
      const data: any = response.data;
      if (data?.product?.id) setProductId(String(data.product.id));
      if (data?.current_batch?.id) setBatchId(String(data.current_batch.id));
      if (data?.current_location?.id) setStoreId(String(data.current_location.id));
      setMessage('Product, batch, and store were filled from the scanned barcode. Stock was not changed.');
    } catch (err: any) {
      setError(getErrorMessage(err));
    } finally {
      setIsLookingUp(false);
    }
  };

  const handleCreate = async () => {
    setError(null);
    setMessage(null);
    setGenerated(null);

    if (!Number(batchId)) {
      setError('Batch ID is required. Scan any barcode from the same batch or enter the batch ID manually.');
      return;
    }

    setIsCreating(true);
    try {
      const response = await barcodeRelabelService.createRelabel({
        batch_id: Number(batchId),
        product_id: productId ? Number(productId) : undefined,
        store_id: storeId ? Number(storeId) : undefined,
        barcode: customBarcode.trim() || undefined,
        reason,
        notes: notes.trim() || undefined,
        type: 'CODE128',
      });

      setGenerated(response.data.replacement_barcode);
      setMessage(response.message || 'Replacement barcode generated. Stock quantity was not increased.');
      setCustomBarcode('');
      setNotes('');
      await loadHistory();
    } catch (err: any) {
      const data = err?.response?.data;
      const firstValidationError = data?.errors ? Object.values(data.errors)?.flat()?.[0] : null;
      setError(String(firstValidationError || getErrorMessage(err)));
    } finally {
      setIsCreating(false);
    }
  };

  const printLabel = () => {
    if (!generated) return;
    const html = `
      <html>
        <head>
          <title>Replacement Barcode</title>
          <style>
            @page { size: 39mm 25mm; margin: 0; }
            body { margin: 0; font-family: Arial, sans-serif; }
            .label { width: 39mm; height: 25mm; box-sizing: border-box; padding: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1mm; }
            .brand { font-size: 10px; font-weight: 800; }
            .title { font-size: 7px; font-weight: 700; text-transform: uppercase; letter-spacing: .3px; }
            .code { font-size: 13px; font-weight: 800; letter-spacing: .8px; }
            .meta { font-size: 6.5px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="brand">Deshio</div>
            <div class="title">Replacement Barcode</div>
            <div class="code">${generated.barcode}</div>
            <div class="meta">${generated.product_name || 'Product'}${generated.batch_number ? ` • ${generated.batch_number}` : ''}</div>
          </div>
          <script>window.print(); window.onafterprint = () => window.close();</script>
        </body>
      </html>`;

    const win = window.open('', '_blank', 'width=420,height=300');
    if (!win) return;
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-col gap-2">
          <div className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-300">
            <ShieldCheck className="w-4 h-4" /> Lost Sticker Recovery
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Temporary Barcode Relabeling</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 max-w-3xl">
            Generate a floating replacement barcode for one existing physical unit. This creates a new scan identity only; it does not increase stock. When the batch stock reaches zero, leftover barcode identities in that relabel pool are automatically voided by the backend.
          </p>
        </div>

        {(message || error) && (
          <div className={`rounded-2xl border p-4 flex items-start gap-3 ${error ? 'bg-red-50 border-red-200 text-red-800 dark:bg-red-950/30 dark:border-red-900 dark:text-red-200' : 'bg-green-50 border-green-200 text-green-800 dark:bg-green-950/30 dark:border-green-900 dark:text-green-200'}`}>
            {error ? <AlertCircle className="w-5 h-5 mt-0.5" /> : <CheckCircle2 className="w-5 h-5 mt-0.5" />}
            <div className="text-sm">{error || message}</div>
          </div>
        )}

        <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-6">
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5 space-y-5">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BarcodeIcon className="w-5 h-5" /> Create replacement barcode
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Scan any barcode from the same product/batch to auto-fill details, or enter the batch manually.
              </p>
            </div>

            <div className="grid md:grid-cols-[1fr_auto] gap-3">
              <input
                value={lookupBarcode}
                onChange={(e) => setLookupBarcode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                placeholder="Scan any existing barcode from same batch..."
                className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleLookup}
                disabled={isLookingUp || !lookupBarcode.trim()}
                className="rounded-xl bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLookingUp ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Lookup
              </button>
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Product ID</span>
                <input value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="Optional" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Batch ID *</span>
                <input value={batchId} onChange={(e) => setBatchId(e.target.value)} placeholder="Required" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Store ID</span>
                <input value={storeId} onChange={(e) => setStoreId(e.target.value)} placeholder="Optional" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Temporary barcode</span>
                <input value={customBarcode} onChange={(e) => setCustomBarcode(e.target.value)} placeholder="Leave empty to auto-generate" className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
              </label>
              <label className="space-y-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Reason</span>
                <select value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm">
                  {reasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>

            <label className="space-y-1 block">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">Notes</span>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Example: sticker lost from one physical unit; stock should remain unchanged" rows={3} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 px-4 py-3 text-sm" />
            </label>

            <button
              onClick={handleCreate}
              disabled={!canCreate}
              className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarcodeIcon className="w-4 h-4" />}
              Generate Replacement Barcode
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5">
              <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Package className="w-5 h-5" /> Generated label
              </h2>
              {generated ? (
                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border border-dashed border-blue-300 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900 p-5 text-center">
                    <p className="text-xs uppercase tracking-wide text-blue-700 dark:text-blue-300 font-bold">Replacement Barcode</p>
                    <p className="text-3xl font-black text-gray-900 dark:text-white mt-2 tracking-widest">{generated.barcode}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{generated.product_name || 'Product'} {generated.batch_number ? `• ${generated.batch_number}` : ''}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">Stock after relabel: {generated.batch_quantity_after_relabel ?? 'unchanged'}</p>
                  </div>
                  <button onClick={printLabel} className="w-full rounded-xl border border-gray-300 dark:border-gray-700 px-5 py-3 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <Printer className="w-4 h-4" /> Print Temporary Label
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">No replacement barcode generated yet.</p>
              )}
            </div>

            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                  <History className="w-5 h-5" /> Recent relabels
                </h2>
                <button onClick={loadHistory} className="text-xs font-semibold text-blue-600 dark:text-blue-300">Refresh</button>
              </div>
              <div className="mt-4 space-y-3">
                {isLoadingHistory && <p className="text-sm text-gray-500">Loading...</p>}
                {!isLoadingHistory && history.length === 0 && <p className="text-sm text-gray-500">No relabel records found.</p>}
                {history.map((row) => (
                  <div key={row.id} className="rounded-xl border border-gray-200 dark:border-gray-800 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold text-sm text-gray-900 dark:text-white">{row.replacement_barcode?.barcode || row.replacementBarcode?.barcode || 'N/A'}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{row.product?.name || 'Product'} • {row.batch?.batch_number || 'Batch'}</p>
                      </div>
                      <span className="text-xs rounded-full px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 capitalize">{row.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
