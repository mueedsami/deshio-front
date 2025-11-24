

import { useState, useEffect } from 'react';
import { X, User, MapPin, Package, CreditCard, Edit2, Printer, Truck, Settings, Store as StoreIcon } from 'lucide-react';
import { Order } from '@/types/order';
import { connectQZ, printReceipt, getPrinters, checkQZStatus } from '@/lib/qz-tray';

interface OrderDetailsModalProps {
  order: Order;
  onClose: () => void;
  onEdit?: (order: Order) => void;
}

export default function OrderDetailsModal({ order, onClose, onEdit }: OrderDetailsModalProps) {
  const [isPrinting, setIsPrinting] = useState(false);
  const [isSendingToPathao, setIsSendingToPathao] = useState(false);
  const [qzStatus, setQzStatus] = useState<{ connected: boolean; error?: string }>({ connected: false });
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>('');
  const [showPrinterSelect, setShowPrinterSelect] = useState(false);
  const [showReceiptPreview, setShowReceiptPreview] = useState(false);

  useEffect(() => {
    checkQZConnection();
  }, []);

  const checkQZConnection = async () => {
    try {
      const status = await checkQZStatus();
      setQzStatus(status);
      
      if (status.connected) {
        const printerList = await getPrinters();
        setPrinters(printerList);
        
        // Load saved printer preference
        const savedPrinter = localStorage.getItem('defaultPrinter');
        if (savedPrinter && printerList.includes(savedPrinter)) {
          setSelectedPrinter(savedPrinter);
        } else if (printerList.length > 0) {
          setSelectedPrinter(printerList[0]);
        }
      }
    } catch (error) {
      console.error('Failed to check QZ status:', error);
      setQzStatus({ connected: false, error: 'QZ Tray not running' });
    }
  };

  const handlePrintReceipt = async () => {
    if (!qzStatus.connected) {
      alert('QZ Tray is not connected. Please start QZ Tray and try again.');
      return;
    }

    if (!selectedPrinter) {
      setShowPrinterSelect(true);
      return;
    }

    setIsPrinting(true);
    try {
      await printReceipt(order, selectedPrinter);
      alert(`Receipt printed successfully for Order #${order.id}`);
    } catch (error: any) {
      console.error('Print error:', error);
      alert(`Failed to print receipt: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePreviewReceipt = () => {
    setShowReceiptPreview(true);
  };

  const handlePrintFromPreview = async () => {
    setShowReceiptPreview(false);
    await handlePrintReceipt();
  };

  const handlePrinterSelect = (printer: string) => {
    setSelectedPrinter(printer);
    localStorage.setItem('defaultPrinter', printer);
    setShowPrinterSelect(false);
  };

  const handleSendToPathao = () => {
    setIsSendingToPathao(true);
    
    // Simulate sending to Pathao
    setTimeout(() => {
      alert(`Successfully sent Order #${order.id} to Pathao!`);
      setIsSendingToPathao(false);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Order Details</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Order #{order.id}</p>
          </div>
          <div className="flex items-center gap-3">
            {/* QZ Status Indicator */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
              <div className={`w-2 h-2 rounded-full ${qzStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {qzStatus.connected ? 'Ready' : 'Offline'}
              </span>
            </div>

            {/* Printer Settings */}
            {qzStatus.connected && (
              <div className="relative">
                <button
                  onClick={() => setShowPrinterSelect(!showPrinterSelect)}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-all hover:scale-105 active:scale-95"
                  title="Select Printer"
                >
                  <Settings className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </button>
                
                {showPrinterSelect && (
                  <div className="absolute right-0 top-full mt-2 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Select Printer</p>
                    </div>
                    {printers.map((printer) => (
                      <button
                        key={printer}
                        onClick={() => handlePrinterSelect(printer)}
                        className={`w-full px-4 py-2.5 text-left text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                          selectedPrinter === printer ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {printer}
                        {selectedPrinter === printer && (
                          <span className="ml-2 text-xs">✓</span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
           
            {/* Preview Button */}
            <button
              onClick={handlePreviewReceipt}
              className="group relative px-4 py-2.5 bg-gradient-to-br from-gray-900 to-black hover:from-black hover:to-gray-900 text-white rounded-lg transition-all hover:shadow-lg hover:shadow-black/30 active:scale-95 font-medium"
            >
              <span className="flex items-center gap-2">
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
              </span>
              <div className="absolute inset-0 rounded-lg bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>

            {/* Pathao Button */}
            <button
              onClick={handleSendToPathao}
              disabled={isSendingToPathao}
              className="group relative px-4 py-2.5 bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-lg transition-all hover:shadow-lg hover:shadow-green-500/30 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 font-medium"
            >
              <span className="flex items-center gap-2">
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">{isSendingToPathao ? 'Sending...' : 'Pathao'}</span>
              </span>
              {!isSendingToPathao && (
                <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              )}
            </button>

            {/* Edit Button */}
            {onEdit && (
              <button
                onClick={() => {
                  onClose();
                  onEdit(order);
                }}
                className="group relative px-4 py-2.5 bg-gradient-to-br from-gray-700 to-gray-800 hover:from-gray-800 hover:to-gray-900 text-white rounded-lg transition-all hover:shadow-lg hover:shadow-gray-500/20 active:scale-95 font-medium"
              >
                <span className="flex items-center gap-2">
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </span>
                <div className="absolute inset-0 rounded-lg bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all hover:scale-105 active:scale-95 group"
            >
              <X className="w-5 h-5 text-gray-600 dark:text-gray-400 group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Customer Info */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <User className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Customer Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer.name}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Email</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer.email}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Phone</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.customer.phone}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Sales By</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{order.salesBy}</p>
              </div>
            </div>
          </div>

          {/* Delivery Address */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Delivery Address</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p>{order.deliveryAddress.address}</p>
              {order.deliveryAddress.area && <p>{order.deliveryAddress.area}, {order.deliveryAddress.zone}</p>}
              {!order.deliveryAddress.area && <p>{order.deliveryAddress.zone}</p>}
              <p>{order.deliveryAddress.city}, {order.deliveryAddress.district}</p>
              <p>{order.deliveryAddress.division} - {order.deliveryAddress.postalCode}</p>
            </div>
          </div>

          {/* Products */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Products</h3>
            </div>
            <div className="space-y-3">
              {order.products.map((product, idx) => {
                const productWithBarcodes = product as any;
                const barcodes = productWithBarcodes.barcodes || [];
                
                return (
                  <div key={product.id || idx} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900 dark:text-white mb-2">{product.productName}</p>
                        <div className="flex gap-3 text-xs mb-2">
                          <span className="text-gray-600 dark:text-gray-400">Size: {product.size}</span>
                          <span className="text-gray-600 dark:text-gray-400">Qty: {product.qty}</span>
                          <span className="text-gray-600 dark:text-gray-400">৳{product.price} each</span>
                        </div>
                        {barcodes.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Barcodes:</p>
                            <div className="flex flex-wrap gap-2">
                              {barcodes.map((barcode: string, barcodeIdx: number) => (
                                <span
                                  key={barcodeIdx}
                                  className="inline-flex items-center px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md text-xs font-mono border border-blue-200 dark:border-blue-800"
                                >
                                  {barcode}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="font-bold text-gray-900 dark:text-white">৳{product.amount.toLocaleString()}</p>
                        {product.discount > 0 && (
                          <p className="text-xs font-medium text-green-600 dark:text-green-400 mt-1">-৳{product.discount} off</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Store Info - Placed After Products */}
            {order.store && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center flex-shrink-0">
                    <StoreIcon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Store Information</p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Store</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.store.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Location</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.store.location}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-500 mb-0.5">Type</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{order.store.type}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Payment Summary */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-gray-700 dark:text-gray-300" />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Payment Summary</h3>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                <span className="font-semibold text-gray-900 dark:text-white">৳{(order.amounts?.subtotal || order.subtotal).toLocaleString()}</span>
              </div>
              {order.amounts && (
                <>
                  {order.amounts.totalDiscount > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Discount</span>
                      <span className="font-medium text-green-600 dark:text-green-400">-৳{order.amounts.totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600 dark:text-gray-400">VAT ({order.amounts.vatRate}%)</span>
                    <span className="font-medium text-gray-900 dark:text-white">৳{order.amounts.vat.toLocaleString()}</span>
                  </div>
                  {order.amounts.transportCost > 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Transport Cost</span>
                      <span className="font-medium text-gray-900 dark:text-white">৳{order.amounts.transportCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="pt-2 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex justify-between items-center text-sm font-semibold">
                      <span className="text-gray-900 dark:text-white">Total Amount</span>
                      <span className="text-gray-900 dark:text-white">৳{order.amounts.total.toLocaleString()}</span>
                    </div>
                  </div>
                </>
              )}
              <div className="pt-3 border-t border-gray-300 dark:border-gray-700">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Amount Paid</span>
                  <span className="font-medium text-gray-900 dark:text-white">৳{order.payments.totalPaid.toLocaleString()}</span>
                </div>
              </div>
              {order.payments.due > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-orange-700 dark:text-orange-400">Due Amount</span>
                    <span className="font-bold text-lg text-orange-600 dark:text-orange-400">৳{order.payments.due.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Click outside to close printer select */}
      {showPrinterSelect && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowPrinterSelect(false)}
        />
      )}

      {/* Receipt Preview Modal */}
      {showReceiptPreview && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">Receipt Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintFromPreview}
                  disabled={isPrinting || !qzStatus.connected}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Printer className="w-4 h-4" />
                  {isPrinting ? 'Printing...' : 'Print Now'}
                </button>
                <button
                  onClick={() => setShowReceiptPreview(false)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>

            <div className="p-8 bg-white dark:bg-gray-950">
              <div className="max-w-sm mx-auto bg-white border border-gray-300 p-6 font-mono text-xs leading-relaxed">
                <div className="text-center mb-4">
                  <div className="text-2xl font-bold mb-2">RECEIPT</div>
                  <div className="text-xs mb-4">Order Confirmation</div>
                  <div className="border-t-2 border-double border-black pt-2">
                    <div className="flex justify-between font-semibold">
                      <span>ORDER #{order.id}</span>
                      <span>{order.date}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t-2 border-black my-3"></div>

                {/* Store Info in Receipt */}
                {order.store && (
                  <>
                    <div className="mb-3">
                      <div className="font-bold mb-1">STORE</div>
                      <div>{order.store.name}</div>
                      <div className="text-[10px] text-gray-600">{order.store.location}</div>
                    </div>
                    <div className="border-t border-gray-400 my-3"></div>
                  </>
                )}

                <div className="mb-3">
                  <div className="font-bold mb-1">CUSTOMER DETAILS</div>
                  <div>Name: {order.customer.name}</div>
                  <div>Phone: {order.customer.phone}</div>
                  <div>Sales By: {order.salesBy}</div>
                </div>

                <div className="mb-3">
                  <div className="font-bold mb-1">DELIVERY ADDRESS</div>
                  <div>{order.deliveryAddress.address}</div>
                  {order.deliveryAddress.area && (
                    <div>{order.deliveryAddress.area}, {order.deliveryAddress.zone}</div>
                  )}
                  {!order.deliveryAddress.area && <div>{order.deliveryAddress.zone}</div>}
                  <div>{order.deliveryAddress.city}, {order.deliveryAddress.district}</div>
                  <div>{order.deliveryAddress.division} - {order.deliveryAddress.postalCode}</div>
                </div>

                <div className="border-t border-gray-400 my-3"></div>

                <div className="mb-3">
                  <div className="font-bold mb-2">ORDER ITEMS</div>
                  <div className="border-t-2 border-black pt-2 space-y-2">
                    {order.products.map((product, idx) => {
                      const productWithBarcodes = product as any;
                      const barcodes = productWithBarcodes.barcodes || [];
                      return (
                        <div key={idx} className="pb-2">
                          <div className="font-semibold">
                            {product.productName.length > 40
                              ? product.productName.substring(0, 37) + '...'
                              : product.productName}
                          </div>
                          <div className="flex justify-between">
                            <span>  {product.size} x{product.qty} @ Tk{product.price}</span>
                            <span>Tk{product.amount.toLocaleString()}</span>
                          </div>
                          {barcodes.length > 0 && (
                            <div className="text-[10px] text-gray-600">
                              Barcodes: {barcodes.slice(0, 3).join(', ')}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t-2 border-black my-3"></div>

                <div className="space-y-1 mb-3">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>Tk{(order.amounts?.subtotal || order.subtotal).toLocaleString()}</span>
                  </div>
                  {order.amounts && order.amounts.totalDiscount > 0 && (
                    <div className="flex justify-between text-green-700">
                      <span>Discount:</span>
                      <span>-Tk{order.amounts.totalDiscount.toLocaleString()}</span>
                    </div>
                  )}
                  {order.amounts && (
                    <div className="flex justify-between">
                      <span>VAT ({order.amounts.vatRate}%):</span>
                      <span>Tk{order.amounts.vat.toLocaleString()}</span>
                    </div>
                  )}
                  {order.amounts && order.amounts.transportCost > 0 && (
                    <div className="flex justify-between">
                      <span>Transport:</span>
                      <span>Tk{order.amounts.transportCost.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-gray-400 pt-1 mt-2 flex justify-between font-bold text-base">
                    <span>TOTAL:</span>
                    <span>Tk{(order.amounts?.total || order.subtotal).toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-gray-100 -mx-2 px-2 py-2 mb-2">
                  <div className="flex justify-between font-semibold">
                    <span>Amount Paid:</span>
                    <span>Tk{order.payments.totalPaid.toLocaleString()}</span>
                  </div>
                </div>

                {order.payments.due > 0 && (
                  <div className="bg-black text-white -mx-2 px-2 py-2 mb-3">
                    <div className="flex justify-between font-bold">
                      <span>DUE AMOUNT:</span>
                      <span>Tk{order.payments.due.toLocaleString()}</span>
                    </div>
                  </div>
                )}

                <div className="border-t-2 border-black my-3"></div>

                <div className="text-center text-xs">
                  <div className="font-semibold mb-1">THANK YOU FOR YOUR BUSINESS</div>
                  <div className="text-gray-500">This is a computer-generated receipt</div>
                </div>
              </div>

              <div className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                <p>Preview of thermal printer output (48 characters width)</p>
                <p className="mt-1">Actual print may vary based on printer model</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}