import { useState } from 'react';
import { X, RotateCcw, Calculator, ChevronDown } from 'lucide-react';

interface ReturnProductModalProps {
  order: any;
  onClose: () => void;
  onReturn: (returnData: any) => Promise<void>;
}

export default function ReturnProductModal({ order, onClose, onReturn }: ReturnProductModalProps) {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [returnedQuantities, setReturnedQuantities] = useState<{ [key: number]: number }>({});
  const [isProcessing, setIsProcessing] = useState(false);

  // Payment method states for refund
  const [refundCash, setRefundCash] = useState(0);
  const [refundCard, setRefundCard] = useState(0);
  const [refundBkash, setRefundBkash] = useState(0);
  const [refundNagad, setRefundNagad] = useState(0);
  const [showNoteCounter, setShowNoteCounter] = useState(false);

  // Note counter states
  const [note1000, setNote1000] = useState(0);
  const [note500, setNote500] = useState(0);
  const [note200, setNote200] = useState(0);
  const [note100, setNote100] = useState(0);
  const [note50, setNote50] = useState(0);
  const [note20, setNote20] = useState(0);
  const [note10, setNote10] = useState(0);
  const [note5, setNote5] = useState(0);
  const [note2, setNote2] = useState(0);
  const [note1, setNote1] = useState(0);

  const handleProductCheckbox = (productId: number) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        const newSelected = prev.filter(id => id !== productId);
        const newQuantities = { ...returnedQuantities };
        delete newQuantities[productId];
        setReturnedQuantities(newQuantities);
        return newSelected;
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleQuantityChange = (productId: number, qty: number, maxQty: number) => {
    if (qty < 0 || qty > maxQty) return;
    setReturnedQuantities(prev => ({
      ...prev,
      [productId]: qty
    }));
  };

  const calculateTotals = () => {
    const returnAmount = selectedProducts.reduce((sum, productId) => {
      const product = order.products.find((p: any) => p.id === productId);
      if (!product) return sum;
      const qty = returnedQuantities[productId] || 0;
      return sum + (product.price * qty);
    }, 0);

    const newSubtotal = order.products.reduce((sum: number, product: any) => {
      if (selectedProducts.includes(product.id)) {
        const returnQty = returnedQuantities[product.id] || 0;
        const remainingQty = product.qty - returnQty;
        if (remainingQty > 0) {
          return sum + (product.price * remainingQty);
        }
        return sum;
      }
      return sum + product.amount;
    }, 0);

    const vatRate = order.amounts.vatRate || 0;
    const vatAmount = Math.round(newSubtotal * (vatRate / 100));
    const transportCost = order.amounts.transportCost || 0;
    const totalNewAmount = newSubtotal + vatAmount + transportCost;
    const originalTotal = order.amounts.total || 0;
    const refundAmount = originalTotal - totalNewAmount;
    const totalPaid = order.payments.totalPaid || 0;
    const refundToCustomer = totalPaid > totalNewAmount ? totalPaid - totalNewAmount : 0;
    const newDue = totalPaid > totalNewAmount ? 0 : totalNewAmount - totalPaid;

    return {
      returnAmount,
      newSubtotal,
      vatRate,
      vatAmount,
      transportCost,
      totalNewAmount,
      originalTotal,
      refundAmount,
      totalPaid,
      refundToCustomer,
      newDue
    };
  };

  const totals = calculateTotals();

  // Calculate cash from notes
  const cashFromNotes = (note1000 * 1000) + (note500 * 500) + (note200 * 200) + 
                        (note100 * 100) + (note50 * 50) + (note20 * 20) + 
                        (note10 * 10) + (note5 * 5) + (note2 * 2) + (note1 * 1);

  const effectiveRefundCash = cashFromNotes > 0 ? cashFromNotes : refundCash;
  const totalRefundProcessed = effectiveRefundCash + refundCard + refundBkash + refundNagad;
  const remainingRefund = totals.refundToCustomer - totalRefundProcessed;

  const handleProcessReturn = async () => {
    if (selectedProducts.length === 0) {
      alert('Please select at least one product to return');
      return;
    }

    const hasInvalidQuantities = selectedProducts.some(id => {
      const qty = returnedQuantities[id];
      return !qty || qty <= 0;
    });

    if (hasInvalidQuantities) {
      alert('Please set quantities for all selected products');
      return;
    }

    // Allow partial refund - just confirm the amounts
    let confirmMessage = `Process return?\n\n`;
    if (totals.refundToCustomer > 0) {
      if (remainingRefund > 0) {
        confirmMessage += `Refund Required: ৳${totals.refundToCustomer.toLocaleString()}\nRefund Processed: ৳${totalRefundProcessed.toLocaleString()}\nRemaining: ৳${remainingRefund.toLocaleString()}\n\nCustomer can collect remaining refund later.`;
      } else {
        confirmMessage += `Refund ৳${totals.refundToCustomer.toLocaleString()} to customer (Fully processed)`;
      }
    } else {
      confirmMessage += `Reduce order total by ৳${totals.refundAmount.toLocaleString()}`;
    }

    if (!confirm(confirmMessage)) return;

    setIsProcessing(true);
    try {
      const response = await fetch('/api/social-orders/return', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          returnedProducts: selectedProducts.map(id => ({
            productId: id,
            productName: order.products.find((p: any) => p.id === id)?.productName,
            quantity: returnedQuantities[id],
            price: order.products.find((p: any) => p.id === id)?.price,
            amount: (order.products.find((p: any) => p.id === id)?.price || 0) * returnedQuantities[id]
          })),
          refundAmount: totals.refundAmount,
          refundMethods: {
            cash: effectiveRefundCash,
            card: refundCard,
            bkash: refundBkash,
            nagad: refundNagad,
            total: totalRefundProcessed
          }
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process return');
      }

      const result = await response.json();
      await onReturn(result);

      let message = 'Return successful!';
      if (result.refundToCustomer > 0) {
        const refunded = result.refundMethods?.total || 0;
        const remaining = result.refundToCustomer - refunded;
        if (remaining > 0) {
          message += ` Refunded ৳${refunded.toLocaleString()}. Customer can collect remaining ৳${remaining.toLocaleString()} later.`;
        } else {
          message += ` Full refund of ৳${result.refundToCustomer.toLocaleString()} processed.`;
        }
      } else {
        message += ` Order total reduced by ৳${result.refundAmount.toLocaleString()}.`;
      }

      alert(message);
      onClose();
    } catch (error: any) {
      console.error('Return failed:', error);
      alert(error.message || 'Failed to process return');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Return Products - Order #{order.id}</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Select items to return and process refund</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Product Selection */}
            <div className="col-span-2 space-y-6">
              {/* Customer Info */}
              <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Customer</p>
                    <p className="font-semibold text-gray-900 dark:text-white">{order.customer.name}</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{order.customer.phone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Total Paid</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">৳{order.payments.totalPaid.toLocaleString()}</p>
                    {order.payments.due > 0 && (
                      <p className="text-sm text-orange-600 dark:text-orange-400">Due: ৳{order.payments.due.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Select Items to Return */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-4">Select Items to Return</h3>
                
                {order.products.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No products in this order
                  </div>
                ) : (
                  <div className="space-y-3">
                    {order.products.map((product: any) => (
                      <div key={product.id} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={selectedProducts.includes(product.id)}
                            onChange={() => handleProductCheckbox(product.id)}
                            className="mt-1 w-4 h-4 text-red-600 rounded focus:ring-2 focus:ring-red-500 cursor-pointer"
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <p className="font-medium text-gray-900 dark:text-white">{product.productName}</p>
                              <p className="font-bold text-gray-900 dark:text-white">৳{(product.price * product.qty).toLocaleString()}</p>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                              Price: ৳{product.price.toLocaleString()} × Qty: {product.qty} = ৳{product.amount.toLocaleString()}
                            </p>
                            
                            {selectedProducts.includes(product.id) && (
                              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Original Qty</label>
                                    <input
                                      type="number"
                                      value={product.qty}
                                      readOnly
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Return Qty</label>
                                    <input
                                      type="number"
                                      min="0"
                                      max={product.qty}
                                      value={returnedQuantities[product.id] || 0}
                                      onChange={(e) => handleQuantityChange(product.id, parseInt(e.target.value) || 0, product.qty)}
                                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Summary & Refund */}
            <div className="space-y-4">
              {/* Return Summary */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Return Summary</h3>
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Items selected:</span>
                    <span className="font-semibold text-gray-900 dark:text-white">{selectedProducts.length}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Return Amount:</span>
                    <span className="font-semibold text-red-600 dark:text-red-400">-৳{totals.returnAmount.toLocaleString()}</span>
                  </div>

                  <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Original Total:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">৳{totals.originalTotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">New Subtotal:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">৳{totals.newSubtotal.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">VAT ({totals.vatRate}%):</span>
                      <span className="font-semibold text-gray-900 dark:text-white">৳{totals.vatAmount.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Transport:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">৳{totals.transportCost.toLocaleString()}</span>
                    </div>
                    
                    <div className="flex justify-between items-center text-base font-bold pt-2 border-t border-gray-300 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">New Total:</span>
                      <span className="text-gray-900 dark:text-white">৳{totals.totalNewAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="pt-3 border-t-2 border-gray-300 dark:border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Customer Paid:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">৳{totals.totalPaid.toLocaleString()}</span>
                    </div>

                    {totals.refundToCustomer > 0 ? (
                      <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 dark:border-green-600 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-green-900 dark:text-green-300">Refund to Customer:</span>
                          <span className="font-bold text-lg text-green-600 dark:text-green-400">৳{totals.refundToCustomer.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-green-700 dark:text-green-400 mt-1">Customer overpaid - needs refund</p>
                      </div>
                    ) : (
                      <div className="bg-orange-50 dark:bg-orange-900/20 border-2 border-orange-500 dark:border-orange-600 rounded-lg p-3">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-orange-900 dark:text-orange-300">Remaining Due:</span>
                          <span className="font-bold text-lg text-orange-600 dark:text-orange-400">৳{totals.newDue.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">Amount still owed after return</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Refund Processing - Only show if customer gets refund */}
              {totals.refundToCustomer > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">Process Refund</h3>
                    <ChevronDown className="w-4 h-4 text-gray-500" />
                  </div>
                  
                  <div className="p-4 space-y-3">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Cash Refund</label>
                        <button
                          onClick={() => setShowNoteCounter(!showNoteCounter)}
                          className="flex items-center gap-1 px-2 py-1 text-xs bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded hover:bg-green-100 dark:hover:bg-green-900/30"
                        >
                          <Calculator className="w-3 h-3" />
                          {showNoteCounter ? 'Hide' : 'Count Notes'}
                        </button>
                      </div>
                      
                      {showNoteCounter ? (
                        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-lg p-3 space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳1000 ×</label>
                              <input type="number" min="0" value={note1000} onChange={(e) => setNote1000(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳500 ×</label>
                              <input type="number" min="0" value={note500} onChange={(e) => setNote500(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳200 ×</label>
                              <input type="number" min="0" value={note200} onChange={(e) => setNote200(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳100 ×</label>
                              <input type="number" min="0" value={note100} onChange={(e) => setNote100(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳50 ×</label>
                              <input type="number" min="0" value={note50} onChange={(e) => setNote50(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳20 ×</label>
                              <input type="number" min="0" value={note20} onChange={(e) => setNote20(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳10 ×</label>
                              <input type="number" min="0" value={note10} onChange={(e) => setNote10(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳5 ×</label>
                              <input type="number" min="0" value={note5} onChange={(e) => setNote5(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">৳2 ×</label>
                              <input type="number" min="0" value={note2} onChange={(e) => setNote2(Number(e.target.value))} className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                            </div>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-green-200 dark:border-green-800">
                            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Total Cash:</span>
                            <span className="text-sm font-bold text-green-600 dark:text-green-400">৳{cashFromNotes.toLocaleString()}</span>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Cash Refund</label>
                          <input 
                            type="number" 
                            value={cashFromNotes > 0 ? cashFromNotes : refundCash} 
                            onChange={(e) => {
                              setRefundCash(Number(e.target.value));
                              setNote1000(0);
                              setNote500(0);
                              setNote200(0);
                              setNote100(0);
                              setNote50(0);
                              setNote20(0);
                              setNote10(0);
                              setNote5(0);
                              setNote2(0);
                              setNote1(0);
                            }} 
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Card Refund</label>
                        <input type="number" value={refundCard} onChange={(e) => setRefundCard(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Bkash Refund</label>
                        <input type="number" value={refundBkash} onChange={(e) => setRefundBkash(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Nagad Refund</label>
                        <input type="number" value={refundNagad} onChange={(e) => setRefundNagad(Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
                      </div>
                    </div>
                    
                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Total Refunded</span>
                        <span className="text-gray-900 dark:text-white font-medium">৳{totalRefundProcessed.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Refund Required</span>
                        <span className="text-gray-900 dark:text-white font-medium">৳{totals.refundToCustomer.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-base">
                        <span className="font-semibold text-gray-900 dark:text-white">Remaining to Refund</span>
                        <span className={`font-bold ${remainingRefund > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`}>
                          ৳{remainingRefund.toFixed(2)}
                        </span>
                      </div>
                      {remainingRefund > 0 && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Can be refunded later</p>
                      )}
                      {remainingRefund === 0 && totalRefundProcessed > 0 && (
                        <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Full refund amount processed</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessReturn}
                  disabled={isProcessing || selectedProducts.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  <RotateCcw className="w-5 h-5" />
                  {isProcessing ? 'Processing...' : 'Process Return'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}