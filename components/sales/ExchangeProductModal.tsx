import { useState, useEffect, useRef } from 'react';
import { X, Search, ArrowRightLeft, Calculator, ChevronDown, Barcode, Trash2, CheckCircle2, AlertCircle, RotateCcw, Loader2 } from 'lucide-react';
import axiosInstance from '@/lib/axios';
import storeService, { type Store } from '@/services/storeService';

interface ExchangeProductModalProps {
  order: any;
  onClose: () => void;
  onExchange: (exchangeData: any) => Promise<void>;
}

export default function ExchangeProductModal({ order, onClose, onExchange }: ExchangeProductModalProps) {
  const [removedItems, setRemovedItems] = useState<any[]>([]);
  const [replacementItems, setReplacementItems] = useState<any[]>([]);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [replacementBarcodeInput, setReplacementBarcodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [scanningMode, setScanningMode] = useState<'return' | 'replacement'>('return');

  const returnInputRef = useRef<HTMLInputElement>(null);
  const replacementInputRef = useRef<HTMLInputElement>(null);

  // Store selection
  const [stores, setStores] = useState<Store[]>([]);
  const [exchangeAtStoreId, setExchangeAtStoreId] = useState<number>(order.store?.id || 1);

  // Payment/Refund states
  const [paymentDetails, setPaymentDetails] = useState({
    cash: 0,
    card: 0,
    bkash: 0,
    nagad: 0,
    transactionFee: 0
  });

  const [showNoteCounter, setShowNoteCounter] = useState(false);
  const [notes, setNotes] = useState({
    1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });

  useEffect(() => {
    fetchStores();
    if (returnInputRef.current) returnInputRef.current.focus();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await storeService.getStores({ is_active: true });
      let storesData: Store[] = [];
      if (response?.success && response?.data) {
        storesData = Array.isArray(response.data.data) ? response.data.data : (Array.isArray(response.data) ? response.data : []);
      } else if (Array.isArray(response)) {
        storesData = response;
      }
      setStores(storesData);
    } catch (error) {
      console.error('Failed to fetch stores:', error);
    }
  };

  const handleReturnScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setError(null);
    
    if (removedItems.some(item => item.barcode === code)) {
      setError('Item already scanned for return');
      setBarcodeInput('');
      return;
    }

    const orderItem = order.items?.find((item: any) => 
      item.barcode === code || 
      item.product_barcode?.barcode === code ||
      item.barcode_number === code
    );
    
    if (!orderItem) {
      setError('This barcode does not belong to the current order');
      setBarcodeInput('');
      return;
    }

    const newItem = {
      order_item_id: orderItem.id,
      product_id: orderItem.product_id,
      product_name: orderItem.product_name || orderItem.product?.name,
      barcode: code,
      product_barcode_id: orderItem.product_barcode_id || orderItem.product_barcode?.id,
      unit_price: parseFloat(orderItem.unit_price || '0'),
      quantity: 1,
      total_price: parseFloat(orderItem.unit_price || '0'),
      return_reason: 'exchange',
      quality_check_passed: true
    };

    setRemovedItems(prev => [...prev, newItem]);
    setBarcodeInput('');
  };

  const handleReplacementScan = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = replacementBarcodeInput.trim();
    if (!code) return;

    setError(null);

    if (replacementItems.some(item => item.barcode === code)) {
      setError('Item already scanned as replacement');
      setReplacementBarcodeInput('');
      return;
    }

    try {
      const response = await axiosInstance.get(`/lookup/barcode/${code}`);
      const barcodeData = response.data.data;

      if (!barcodeData) {
        setError('Barcode not found in inventory');
        return;
      }

      const status = String(barcodeData.current_status || '').toLowerCase();
      if (status !== 'available' && status !== 'in_warehouse') {
        setError(`Barcode status is ${status}. Cannot sell.`);
        return;
      }

      const batch = barcodeData.batch || barcodeData.current_location?.batch;
      if (!batch) {
        setError('Batch information not found for this barcode');
        return;
      }

      const newItem = {
        product_id: barcodeData.product_id,
        batch_id: batch.id,
        name: barcodeData.product?.name || 'Unknown Product',
        barcode: code,
        barcode_id: barcodeData.id,
        unit_price: parseFloat(batch.sell_price || batch.selling_price || '0'),
        quantity: 1,
        total_price: parseFloat(batch.sell_price || batch.selling_price || '0'),
        discount_amount: 0
      };

      setReplacementItems(prev => [...prev, newItem]);
      setReplacementBarcodeInput('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch barcode details');
    }
  };

  const removeReturnItem = (index: number) => {
    setRemovedItems(prev => prev.filter((_, i) => i !== index));
  };

  const removeReplacementItem = (index: number) => {
    setReplacementItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const returnTotal = removedItems.reduce((sum, item) => sum + item.total_price, 0);
    const replacementTotal = replacementItems.reduce((sum, item) => sum + item.total_price, 0);
    const difference = replacementTotal - returnTotal;

    return {
      returnTotal,
      replacementTotal,
      difference
    };
  };

  const totals = calculateTotals();

  const cashFromNotes = Object.entries(notes).reduce((sum, [val, count]) => sum + (Number(val) * count), 0);
  const effectiveCash = cashFromNotes > 0 ? cashFromNotes : paymentDetails.cash;
  const totalPaid = effectiveCash + paymentDetails.card + paymentDetails.bkash + paymentDetails.nagad;
  
  const remainingDue = totals.difference > 0 
    ? Math.max(0, totals.difference - totalPaid + paymentDetails.transactionFee)
    : 0;

  const refundDue = totals.difference < 0 
    ? Math.abs(totals.difference) - totalPaid
    : 0;

  const handleProcessExchange = async () => {
    if (removedItems.length === 0) {
      setError('Please scan at least one item to return');
      return;
    }

    if (replacementItems.length === 0) {
      setError('Please scan at least one replacement item');
      return;
    }

    setIsProcessing(true);
    try {
      await onExchange({
        orderId: order.id,
        exchangeAtStoreId: exchangeAtStoreId,
        removedProducts: removedItems,
        replacementProducts: replacementItems,
        paymentRefund: {
          type: totals.difference > 0 ? 'payment' : totals.difference < 0 ? 'refund' : 'none',
          ...paymentDetails,
          cash: effectiveCash,
          total: totalPaid
        }
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to process exchange');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800 flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-xl flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Exchange - Order #{order.order_number || order.id}</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Barcode-Driven Atomic Workflow</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
            <X className="w-6 h-6 text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in slide-in-from-top-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              {/* Store Selection */}
              <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-2xl p-5 group transition-all">
                <div className="flex items-center justify-between mb-4">
                   <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center text-orange-600">
                      <Search className="w-4 h-4" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Exchange Location</h3>
                  </div>
                </div>
                <select
                  value={exchangeAtStoreId}
                  onChange={(e) => setExchangeAtStoreId(Number(e.target.value))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-xl focus:border-orange-500 outline-none transition-all text-sm font-bold uppercase tracking-widest"
                >
                  {stores.map(store => (
                    <option key={store.id} value={store.id}>
                      {store.name} {store.is_warehouse ? '(WAREHOUSE)' : '(STORE)'}
                      {store.id === order.store?.id ? ' - ORIGINAL LOCATION' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-2 ml-1">Items must be available at this location</p>
              </div>

              {/* Return Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-200 dark:border-gray-700/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-all duration-500" />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <RotateCcw className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Returned Items</h3>
                  </div>
                  <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                    {removedItems.length} Unit{removedItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <form onSubmit={handleReturnScan} className="relative mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <input
                    ref={returnInputRef}
                    type="text"
                    placeholder="SCAN BARCODE TO RETURN..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onFocus={() => setScanningMode('return')}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-red-500 outline-none transition-all text-sm font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest"
                  />
                  {scanningMode === 'return' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Active</span>
                    </div>
                  )}
                </form>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                  {removedItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group/item animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xs font-black text-gray-400 group-hover/item:bg-red-50 group-hover/item:text-red-500 transition-colors">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.product_name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.barcode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-sm font-black text-gray-900 dark:text-white">৳{item.total_price.toLocaleString()}</p>
                        <button onClick={() => removeReturnItem(index)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {removedItems.length === 0 && (
                    <div className="text-center py-12 border-4 border-dotted border-gray-100 dark:border-gray-800 rounded-3xl">
                      <Barcode className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                      <p className="text-xs font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">Scan item barcode to begin return</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Replacement Section */}
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-200 dark:border-gray-700/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-green-500/10 transition-all duration-500" />
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Replacement Items</h3>
                  </div>
                  <span className="px-3 py-1 bg-green-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-green-500/20">
                    {replacementItems.length} Unit{replacementItems.length !== 1 ? 's' : ''}
                  </span>
                </div>

                <form onSubmit={handleReplacementScan} className="relative mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400">
                    <Search className="w-5 h-5" />
                  </div>
                  <input
                    ref={replacementInputRef}
                    type="text"
                    placeholder="SCAN REPLACEMENT BARCODE..."
                    value={replacementBarcodeInput}
                    onChange={(e) => setReplacementBarcodeInput(e.target.value)}
                    onFocus={() => setScanningMode('replacement')}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-green-500 outline-none transition-all text-sm font-bold placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest"
                  />
                  {scanningMode === 'replacement' && (
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-green-500 uppercase tracking-widest">Active</span>
                    </div>
                  )}
                </form>

                <div className="space-y-3 max-h-72 overflow-y-auto pr-2 scrollbar-thin">
                  {replacementItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group/item animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-50 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xs font-black text-gray-400 group-hover/item:bg-green-50 group-hover/item:text-green-500 transition-colors">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">{item.barcode}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-sm font-bold text-gray-900 dark:text-white">৳{item.total_price.toLocaleString()}</p>
                        <button onClick={() => removeReplacementItem(index)} className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {replacementItems.length === 0 && (
                    <div className="text-center py-12 border-4 border-dotted border-gray-100 dark:border-gray-800 rounded-3xl">
                      <Search className="w-12 h-12 text-gray-200 dark:text-gray-800 mx-auto mb-4" />
                      <p className="text-xs font-black text-gray-300 dark:text-gray-700 uppercase tracking-widest">Scan replacement item barcode</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-200 dark:border-gray-700 shadow-2xl sticky top-0">
                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <Calculator className="w-6 h-6 text-blue-500" />
                  Settlement
                </h3>
                <div className="space-y-6">
                  <div className="flex justify-between items-center group/summary">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Returns</span>
                    <span className="font-black text-red-500 text-lg group-hover/summary:scale-110 transition-transform">-৳{totals.returnTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center group/summary">
                    <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Replacements</span>
                    <span className="font-black text-green-500 text-lg group-hover/summary:scale-110 transition-transform">+৳{totals.replacementTotal.toLocaleString()}</span>
                  </div>
                  <div className="pt-6 border-t-4 border-gray-50 dark:border-gray-900">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Net Difference</span>
                      <span className={`text-3xl font-black tracking-tighter ${totals.difference > 0 ? 'text-orange-500' : totals.difference < 0 ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>
                        {totals.difference > 0 ? '+' : ''}৳{Math.abs(totals.difference).toLocaleString()}
                      </span>
                    </div>
                    <div className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full inline-block ${totals.difference > 0 ? 'bg-orange-100 text-orange-600' : totals.difference < 0 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                      {totals.difference > 0 ? 'Collect Surplus' : totals.difference < 0 ? 'Process Refund' : 'Even Swap'}
                    </div>
                  </div>

                  {(totals.difference !== 0) && (
                    <div className="pt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment Methods</h4>
                        <button onClick={() => setShowNoteCounter(!showNoteCounter)} className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest transition-all ${showNoteCounter ? 'bg-black text-white' : 'bg-blue-50 text-blue-600'}`}>
                          {showNoteCounter ? 'Close Counter' : 'Note Counter'}
                        </button>
                      </div>
                      {showNoteCounter && (
                        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
                          {Object.keys(notes).reverse().map(val => (
                            <div key={val} className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black text-gray-400 w-8">৳{val}</span>
                              <input type="number" min="0" value={notes[val as unknown as keyof typeof notes]} onChange={(e) => setNotes(prev => ({ ...prev, [val]: parseInt(e.target.value) || 0 }))} className="w-16 px-2 py-1 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black text-center" />
                            </div>
                          ))}
                          <div className="col-span-2 pt-3 mt-1 border-t border-gray-200 dark:border-gray-800 flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase">Cash Total:</span>
                            <span className="text-xs font-black text-blue-600">৳{cashFromNotes.toLocaleString()}</span>
                          </div>
                        </div>
                      )}
                      <div className="space-y-4">
                        {[
                          { id: 'cash', label: 'CASH', val: effectiveCash, readOnly: cashFromNotes > 0 },
                          { id: 'card', label: 'CARD', val: paymentDetails.card },
                          { id: 'bkash', label: 'BKASH', val: paymentDetails.bkash },
                          { id: 'nagad', label: 'NAGAD', val: paymentDetails.nagad }
                        ].map((m) => (
                          <div key={m.id} className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors">
                              <span className="text-[9px] font-black uppercase tracking-tighter">{m.label}</span>
                            </div>
                            <input type="number" value={m.val === 0 ? '' : m.val} readOnly={m.readOnly} onChange={(e) => { setPaymentDetails(prev => ({ ...prev, [m.id]: parseFloat(e.target.value) || 0 })); if (m.id === 'cash') setNotes({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 }); }} className={`w-full pl-16 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all text-sm font-black text-right ${m.readOnly ? 'bg-blue-50/50' : ''}`} placeholder="0.00" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleProcessExchange}
                    disabled={isProcessing || removedItems.length === 0 || replacementItems.length === 0}
                    className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-xl shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-4 mt-8"
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-4 border-gray-300 border-t-white dark:border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <ArrowRightLeft className="w-6 h-6" />
                        SUBMIT EXCHANGE
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}