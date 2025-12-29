// components/orders/EditOrderModal.tsx

import { useState, useEffect } from 'react';
import { X, Save, User, MapPin, Package, CreditCard, Plus, Trash2, Search } from 'lucide-react';
import { Order, Product } from '@/types/order';

interface EditOrderModalProps {
  order: Order;
  onClose: () => void;
  onSave: (updatedOrder: Order) => Promise<void>;
}

export default function EditOrderModal({ order, onClose, onSave }: EditOrderModalProps) {
  const [formData, setFormData] = useState<Order>(JSON.parse(JSON.stringify(order)));
  const [isSaving, setIsSaving] = useState(false);
  
  // Product search states
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountTk, setDiscountTk] = useState('');
  const [amount, setAmount] = useState('0.00');

  // Fetch products on component mount
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch('/api/products');
        if (response.ok) {
          const data = await response.json();
          setAllProducts(data);
        }
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
    fetchProducts();
  }, []);

  // Live search with debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(() => {
      const results = allProducts.filter((product: any) =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(results);
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, allProducts]);

  // Select product from search results
  const handleProductSelect = (product: any) => {
    setSelectedProduct(product);
    setSearchQuery('');
    setSearchResults([]);
    setQuantity('1');
    setDiscountPercent('');
    setDiscountTk('');
  };

  // Calculate amount
  useEffect(() => {
    if (selectedProduct && quantity) {
      const price = parseFloat(selectedProduct.attributes.Price);
      const qty = parseFloat(quantity) || 0;
      const discPer = parseFloat(discountPercent) || 0;
      const discTk = parseFloat(discountTk) || 0;
      
      const baseAmount = price * qty;
      const percentDiscount = (baseAmount * discPer) / 100;
      const totalDiscount = percentDiscount + discTk;
      setAmount((baseAmount - totalDiscount).toFixed(2));
    } else {
      setAmount('0.00');
    }
  }, [selectedProduct, quantity, discountPercent, discountTk]);

  const addProductToOrder = () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      alert('Please select a product and enter a valid quantity');
      return;
    }

    const price = parseFloat(selectedProduct.attributes.Price);
    const qty = parseFloat(quantity);
    const discPer = parseFloat(discountPercent) || 0;
    const discTk = parseFloat(discountTk) || 0;
    
    const baseAmount = price * qty;
    const percentDiscount = (baseAmount * discPer) / 100;
    const totalDiscountValue = percentDiscount + discTk;
    
    // Check if product already exists in order
    const existingProductIndex = formData.products.findIndex(
      (p) => p.productName === selectedProduct.name && p.price === price
    );
    
    let updatedProducts;
    
    if (existingProductIndex !== -1) {
      // Product exists - Update quantity and recalculate
      updatedProducts = [...formData.products];
      const existingProduct = updatedProducts[existingProductIndex];
      
      const newQty = existingProduct.qty + qty;
      const newBaseAmount = price * newQty;
      const newPercentDiscount = (newBaseAmount * discPer) / 100;
      const newTotalDiscount = existingProduct.discount + totalDiscountValue;
      
      updatedProducts[existingProductIndex] = {
        ...existingProduct,
        qty: newQty,
        discount: newTotalDiscount,
        amount: newBaseAmount - newTotalDiscount
      };
      
      alert(`Updated ${selectedProduct.name}: Quantity increased to ${newQty}`);
    } else {
      // New product - Add to list
      const newProduct: Product = {
        id: Date.now(),
        productName: selectedProduct.name,
        size: '1',
        qty: qty,
        price: price,
        discount: totalDiscountValue,
        amount: baseAmount - totalDiscountValue
      };
      
      updatedProducts = [...formData.products, newProduct];
    }
    
    setFormData({ ...formData, products: updatedProducts });
    recalculateTotals(updatedProducts);
    
    // Reset and close search
    setSelectedProduct(null);
    setQuantity('');
    setDiscountPercent('');
    setDiscountTk('');
    setAmount('0.00');
    setShowProductSearch(false);
  };

  const handleCustomerChange = (field: keyof Order['customer'], value: string) => {
    setFormData({
      ...formData,
      customer: { ...formData.customer, [field]: value }
    });
  };

  const handleAddressChange = (field: keyof Order['deliveryAddress'], value: string) => {
    setFormData({
      ...formData,
      deliveryAddress: { ...formData.deliveryAddress, [field]: value }
    });
  };

  const handleProductChange = (index: number, field: keyof Product, value: string | number) => {
    const updatedProducts = [...formData.products];
    updatedProducts[index] = { ...updatedProducts[index], [field]: value };
    
    if (field === 'qty' || field === 'price' || field === 'discount') {
      const product = updatedProducts[index];
      product.amount = product.qty * product.price - product.discount;
    }
    
    setFormData({ ...formData, products: updatedProducts });
    recalculateTotals(updatedProducts);
  };

  const removeProduct = (index: number) => {
    if (formData.products.length === 1) {
      alert('Cannot remove the last product. Order must have at least one product.');
      return;
    }
    const updatedProducts = formData.products.filter((_, i) => i !== index);
    setFormData({ ...formData, products: updatedProducts });
    recalculateTotals(updatedProducts);
  };

  const recalculateTotals = (products: Product[]) => {
    const subtotal = products.reduce((sum, p) => sum + p.amount, 0);
    const totalDiscount = products.reduce((sum, p) => sum + p.discount, 0);
    const vat = Math.round(subtotal * (formData.amounts.vatRate / 100));
    const total = subtotal + vat + formData.amounts.transportCost;
    
    const totalPaid = formData.payments.sslCommerz + formData.payments.advance;
    const due = total - totalPaid;
    
    setFormData(prev => ({
      ...prev,
      subtotal,
      amounts: {
        ...prev.amounts,
        subtotal,
        totalDiscount,
        vat,
        total
      },
      payments: {
        ...prev.payments,
        totalPaid,
        due
      }
    }));
  };

  const handlePaymentChange = (field: keyof Order['payments'], value: number | string) => {
    const updatedPayments = { ...formData.payments, [field]: value };
    
    if (field === 'sslCommerz' || field === 'advance') {
      updatedPayments.totalPaid = updatedPayments.sslCommerz + updatedPayments.advance;
      updatedPayments.due = formData.amounts.total - updatedPayments.totalPaid;
    }
    
    setFormData({ ...formData, payments: updatedPayments });
  };

  const handleAmountsChange = (field: keyof Order['amounts'], value: number) => {
    const updatedAmounts = { ...formData.amounts, [field]: value };
    
    if (field === 'vatRate') {
      updatedAmounts.vat = Math.round(updatedAmounts.subtotal * (value / 100));
    }
    
    if (field === 'transportCost' || field === 'vatRate') {
      updatedAmounts.total = updatedAmounts.subtotal + updatedAmounts.vat + updatedAmounts.transportCost;
      const totalPaid = formData.payments.sslCommerz + formData.payments.advance;
      setFormData({
        ...formData,
        amounts: updatedAmounts,
        payments: { ...formData.payments, due: updatedAmounts.total - totalPaid }
      });
    } else {
      setFormData({ ...formData, amounts: updatedAmounts });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save order:', error);
      alert('Failed to save order. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-5xl w-full my-8 border border-gray-200 dark:border-gray-800">
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-5 flex items-center justify-between rounded-t-2xl z-10">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Edit Order</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Order #{order.id}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="submit"
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
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
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Name *</label>
                  <input
                    type="text"
                    value={formData.customer.name}
                    onChange={(e) => handleCustomerChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Email *</label>
                  <input
                    type="email"
                    value={formData.customer.email}
                    onChange={(e) => handleCustomerChange('email', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Phone *</label>
                  <input
                    type="tel"
                    value={formData.customer.phone}
                    onChange={(e) => handleCustomerChange('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Sales By *</label>
                  <input
                    type="text"
                    value={formData.salesBy}
                    onChange={(e) => setFormData({ ...formData, salesBy: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Division *</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress.division}
                    onChange={(e) => handleAddressChange('division', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">District *</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress.district}
                    onChange={(e) => handleAddressChange('district', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">City *</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress.city}
                    onChange={(e) => handleAddressChange('city', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Zone *</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress.zone}
                    onChange={(e) => handleAddressChange('zone', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Area</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress.area}
                    onChange={(e) => handleAddressChange('area', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Postal Code *</label>
                  <input
                    type="text"
                    value={formData.deliveryAddress.postalCode}
                    onChange={(e) => handleAddressChange('postalCode', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    required
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Address *</label>
                  <textarea
                    value={formData.deliveryAddress.address}
                    onChange={(e) => handleAddressChange('address', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none resize-none"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Products */}
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Products</h3>
                </div>
                
                {!showProductSearch && (
                  <button
                    type="button"
                    onClick={() => setShowProductSearch(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg text-sm transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Add Product
                  </button>
                )}
              </div>

              {/* Product Search Section - Shows when Add Product is clicked */}
              {showProductSearch && (
                <div className="mb-4 p-4 bg-white dark:bg-gray-900 rounded-lg border-2 border-blue-500 dark:border-blue-600">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Search & Add Product</h4>
                    <button
                      type="button"
                      onClick={() => {
                        setShowProductSearch(false);
                        setSelectedProduct(null);
                        setSearchQuery('');
                        setSearchResults([]);
                      }}
                      className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      placeholder="Search product name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                    <button 
                      type="button"
                      className="px-4 py-2 bg-black hover:bg-gray-800 text-white rounded-lg transition-colors flex-shrink-0"
                    >
                      <Search size={18} />
                    </button>
                  </div>

                  {/* Search Results */}
                  {searchResults.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-60 overflow-y-auto mb-3 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                      {searchResults.map((product) => (
                        <div
                          key={product.id}
                          onClick={() => handleProductSelect(product)}
                          className="border border-gray-200 dark:border-gray-600 rounded p-2 cursor-pointer hover:bg-white dark:hover:bg-gray-700 hover:shadow-md transition-all"
                        >
                          <img 
                            src={product.attributes.mainImage} 
                            alt={product.name} 
                            className="w-full h-24 object-cover rounded mb-1" 
                          />
                          <p className="text-xs text-gray-900 dark:text-white font-medium truncate">{product.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">৳{product.attributes.Price}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Selected Product */}
                  {selectedProduct && (
                    <>
                      <div className="mb-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-green-800 dark:text-green-300">✓ Selected Product</span>
                          <button 
                            type="button"
                            onClick={() => {
                              setSelectedProduct(null);
                              setQuantity('');
                              setDiscountPercent('');
                              setDiscountTk('');
                            }} 
                            className="text-red-600 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <img 
                            src={selectedProduct.attributes.mainImage} 
                            alt={selectedProduct.name} 
                            className="w-12 h-12 object-cover rounded flex-shrink-0" 
                          />
                          <div className="min-w-0">
                            <p className="text-xs text-gray-900 dark:text-white font-medium truncate">{selectedProduct.name}</p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">Price: ৳{selectedProduct.attributes.Price}</p>
                          </div>
                        </div>
                      </div>

                      {/* Product Input Fields */}
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Quantity</label>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = parseInt(quantity) || 0;
                                if (currentQty > 1) {
                                  setQuantity(String(currentQty - 1));
                                }
                              }}
                              disabled={!quantity || parseInt(quantity) <= 1}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-lg font-bold"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              placeholder="0"
                              value={quantity}
                              onChange={(e) => setQuantity(e.target.value)}
                              min="1"
                              className="flex-1 px-3 py-2 text-sm text-center border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentQty = parseInt(quantity) || 0;
                                setQuantity(String(currentQty + 1));
                              }}
                              className="w-8 h-8 flex items-center justify-center border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-lg font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Discount %</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={discountPercent}
                              onChange={(e) => setDiscountPercent(e.target.value)}
                              className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Tk.</label>
                            <input
                              type="number"
                              placeholder="0"
                              value={discountTk}
                              onChange={(e) => setDiscountTk(e.target.value)}
                              className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Amount</label>
                            <input
                              type="text"
                              value={amount}
                              readOnly
                              className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-white font-semibold"
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={addProductToOrder}
                          className="w-full px-4 py-2.5 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                        >
                          <Plus className="w-4 h-4" />
                          Add to Order
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Existing Products List */}
              <div className="space-y-3">
                {formData.products.map((product, index) => (
                  <div key={product.id} className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Product Name *</label>
                        <input
                          type="text"
                          value={product.productName}
                          onChange={(e) => handleProductChange(index, 'productName', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-500 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Size *</label>
                        <input
                          type="text"
                          value={product.size}
                          onChange={(e) => handleProductChange(index, 'size', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-500 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Qty *</label>
                        <input
                          type="number"
                          value={product.qty}
                          onChange={(e) => handleProductChange(index, 'qty', parseInt(e.target.value) || 0)}
                          min="1"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-500 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Price *</label>
                        <input
                          type="number"
                          value={product.price}
                          onChange={(e) => handleProductChange(index, 'price', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-500 outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Discount</label>
                        <input
                          type="number"
                          value={product.discount}
                          onChange={(e) => handleProductChange(index, 'discount', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-gray-500 outline-none"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Amount: <span className="font-bold text-gray-900 dark:text-white">৳{product.amount.toLocaleString()}</span>
                      </p>
                      {formData.products.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeProduct(index)}
                          className="flex items-center gap-1 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-sm transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amounts & Payment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Amounts */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg mb-4">Amounts</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">VAT Rate (%)</label>
                    <input
                      type="number"
                      value={formData.amounts.vatRate}
                      onChange={(e) => handleAmountsChange('vatRate', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Transport Cost</label>
                    <input
                      type="number"
                      value={formData.amounts.transportCost}
                      onChange={(e) => handleAmountsChange('transportCost', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    />
                  </div>
                  <div className="pt-3 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">৳{formData.amounts.subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">VAT:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">৳{formData.amounts.vat.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-gray-900 dark:text-white">Total:</span>
                      <span className="text-gray-900 dark:text-white">৳{formData.amounts.total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payments */}
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                  </div>
                  <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Payments</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">SSL Commerz</label>
                    <input
                      type="number"
                      value={formData.payments.sslCommerz}
                      onChange={(e) => handlePaymentChange('sslCommerz', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Advance</label>
                    <input
                      type="number"
                      value={formData.payments.advance}
                      onChange={(e) => handlePaymentChange('advance', parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">Transaction ID</label>
                    <input
                      type="text"
                      value={formData.payments.transactionId}
                      onChange={(e) => handlePaymentChange('transactionId', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:ring-2 focus:ring-gray-500 outline-none"
                    />
                  </div>
                  <div className="pt-3 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-gray-400">Total Paid:</span>
                      <span className="font-semibold text-green-600 dark:text-green-400">৳{formData.payments.totalPaid.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-base font-bold">
                      <span className="text-gray-900 dark:text-white">Due:</span>
                      <span className={formData.payments.due > 0 ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"}>
                        ৳{formData.payments.due.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}