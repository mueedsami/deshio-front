import { useState, useEffect, useRef } from 'react';
import { X, RotateCcw, Calculator, ChevronDown, Barcode, Trash2, AlertCircle, Info } from 'lucide-react';
import axiosInstance from '@/lib/axios';

interface ReturnProductModalProps {
  order: any;
  onClose: () => void;
  onReturn: (returnData: any) => Promise<void>;
}

export default function ReturnProductModal({ order, onClose, onReturn }: ReturnProductModalProps) {
  const [returnedItems, setReturnedItems] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Refund states
  const [refundDetails, setRefundDetails] = useState({
    cash: 0,
    card: 0,
    bkash: 0,
    nagad: 0
  });

  const [showNoteCounter, setShowNoteCounter] = useState(false);
  const [notes, setNotes] = useState({
    1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0
  });

  useEffect(() => {
    if (barcodeInputRef.current) barcodeInputRef.current.focus();
  }, []);

  const handleBarcodeScan = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const code = barcodeInput.trim();
    if (!code) return;

    setError(null);

    // Check if already scanned
    if (returnedItems.some(item => item.barcode === code)) {
      setError('Item already scanned for return');
      setBarcodeInput('');
      return;
    }

    // Find in order
    const orderItem = order.items?.find((item: any) => 
      item.barcode === code || 
      item.product_barcode?.barcode === code ||
      item.barcode_number === code
    );

    if (!orderItem) {
      setError('Barcode not found in this order');
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
      total_price: parseFloat(orderItem.unit_price || '0')
    };

    setReturnedItems(prev => [...prev, newItem]);
    setBarcodeInput('');
  };

  const removeReturnedItem = (index: number) => {
    setReturnedItems(prev => prev.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const returnAmount = returnedItems.reduce((sum, item) => sum + item.total_price, 0);
    
    // We need to calculate what the NEW order total would be
    // This is simplified: original total - return amount
    // In a real system, you'd recalculate VAT/Discount if needed
    const originalTotal = parseFloat(order.total_amount || order.amounts?.total || '0');
    const totalPaid = parseFloat(order.paid_amount || order.payments?.totalPaid || '0');
    
    const newTotal = Math.max(0, originalTotal - returnAmount);
    const refundToCustomer = totalPaid > newTotal ? totalPaid - newTotal : 0;

    return {
      returnAmount,
      originalTotal,
      totalPaid,
      newTotal,
      refundToCustomer
    };
  };

  const totals = calculateTotals();

  const cashFromNotes = Object.entries(notes).reduce((sum, [val, count]) => sum + (Number(val) * count), 0);
  const effectiveRefundCash = cashFromNotes > 0 ? cashFromNotes : refundDetails.cash;
  const totalRefundProcessed = effectiveRefundCash + refundDetails.card + refundDetails.bkash + refundDetails.nagad;
  const remainingRefund = totals.refundToCustomer - totalRefundProcessed;

  const handleProcessReturn = async () => {
    if (returnedItems.length === 0) {
      setError('Please scan at least one item to return');
      return;
    }

    setIsProcessing(true);
    try {
      // The handleReturnSubmit in page.tsx expects this structure
      await onReturn({
        returnReason: 'customer_return',
        returnType: 'customer_return',
        receivedAtStoreId: order.store_id || 1,
        selectedProducts: returnedItems,
        refundMethods: {
          cash: effectiveRefundCash,
          card: refundDetails.card,
          bkash: refundDetails.bkash,
          nagad: refundDetails.nagad,
          total: totalRefundProcessed
        }
      });
      onClose();
    } catch (err: any) {
      console.error('Return failed:', err);
      setError(err.response?.data?.message || err.message || 'Failed to process return');
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
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-xl flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Return Items - Order #{order.order_number || order.id}</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-0.5">Barcode-Driven Verification</p>
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
            {/* Left Column: Scanning & Item List */}
            <div className="col-span-12 lg:col-span-8 space-y-6">
              
              <div className="bg-gray-50 dark:bg-gray-800/50 rounded-3xl p-6 border border-gray-200 dark:border-gray-700/50 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-red-500/10 transition-all duration-500" />
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
                      <Barcode className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-wider text-sm">Scan Items</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-widest bg-white dark:bg-gray-900 px-3 py-1 rounded-full border border-gray-100 dark:border-gray-800">
                      <Info className="w-3 h-3" />
                      Individual Unit Tracking
                    </span>
                    <span className="px-3 py-1 bg-red-500 text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-500/20">
                      {returnedItems.length} Scanned
                    </span>
                  </div>
                </div>

                <form onSubmit={handleBarcodeScan} className="relative mb-6">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400">
                    <Barcode className="w-5 h-5" />
                  </div>
                  <input
                    ref={barcodeInputRef}
                    type="text"
                    placeholder="SCAN ITEM BARCODE FROM ORDER..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="w-full pl-12 pr-4 py-5 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-800 rounded-2xl focus:border-red-500 outline-none transition-all text-sm font-black placeholder:text-gray-300 dark:placeholder:text-gray-600 uppercase tracking-widest"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Awaiting Scan</span>
                  </div>
                </form>

                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-2 scrollbar-thin">
                  {returnedItems.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all group/item animate-in fade-in slide-in-from-left-4 duration-300">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-2xl flex items-center justify-center text-xs font-black text-gray-400 group-hover/item:bg-red-50 group-hover/item:text-red-500 transition-colors">
                          {index + 1}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{item.product_name}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{item.barcode}</p>
                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                            <p className="text-[10px] text-blue-500 font-black uppercase">Verified in Order</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-8">
                        <p className="text-sm font-black text-gray-900 dark:text-white">৳{item.total_price.toLocaleString()}</p>
                        <button 
                          onClick={() => removeReturnedItem(index)}
                          className="p-3 text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full transition-all"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {returnedItems.length === 0 && (
                    <div className="text-center py-20 border-4 border-dotted border-gray-100 dark:border-gray-800 rounded-[2.5rem] bg-white/50 dark:bg-gray-900/20">
                      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Barcode className="w-10 h-10 text-gray-200 dark:text-gray-700" />
                      </div>
                      <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest">No Items Scanned Yet</h4>
                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em] mt-2">Scan the physical barcode of the item being returned</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Summary & Refund */}
            <div className="col-span-12 lg:col-span-4">
              <div className="bg-white dark:bg-gray-800 rounded-[2.5rem] p-8 border border-gray-200 dark:border-gray-700 shadow-2xl sticky top-0">
                <h3 className="font-black text-gray-900 dark:text-white text-lg mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <Calculator className="w-6 h-6 text-red-500" />
                  Refund Status
                </h3>

                <div className="space-y-6">
                  <div className="p-6 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanned Value</span>
                        <span className="font-black text-gray-900 dark:text-white">৳{totals.returnAmount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Total</span>
                        <span className="font-black text-gray-900 dark:text-white">৳{totals.originalTotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer Paid</span>
                        <span className="font-black text-blue-500">৳{totals.totalPaid.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t-4 border-gray-50 dark:border-gray-900">
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Refund Required</span>
                      <span className={`text-3xl font-black tracking-tighter ${totals.refundToCustomer > 0 ? 'text-green-500' : 'text-gray-900 dark:text-white'}`}>
                        ৳{totals.refundToCustomer.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">
                      {totals.refundToCustomer > 0 ? 'Customer Overpaid - Process Refund' : 'Order Total Reduced'}
                    </p>
                  </div>

                  {/* Refund Processing Section */}
                  {totals.refundToCustomer > 0 && (
                    <div className="pt-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Refund Method</h4>
                        <button
                          onClick={() => setShowNoteCounter(!showNoteCounter)}
                          className={`text-[9px] px-3 py-1.5 rounded-full font-black uppercase tracking-widest transition-all ${showNoteCounter ? 'bg-black text-white' : 'bg-green-50 text-green-600'}`}
                        >
                          {showNoteCounter ? 'Close Counter' : 'Note Counter'}
                        </button>
                      </div>

                      {showNoteCounter && (
                        <div className="grid grid-cols-2 gap-2 p-4 bg-gray-50 dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-700 animate-in zoom-in-95">
                          {Object.keys(notes).reverse().map(val => (
                            <div key={val} className="flex items-center justify-between gap-2">
                              <span className="text-[9px] font-black text-gray-400 w-8">৳{val}</span>
                              <input
                                type="number"
                                min="0"
                                value={notes[val as unknown as keyof typeof notes]}
                                onChange={(e) => setNotes(prev => ({ ...prev, [val]: parseInt(e.target.value) || 0 }))}
                                className="w-16 px-2 py-1 bg-white dark:bg-black border border-gray-100 dark:border-gray-800 rounded-lg text-xs font-black text-center"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="space-y-4">
                        {[
                          { id: 'cash', label: 'CASH', val: effectiveRefundCash, readOnly: cashFromNotes > 0 },
                          { id: 'card', label: 'CARD', val: refundDetails.card },
                          { id: 'bkash', label: 'BKASH', val: refundDetails.bkash },
                          { id: 'nagad', label: 'NAGAD', val: refundDetails.nagad }
                        ].map((m) => (
                          <div key={m.id} className="relative group">
                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-green-500 transition-colors">
                              <span className="text-[9px] font-black uppercase tracking-tighter">{m.label}</span>
                            </div>
                            <input
                              type="number"
                              value={m.val === 0 ? '' : m.val}
                              readOnly={m.readOnly}
                              onChange={(e) => {
                                setRefundDetails(prev => ({ ...prev, [m.id]: parseFloat(e.target.value) || 0 }));
                                if (m.id === 'cash') setNotes({ 1000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 });
                              }}
                              className={`w-full pl-16 pr-4 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-transparent focus:border-green-500 rounded-2xl outline-none transition-all text-sm font-black text-right ${m.readOnly ? 'bg-green-50/50' : ''}`}
                              placeholder="0.00"
                            />
                          </div>
                        ))}
                      </div>

                      <div className="pt-6 space-y-3">
                        <div className="flex justify-between items-center text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                          <span>Refunded</span>
                          <span className="text-gray-900 dark:text-white">৳{totalRefundProcessed.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-gray-400 uppercase tracking-widest">Remaining</span>
                          <span className={`text-xl font-black tracking-tighter ${remainingRefund > 0 ? 'text-orange-500' : 'text-green-500'}`}>
                            ৳{Math.abs(remainingRefund).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleProcessReturn}
                    disabled={isProcessing || returnedItems.length === 0}
                    className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-3xl font-black text-xl shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-30 disabled:hover:scale-100 flex items-center justify-center gap-4 mt-8"
                  >
                    {isProcessing ? (
                      <div className="w-6 h-6 border-4 border-gray-300 border-t-white dark:border-t-black rounded-full animate-spin" />
                    ) : (
                      <>
                        <RotateCcw className="w-6 h-6" />
                        COMPLETE RETURN
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