'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, CheckCircle2, AlertCircle, Package, Calculator, UserPlus, Users, Download, X } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

// Services
import orderService from '@/services/orderService';
import paymentService from '@/services/paymentService';
import employeeService from '@/services/employeeService';
import storeService from '@/services/storeService';
import productService from '@/services/productService';
import batchService, { Batch } from '@/services/batchService';
import defectIntegrationService from '@/services/defectIntegrationService';
import paymentMethodService from '@/services/paymentMethodService';

// Components
import BarcodeScanner, { ScannedProduct } from '@/components/pos/BarcodeScanner';
import CartTable, { CartItem } from '@/components/pos/CartTable';
import InputModeSelector from '@/components/pos/InputModeSelector';

interface Store {
  id: number;
  name: string;
  address: string;
  type: string;
  is_active: boolean;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  joinDate: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  batches?: Batch[];
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// ✅ Extended CartItem interface to support defective items
export interface ExtendedCartItem extends CartItem {
  isDefective?: boolean;
  defectId?: string;
}

export default function POSPage() {
  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Input Mode
  const [inputMode, setInputMode] = useState<'barcode' | 'manual'>('barcode');

  // Basic Setup
  const [outlets, setOutlets] = useState<Store[]>([]);
  const [selectedOutlet, setSelectedOutlet] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState('');
  
  // User Info
  const [userRole, setUserRole] = useState<string>('');
  const [userName, setUserName] = useState<string>('');

  // Cart
  const [cart, setCart] = useState<ExtendedCartItem[]>([]);
  
  // Products (for manual entry)
  const [products, setProducts] = useState<Product[]>([]);
  const [product, setProduct] = useState('');
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [sellingPrice, setSellingPrice] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [address, setAddress] = useState('');

  // Payment
  const [vatRate, setVatRate] = useState(5);
  const [transportCost, setTransportCost] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);
  const [cardPaid, setCardPaid] = useState(0);
  const [bkashPaid, setBkashPaid] = useState(0);
  const [nagadPaid, setNagadPaid] = useState(0);

  const [paymentMethods, setPaymentMethods] = useState<{
    cash?: number;
    card?: number;
    mobileWallet?: number;
  }>({
    cash: 1,
    card: 2,
    mobileWallet: 6,
  });

  // Employee Modal
  const [showAddEmployeeModal, setShowAddEmployeeModal] = useState(false);
  const [newEmployee, setNewEmployee] = useState({ name: '', email: '', phone: '', role: '' });

  // ✅ Defect Item State
  const [defectItem, setDefectItem] = useState<{
    id: string;
    barcode: string;
    productId: number;
    productName: string;
    sellingPrice: number;
    batchId: number;
    store?: string;
    costPrice?: number;
    originalPrice?: number;
  } | null>(null);

