import { useState } from 'react';
import { Barcode, X } from 'lucide-react';
import productReturnService from '@/services/productReturnService';

interface ReceivePendingExchangeReturnModalProps {
  ret: any;
  onClose: () => void;
  onDone: () => void;
}

export default function ReceivePendingExchangeReturnModal({ ret, onClose, onDone }: ReceivePendingExchangeReturnModalProps) {
  const [barcodeText, setBarcodeText] = useState('');
  const [qualityPassed, setQualityPassed] = useState(true);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const items = Array.isArray(ret?.return_items) ? ret.return_items : [];
  const requiredQty = Number(ret?.pending_exchange_required_qty ?? items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0));
  const receivedQty = Number(ret?.pending_exchange_received_qty ?? items.reduce((sum: number, item: any) => sum + (Array.isArray(item.returned_barcode_ids) ? item.returned_barcode_ids.length : 0), 0));

  const handleReceive = async () => {
    const barcodes = barcodeText
      .split(/[\n,\s]+/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (barcodes.length === 0) {
      setError('Scan or enter at least one returned barcode.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      await productReturnService.receivePendingExchangeReturn(Number(ret.id), {
        barcodes,
        quality_check_passed: qualityPassed,
        quality_check_notes: notes || undefined,
      });
      onDone();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to receive pending exchange return');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
              <Barcode className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Receive Pending Exchange Return</h3>
              <p className="text-xs text-gray-500">{ret?.return_number || `Return #${ret?.id}`} • received {receivedQty}/{requiredQty}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="text-xs text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">{error}</div>}

          <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-lg p-3 text-xs text-orange-800 dark:text-orange-300 leading-relaxed">
            The replacement order was already created/sent. Scan the original product only after the courier or customer physically returns it.
          </div>

          {items.length > 0 && (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 dark:bg-gray-800 text-[10px] font-black text-gray-500 uppercase tracking-widest">Expected returned items</div>
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {items.map((item: any, idx: number) => {
                  const got = Array.isArray(item.returned_barcode_ids) ? item.returned_barcode_ids.length : 0;
                  return (
                    <div key={`${item.order_item_id || item.product_id}-${idx}`} className="px-3 py-2 text-xs flex items-center justify-between gap-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{item.product_name || `Product #${item.product_id}`}</span>
                      <span className="font-black text-orange-600">{got}/{Number(item.quantity || 0)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Returned Barcode(s)</label>
            <textarea
              value={barcodeText}
              onChange={(e) => setBarcodeText(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 text-sm font-mono border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Scan barcode, or paste multiple barcodes separated by line/comma/space"
              autoFocus
            />
            <p className="text-[10px] text-gray-500 mt-1">Barcode must belong to the original order item selected during exchange initiation.</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setQualityPassed(true)}
              className={`px-3 py-2 text-xs rounded-lg border font-semibold ${qualityPassed ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              QC Passed — return to stock
            </button>
            <button
              type="button"
              onClick={() => setQualityPassed(false)}
              className={`px-3 py-2 text-xs rounded-lg border font-semibold ${!qualityPassed ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300'}`}
            >
              QC Failed — mark defective
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              placeholder="Condition, courier note, defect note..."
            />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">Cancel</button>
          <button onClick={handleReceive} disabled={loading} className="flex-1 px-4 py-2 text-sm bg-orange-600 hover:bg-orange-700 text-white rounded-lg disabled:opacity-50 font-bold">
            {loading ? 'Receiving...' : 'Receive & Finish Exchange'}
          </button>
        </div>
      </div>
    </div>
  );
}