  // ============ TOAST HELPER ============
  const showToast = (message: string, type: 'success' | 'error') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(toast => toast.id !== id)), 5000);
  };

  // ============ DEFECT ITEM LOADING ============
  
  /**
   * ✅ Check for defect item in URL and sessionStorage
   */
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const defectId = urlParams.get('defect');
    
    if (defectId) {
      console.log('═══════════════════════════════════');
      console.log('🔍 DEFECT ID IN URL:', defectId);
      
      const savedDefect = sessionStorage.getItem('defectItem');
      console.log('📦 Checking sessionStorage:', savedDefect);
      
      if (savedDefect) {
        try {
          const parsedDefect = JSON.parse(savedDefect);
          console.log('✅ Loaded defect from sessionStorage:', parsedDefect);
          
          // Validate required fields
          if (!parsedDefect.batchId) {
            console.error('❌ Missing batch_id in defect data');
            showToast('Error: Defect item is missing batch information', 'error');
            return;
          }
          
          setDefectItem(parsedDefect);
          showToast(`Defect item loaded: ${parsedDefect.productName}`, 'success');
          
          console.log('═══════════════════════════════════');
        } catch (error) {
          console.error('❌ Error parsing defect data:', error);
          showToast('Error loading defect item', 'error');
        }
      } else {
        console.warn('⚠️ No defect data in sessionStorage');
        showToast('Defect item data not found. Please return to defects page.', 'error');
      }
    }
  }, []);

  /**
   * ✅ Auto-add defect item to cart when outlet is selected
   */
  useEffect(() => {
    if (defectItem && selectedOutlet) {
      console.log('🎯 Auto-adding defect item to cart');
      console.log('Defect:', defectItem);
      console.log('Selected outlet:', selectedOutlet);
      
      // Create cart item from defect
      const newItem: ExtendedCartItem = {
        id: Date.now(),
        productId: defectItem.productId,
        productName: `${defectItem.productName} [DEFECTIVE]`,
        batchId: defectItem.batchId,
        batchNumber: `DEFECT-${defectItem.id}`,
        qty: 1,
        price: defectItem.sellingPrice,
        discount: 0,
        amount: defectItem.sellingPrice,
        availableQty: 1,
        barcode: defectItem.barcode,
        isDefective: true,
        defectId: defectItem.id,
      };
      
      setCart([newItem]);
      showToast(`✓ Defect item added: ${defectItem.productName}`, 'success');
      
      // Clear from sessionStorage after adding
      sessionStorage.removeItem('defectItem');
      setDefectItem(null);
    }
  }, [defectItem, selectedOutlet]);

  // ============ CART MANAGEMENT ============
  
  /**
   * Add scanned product to cart
   */
  const handleProductScanned = (scannedProduct: ScannedProduct) => {
    const newItem: ExtendedCartItem = {
      id: Date.now() + Math.random(),
      productId: scannedProduct.productId,
      productName: scannedProduct.productName,
      batchId: scannedProduct.batchId,
      batchNumber: scannedProduct.batchNumber,
      qty: 1,
      price: scannedProduct.price,
      discount: 0,
      amount: scannedProduct.price,
      availableQty: scannedProduct.availableQty,
      barcode: scannedProduct.barcode,
    };

    setCart(prev => [...prev, newItem]);
    showToast(`✓ Added: ${scannedProduct.productName}`, 'success');
  };

  /**
   * Add manually selected product to cart
   */
  const addManualProductToCart = () => {
    if (!product || !selectedBatch) {
      showToast('Please select a product and batch', 'error');
      return;
    }

    if (sellingPrice <= 0 || quantity <= 0) {
      showToast('Please enter valid price and quantity', 'error');
      return;
    }

    if (quantity > selectedBatch.quantity) {
      showToast(`Only ${selectedBatch.quantity} units available`, 'error');
      return;
    }

    const baseAmount = sellingPrice * quantity;
    const discountValue = discountPercent > 0 
      ? (baseAmount * discountPercent) / 100 
      : discountAmount;

    const newItem: ExtendedCartItem = {
      id: Date.now() + Math.random(),
      productId: selectedBatch.product.id,
      productName: product,
      batchId: selectedBatch.id,
      batchNumber: selectedBatch.batch_number,
      qty: quantity,
      price: sellingPrice,
      discount: discountValue,
      amount: baseAmount - discountValue,
      availableQty: selectedBatch.quantity,
      barcode: undefined,
    };

    setCart(prev => [...prev, newItem]);
    showToast(`✓ Added: ${product} (${quantity} units)`, 'success');

    // Reset form
    setProduct('');
    setSelectedBatch(null);
    setSellingPrice(0);
    setQuantity(1);
    setDiscountPercent(0);
    setDiscountAmount(0);
  };

  /**
   * Remove item from cart
   */
  const removeFromCart = (id: number) => {
    setCart(prev => prev.filter(item => item.id !== id));
    showToast('Item removed from cart', 'success');
  };

  /**
   * Update item quantity in cart
   */
  const updateCartItemQuantity = (id: number, newQty: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        // ✅ Prevent quantity changes for defective items
        if (item.isDefective) {
          showToast('Cannot change quantity of defective items', 'error');
          return item;
        }
        
        if (newQty <= item.availableQty) {
          const baseAmount = item.price * newQty;
          const discountValue = item.discount > 0 
            ? (baseAmount * (item.discount / (item.price * item.qty))) 
            : 0;
          
          return {
            ...item,
            qty: newQty,
            amount: baseAmount - discountValue,
          };
        }
      }
      return item;
    }));
  };

  /**
   * ✅ NEW: Update item discount in cart
   */
  const updateCartItemDiscount = (id: number, discountValue: number) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const baseAmount = item.price * item.qty;
        const newDiscount = Math.min(discountValue, baseAmount); // Can't discount more than total
        
        return {
          ...item,
          discount: newDiscount,
          amount: baseAmount - newDiscount,
        };
      }
      return item;
    }));
  };

  // ============ PRODUCT SELECTION (Manual Mode) ============
  
  const handleProductSelect = (productName: string) => {
    setProduct(productName);
    const selectedProd = products.find(p => p.name === productName);
    
    if (selectedProd && selectedProd.batches && selectedProd.batches.length > 0) {
      const firstBatch = selectedProd.batches[0];
      setSelectedBatch(firstBatch);
      
      const priceString = String(firstBatch.sell_price).replace(/,/g, '');
      const price = parseFloat(priceString) || 0;
      setSellingPrice(price);
    } else {
      setSelectedBatch(null);
      setSellingPrice(0);
      showToast('No available batches for this product', 'error');
    }
  };

  // ============ CALCULATIONS ============
  
  const subtotal = cart.reduce((sum, item) => sum + item.amount, 0);
  const totalDiscount = cart.reduce((sum, item) => sum + item.discount, 0);
  const vat = (subtotal * vatRate) / 100;
  const total = subtotal + vat + transportCost;
  const totalPaid = cashPaid + cardPaid + bkashPaid + nagadPaid;
  
  // ✅ FIXED: Calculate due and change correctly
  const due = total - totalPaid;
  const change = totalPaid > total ? totalPaid - total : 0;

  // ============ ORDER SUBMISSION ============
  
  const handleSell = async () => {
    // Validation
    if (!selectedOutlet) {
      showToast('Please select an outlet', 'error');
      return;
    }
    if (cart.length === 0) {
      showToast('Please add products to cart', 'error');
      return;
    }
    if (!selectedEmployee) {
      showToast('Please select an employee', 'error');
      return;
    }
    
    // ✅ FIXED: Only warn if there's actual unpaid balance (not overpayment)
    if (due > 0 && !confirm(`Outstanding amount: ৳${due.toFixed(2)}. Continue?`)) {
      return;
    }

    setIsProcessing(true);

    try {
      console.log('═══════════════════════════════════');
      console.log('📦 PREPARING ORDER');
      console.log('Cart items:', cart.length);
      console.log('Defective items:', cart.filter(i => i.isDefective).length);
      console.log('Total (product cost):', total.toFixed(2));
      console.log('Total paid:', totalPaid.toFixed(2));
      console.log('Change to return:', change.toFixed(2));
      console.log('═══════════════════════════════════');

      // ✅ Validate all cart items have required fields
      for (const item of cart) {
        if (!item.productId) {
          throw new Error(`Missing product_id for ${item.productName}`);
        }
        if (!item.batchId) {
          throw new Error(`Missing batch_id for ${item.productName}`);
        }
        if (!item.qty || item.qty <= 0) {
          throw new Error(`Invalid quantity for ${item.productName}`);
        }
        if (item.price === undefined || item.price < 0) {
          throw new Error(`Invalid price for ${item.productName}`);
        }
      }

      // ✅ FIXED: Calculate tax amount for each item based on VAT rate and proportional distribution
      const vatAmount = (subtotal * vatRate) / 100;
      
      // Distribute VAT proportionally based on each item's share of subtotal
      const itemsWithTax = cart.map(item => {
        const itemSubtotal = item.amount; // After discount
        const itemTaxShare = subtotal > 0 ? (itemSubtotal / subtotal) * vatAmount : 0;
        return {
          item,
          taxAmount: parseFloat(itemTaxShare.toFixed(2))
        };
      });
      
      console.log('📊 VAT Distribution:', {
        subtotal: subtotal.toFixed(2),
        vatRate: `${vatRate}%`,
        totalVAT: vatAmount.toFixed(2),
        itemDistribution: itemsWithTax.map(({ item, taxAmount }) => ({
          product: item.productName,
          itemAmount: item.amount.toFixed(2),
          share: ((item.amount / subtotal) * 100).toFixed(2) + '%',
          tax: taxAmount.toFixed(2)
        }))
      });

      // Create order payload
      const orderPayload = {
        order_type: 'counter' as const,
        store_id: parseInt(selectedOutlet),
        salesman_id: parseInt(selectedEmployee),
        
        // ✅ Only add customer if data is provided
        ...(customerName || mobileNo ? {
          customer: {
            name: customerName || 'Walk-in Customer',
            phone: mobileNo || '01XXXXXXXXX',
            ...(address ? { address } : {}),
          }
        } : {}),
        
        // ✅ Map cart items with proportional VAT distribution
        items: itemsWithTax.map(({ item, taxAmount }) => {
          const productId = parseInt(String(item.productId));
          const batchId = parseInt(String(item.batchId));
          const quantity = parseInt(String(item.qty));
          const unitPrice = parseFloat(String(item.price));
          const discountAmount = parseFloat(String(item.discount || 0));

          // Validate after conversion
          if (isNaN(productId)) {
            throw new Error(`Invalid product_id for ${item.productName}`);
          }
          if (isNaN(batchId)) {
            throw new Error(`Invalid batch_id for ${item.productName}`);
          }
          if (isNaN(quantity) || quantity <= 0) {
            throw new Error(`Invalid quantity for ${item.productName}`);
          }
          if (isNaN(unitPrice) || unitPrice < 0) {
            throw new Error(`Invalid unit_price for ${item.productName}`);
          }

          const itemPayload: any = {
            product_id: productId,
            batch_id: batchId,
            quantity: quantity,
            unit_price: unitPrice,
            discount_amount: discountAmount,
            tax_amount: taxAmount, // ✅ FIXED: Use proportionally distributed VAT
          };

          // ✅ CRITICAL: Only include barcode for NON-defective items
          if (!item.isDefective && item.barcode) {
            itemPayload.barcode = item.barcode;
          }

          console.log(`Item ${item.productName}:`, {
            ...itemPayload,
            isDefective: item.isDefective,
            hasBarcode: !!item.barcode,
            vatShare: `${((item.amount / subtotal) * 100).toFixed(2)}%`,
          });

          return itemPayload;
        }),
        
        // ✅ FIXED: Add totals correctly
        discount_amount: totalDiscount,
        shipping_amount: transportCost,
        
        // ✅ Add notes if any
        ...(address || vatRate > 0 ? {
          notes: `${vatRate > 0 ? `VAT: ${vatRate}%` : ''}${address ? `, Address: ${address}` : ''}${change > 0 ? `, Change Given: ৳${change.toFixed(2)}` : ''}`.trim()
        } : {}),
      };

      console.log('═══════════════════════════════════');
      console.log('📤 ORDER PAYLOAD:');
      console.log(JSON.stringify(orderPayload, null, 2));
      console.log('═══════════════════════════════════');

      // Create order
      console.log('📦 Creating order...');
      const order = await orderService.create(orderPayload);
      
      console.log('✅ Order created:', order.order_number);
      showToast(`Order #${order.order_number} created!`, 'success');

      // ✅ Handle defective items
      const defectiveItems = cart.filter(item => item.isDefective && item.defectId);
      
      if (defectiveItems.length > 0) {
        console.log('🏷️ Processing', defectiveItems.length, 'defective items...');
        
        for (const item of defectiveItems) {
          try {
            console.log(`📋 Marking defective ${item.defectId} as sold...`);
            
            await defectIntegrationService.markDefectiveAsSold(
              item.defectId!,
              {
                order_id: order.id,
                selling_price: item.price,
                sale_notes: `Sold via POS - Order #${order.order_number}`,
                sold_at: new Date().toISOString(),
              }
            );
            
            console.log(`✅ Defective ${item.defectId} marked as sold`);
            showToast(`✓ Defective item recorded: ${item.productName}`, 'success');
          } catch (defectError: any) {
            console.error(`❌ Failed to mark defective ${item.defectId}:`, defectError);
            showToast(`Warning: Could not update defect status for ${item.productName}`, 'error');
          }
        }
      }

      // ✅ FIXED: Process payments - only charge the order total, not overpayment
      const amountToCharge = Math.min(totalPaid, total); // Don't charge more than order total
      
      if (amountToCharge > 0) {
        console.log('💰 Processing payments...');
        console.log(`Amount to charge: ৳${amountToCharge.toFixed(2)} (Total paid: ৳${totalPaid.toFixed(2)}, Order total: ৳${total.toFixed(2)})`);
        
        const paymentSplits: any[] = [];
        
        // ✅ FIXED: If there's overpayment, reduce it from cash first
        let adjustedCashPaid = cashPaid;
        let adjustedCardPaid = cardPaid;
        let adjustedBkashPaid = bkashPaid;
        let adjustedNagadPaid = nagadPaid;
        
        if (change > 0) {
          // Customer overpaid - reduce cash payment by the change amount
          adjustedCashPaid = Math.max(0, cashPaid - change);
          console.log(`⚠️ Overpayment detected. Reducing cash from ৳${cashPaid} to ৳${adjustedCashPaid}`);
        }
        
        if (adjustedCashPaid > 0) {
          paymentSplits.push({
            payment_method_id: paymentMethods.cash || 1,
            amount: adjustedCashPaid,
          });
        }
        
        if (adjustedCardPaid > 0) {
          paymentSplits.push({
            payment_method_id: paymentMethods.card || 2,
            amount: adjustedCardPaid,
          });
        }
        
        if (adjustedBkashPaid > 0) {
          paymentSplits.push({
            payment_method_id: paymentMethods.mobileWallet || 6,
            amount: adjustedBkashPaid,
          });
        }
        
        if (adjustedNagadPaid > 0) {
          paymentSplits.push({
            payment_method_id: paymentMethods.mobileWallet || 6,
            amount: adjustedNagadPaid,
          });
        }

        // Calculate actual total from splits
        const splitsTotal = paymentSplits.reduce((sum, split) => sum + split.amount, 0);
        
        console.log('💳 Payment splits:', paymentSplits);
        console.log('💰 Splits total:', splitsTotal.toFixed(2));

        if (paymentSplits.length === 1) {
          await paymentService.process(order.id, {
            payment_method_id: paymentSplits[0].payment_method_id,
            amount: paymentSplits[0].amount,
            payment_type: (due <= 0 ? 'full' : 'partial') as 'full' | 'partial',
            auto_complete: true,
          });
        } else if (paymentSplits.length > 1) {
          await paymentService.processSplit(order.id, {
            total_amount: splitsTotal, // ✅ FIXED: Use actual splits total
            payment_type: due <= 0 ? 'full' : 'partial',
            auto_complete: true,
            splits: paymentSplits,
          });
        }
        
        console.log('✅ Payments processed');
      }

      // Complete order
      console.log('🏁 Completing order...');
      await orderService.complete(order.id);
      console.log('✅ Order completed');

      // ✅ FIXED: Show change message if applicable
      if (change > 0) {
        showToast(`✓ Order completed! Change to return: ৳${change.toFixed(2)}`, 'success');
        alert(`Order #${order.order_number} completed!\n\nChange to return to customer: ৳${change.toFixed(2)}`);
      } else {
        showToast(`✓ Order #${order.order_number} completed successfully!`, 'success');
      }
      
      console.log('═══════════════════════════════════');
      console.log('✅ ORDER PROCESS COMPLETE');
      if (change > 0) {
        console.log(`💵 CHANGE TO RETURN: ৳${change.toFixed(2)}`);
      }
      console.log('═══════════════════════════════════');
      
      // Reset form
      resetForm();
      fetchProducts();

    } catch (error: any) {
      console.error('═══════════════════════════════════');
      console.error('❌ ORDER CREATION FAILED');
      console.error('Error:', error);
      console.error('Error message:', error.message);
      console.error('Error response:', error.response);
      console.error('Error response data:', error.response?.data);
      console.error('Validation errors:', error.response?.data?.errors);
      console.error('═══════════════════════════════════');
      
      let errorMessage = 'Failed to complete sale';
      
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const errorMessages = Object.entries(errors)
          .map(([field, messages]: [string, any]) => {
            const fieldName = field.replace(/_/g, ' ').replace(/\./g, ' ');
            return `${fieldName}: ${Array.isArray(messages) ? messages.join(', ') : messages}`;
          })
          .join('\n');
        
        errorMessage = `Validation errors:\n${errorMessages}`;
        console.error('📋 Formatted validation errors:\n', errorMessages);
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      showToast(errorMessage, 'error');
      alert(`Error: ${errorMessage}\n\nCheck console for details.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setCustomerName('');
    setMobileNo('');
    setAddress('');
    setCashPaid(0);
    setCardPaid(0);
    setBkashPaid(0);
    setNagadPaid(0);
    setTransportCost(0);
  };

  // ============ DATA FETCHING ============
  
  const fetchPaymentMethods = async () => {
    try {
      const methods = await paymentService.getMethods('counter');
      
      if (!methods || methods.length === 0) {
        return;
      }
      
      const methodMap: any = {
        cash: 1,
        card: 2,
        mobileWallet: 6,
      };
      
      methods.forEach((method: any) => {
        const code = method.code?.toLowerCase();
        if (code === 'cash') methodMap.cash = method.id;
        else if (code === 'card') methodMap.card = method.id;
        else if (code === 'mobile_banking') methodMap.mobileWallet = method.id;
      });
      
      setPaymentMethods(methodMap);
    } catch (error) {
      console.error('Failed to load payment methods:', error);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response: any = await employeeService.getAll({ is_active: true });
      
      let employeesList: any[] = [];
      
      if (Array.isArray(response)) {
        employeesList = response;
      } else if (response?.data) {
        if (Array.isArray(response.data)) {
          employeesList = response.data;
        } else if (Array.isArray(response.data.data)) {
          employeesList = response.data.data;
        }
      }
      
      const formattedEmployees = employeesList.map((emp: any) => ({
        id: String(emp.id),
        name: emp.name,
        email: emp.email,
        phone: emp.phone,
        role: typeof emp.role === 'object' ? emp.role?.title || 'Unknown' : emp.role,
        joinDate: emp.join_date || new Date().toISOString(),
      }));
      
      setEmployees(formattedEmployees);
    } catch (error: any) {
      console.error('Error fetching employees:', error);
      showToast(error.message || 'Failed to load employees', 'error');
    }
  };

  const fetchOutlets = async (role: string, storeId: string) => {
    try {
      const response = await storeService.getStores({ is_active: true });
      
      if (!response.success) {
        showToast('Failed to load stores', 'error');
        return;
      }
      
      let stores = [];
      if (Array.isArray(response.data)) {
        stores = response.data;
      } else if (response.data?.data) {
        stores = Array.isArray(response.data.data) ? response.data.data : [response.data];
      }
      
      setOutlets(stores);
      
      if (storeId && stores.length > 0) {
        const userStore = stores.find((store: Store) => String(store.id) === String(storeId));
        if (userStore) {
          setSelectedOutlet(String(userStore.id));
        }
      }
    } catch (error) {
      console.error('Error fetching outlets:', error);
      showToast('Failed to load stores', 'error');
    }
  };

  const fetchProducts = async () => {
    if (!selectedOutlet) return;

    try {
      const result = await productService.getAll({
        is_archived: false,
        per_page: 1000,
      });
      
      let productsList: Product[] = [];
      
      if (Array.isArray(result)) {
        productsList = result;
      } else if (result?.data) {
        productsList = Array.isArray(result.data) ? result.data : (result.data.data || []);
      }
      
      const productsWithBatches = await Promise.all(
        productsList.map(async (product: Product) => {
          try {
            const batchResponse = await batchService.getBatches({
              product_id: product.id,
              store_id: parseInt(selectedOutlet),
              status: 'available',
              per_page: 100
            });
            
            const batches = batchResponse.success && batchResponse.data?.data 
              ? batchResponse.data.data.filter((batch: Batch) => batch.quantity > 0)
              : [];
            
            return { ...product, batches };
          } catch (error) {
            return { ...product, batches: [] };
          }
        })
      );
      
      setProducts(productsWithBatches);
    } catch (error) {
      console.error('Error fetching products:', error);
      showToast('Failed to load products', 'error');
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.email || !newEmployee.phone || !newEmployee.role) {
      showToast('Please fill all employee fields', 'error');
      return;
    }

    try {
      const savedEmployee = await employeeService.create({
        name: newEmployee.name,
        email: newEmployee.email,
        phone: newEmployee.phone,
        role: newEmployee.role,
        store_id: selectedOutlet ? parseInt(selectedOutlet) : undefined,
      });

      const formattedEmployee: Employee = {
        id: String(savedEmployee.id),
        name: savedEmployee.name,
        email: savedEmployee.email,
        phone: savedEmployee.phone,
        role: savedEmployee.role,
        joinDate: savedEmployee.join_date || new Date().toISOString(),
      };

      setEmployees([...employees, formattedEmployee]);
      setSelectedEmployee(String(savedEmployee.id));
      setNewEmployee({ name: '', email: '', phone: '', role: '' });
      setShowAddEmployeeModal(false);
      showToast('Employee added successfully!', 'success');
    } catch (error: any) {
      console.error('Error adding employee:', error);
      showToast(error.message || 'Failed to add employee', 'error');
    }
  };

  // ============ EFFECTS ============
  
  useEffect(() => {
    const role = localStorage.getItem('userRole') || '';
    const storeId = localStorage.getItem('storeId') || '';
    const name = localStorage.getItem('userName') || '';
    
    setUserRole(role);
    setUserName(name);

    fetchOutlets(role, storeId);
    fetchEmployees();
    fetchPaymentMethods();
  }, []);

  useEffect(() => {
    if (selectedOutlet) {
      fetchProducts();
    }
  }, [selectedOutlet]);

  // ============ RENDER ============
  
  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        
        <div className="flex-1 flex flex-col">
          <Header 
            darkMode={darkMode} 
            setDarkMode={setDarkMode} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)} 
          />
          
          <main className="flex-1 overflow-auto p-6">
            {/* Toast Notifications */}
            <div className="fixed top-4 right-4 z-50 space-y-2">
              {toasts.map((toast) => (
                <div 
                  key={toast.id} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border ${
                    toast.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  {toast.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
                  )}
                  <p className={`text-sm font-medium ${
                    toast.type === 'success' 
                      ? 'text-green-900 dark:text-green-300' 
                      : 'text-red-900 dark:text-red-300'
                  }`}>
                    {toast.message}
                  </p>
                  <button 
                    onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                    className={toast.type === 'success' 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                    }
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="max-w-7xl mx-auto">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Point of Sale
                </h1>
                
                {/* ✅ Defect Item Indicator */}
                {defectItem && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                      Defective Item Ready: {defectItem.productName}
                    </span>
                  </div>
                )}
              </div>

              {/* Input Mode Selector */}
              <InputModeSelector 
                mode={inputMode} 
                onModeChange={setInputMode} 
              />

              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Sales By
                  </label>
                  <input 
                    type="text" 
                    value={userRole === 'store_manager' ? userName : 'Admin'} 
                    readOnly 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Employee <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={selectedEmployee} 
                    onChange={(e) => {
                      if (e.target.value === 'add_new') {
                        setShowAddEmployeeModal(true);
                        setSelectedEmployee('');
                      } else {
                        setSelectedEmployee(e.target.value);
                      }
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Employee</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} - {emp.role}
                      </option>
                    ))}
                    <option value="add_new">+ Add New Employee</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Outlet <span className="text-red-500">*</span>
                  </label>
                  <select 
                    value={selectedOutlet} 
                    onChange={(e) => setSelectedOutlet(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Choose an Outlet</option>
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name} - {outlet.address}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white" 
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Product Entry & Cart */}
                <div className="col-span-2 space-y-6">
                  {/* Barcode Scanner Mode */}
                  {inputMode === 'barcode' && (
                    <BarcodeScanner
                      isEnabled={true}
                      selectedOutlet={selectedOutlet}
                      onProductScanned={handleProductScanned}
                      onError={(msg) => showToast(msg, 'error')}
                    />
                  )}

                  {/* Manual Entry Mode */}
                  {inputMode === 'manual' && (
                    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                          Manual Product Entry
                        </h2>
                      </div>
                      <div className="p-4 grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Product
                          </label>
                          <select 
                            value={product} 
                            onChange={(e) => handleProductSelect(e.target.value)} 
                            disabled={!selectedOutlet} 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          >
                            <option value="">Select Product</option>
                            {products.filter(p => p.batches && p.batches.length > 0).map((prod) => (
                              <option key={prod.id} value={prod.name}>
                                {prod.name} ({prod.batches?.length || 0} batches)
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Price
                          </label>
                          <input 
                            type="number" 
                            value={sellingPrice} 
                            onChange={(e) => setSellingPrice(Number(e.target.value))} 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Quantity
                          </label>
                          <input 
                            type="number" 
                            min="1"
                            value={quantity} 
                            onChange={(e) => setQuantity(Number(e.target.value))} 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Discount %
                          </label>
                          <input 
                            type="number" 
                            value={discountPercent} 
                            onChange={(e) => { 
                              setDiscountPercent(Number(e.target.value)); 
                              setDiscountAmount(0); 
                            }} 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Discount ৳
                          </label>
                          <input 
                            type="number" 
                            value={discountAmount} 
                            onChange={(e) => { 
                              setDiscountAmount(Number(e.target.value)); 
                              setDiscountPercent(0); 
                            }} 
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          />
                        </div>

                        <div className="col-span-2 flex justify-end">
                          <button 
                            onClick={addManualProductToCart} 
                            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
                          >
                            Add to Cart
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Customer Details */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Customer Details (Optional)
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Customer Name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Mobile No"
                        value={mobileNo}
                        onChange={(e) => setMobileNo(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                      <input
                        type="text"
                        placeholder="Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                      />
                    </div>
                  </div>

                  {/* Cart Table */}
                  <CartTable
                    items={cart}
                    onRemoveItem={removeFromCart}
                    onUpdateQuantity={updateCartItemQuantity}
                    onUpdateDiscount={updateCartItemDiscount}
                    darkMode={darkMode}
                    vatRate={vatRate}
                  />
                </div>

                {/* Right Column - Payment */}
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 h-fit">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-sm font-medium text-gray-900 dark:text-white">
                      Amount Details
                    </h2>
                  </div>
                  
                  <div className="p-4 space-y-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Sub Total</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        ৳{subtotal.toFixed(2)}
                      </span>
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-700 dark:text-gray-300">Total Discount</span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        ৳{totalDiscount.toFixed(2)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                          VAT
                        </label>
                        <input 
                          type="number" 
                          value={vat.toFixed(2)} 
                          readOnly 
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                          VAT Rate %
                        </label>
                        <input 
                          type="number" 
                          value={vatRate} 
                          onChange={(e) => setVatRate(Number(e.target.value))} 
                          className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                        Transport Cost
                      </label>
                      <input 
                        type="number" 
                        value={transportCost} 
                        onChange={(e) => setTransportCost(Number(e.target.value))} 
                        className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                      />
                    </div>

                    <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-base mb-2">
                        <span className="font-semibold text-gray-900 dark:text-white">Total</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ৳{total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            Cash
                          </label>
                          <input 
                            type="number" 
                            value={cashPaid} 
                            onChange={(e) => setCashPaid(Number(e.target.value))} 
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            Card
                          </label>
                          <input 
                            type="number" 
                            value={cardPaid} 
                            onChange={(e) => setCardPaid(Number(e.target.value))} 
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            bKash
                          </label>
                          <input 
                            type="number" 
                            value={bkashPaid} 
                            onChange={(e) => setBkashPaid(Number(e.target.value))} 
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            Nagad
                          </label>
                          <input 
                            type="number" 
                            value={nagadPaid} 
                            onChange={(e) => setNagadPaid(Number(e.target.value))} 
                            className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" 
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700 dark:text-gray-300">Total Paid</span>
                        <span className="text-gray-900 dark:text-white font-medium">
                          ৳{totalPaid.toFixed(2)}
                        </span>
                      </div>

                      {/* ✅ FIXED: Show change prominently when overpaid */}
                      {change > 0 && (
                        <div className="mb-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-bold text-yellow-900 dark:text-yellow-200">
                              💵 Change to Return
                            </span>
                            <span className="text-lg font-bold text-yellow-700 dark:text-yellow-400">
                              ৳{change.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between text-base">
                        <span className="font-semibold text-gray-900 dark:text-white">Due</span>
                        <span className={`font-bold ${
                          due > 0 
                            ? 'text-red-600 dark:text-red-400' 
                            : 'text-green-600 dark:text-green-400'
                        }`}>
                          ৳{Math.max(0, due).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <button 
                      onClick={handleSell} 
                      disabled={isProcessing || cart.length === 0}
                      className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : 'Complete Sale'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployeeModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 dark:border-gray-800">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                  <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  Add New Employee
                </h2>
              </div>
              <button
                onClick={() => {
                  setShowAddEmployeeModal(false);
                  setNewEmployee({ name: '', email: '', phone: '', role: '' });
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newEmployee.name}
                  onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                  placeholder="Enter employee name"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newEmployee.email}
                  onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                  placeholder="employee@example.com"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Phone <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={newEmployee.phone}
                  onChange={(e) => setNewEmployee({ ...newEmployee, phone: e.target.value })}
                  placeholder="017XXXXXXXX"
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Role <span className="text-red-500">*</span>
                </label>
                <select
                  value={newEmployee.role}
                  onChange={(e) => setNewEmployee({ ...newEmployee, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                >
                  <option value="">Select Role</option>
                  <option value="Sales Executive">Sales Executive</option>
                  <option value="Sales Associate">Sales Associate</option>
                  <option value="Store Assistant">Store Assistant</option>
                  <option value="Cashier">Cashier</option>
                </select>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {
                  setShowAddEmployeeModal(false);
                  setNewEmployee({ name: '', email: '', phone: '', role: '' });
                }}
                className="flex-1 px-4 py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddEmployee}
                className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" />
                Add Employee
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}