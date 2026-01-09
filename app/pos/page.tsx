'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Package,
  Calculator,
  UserPlus,
  Users,
  Download,
  X,
  Loader2,
} from 'lucide-react';
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
import ServiceSelector, { ServiceItem } from '@/components/ServiceSelector';

import { useCustomerLookup } from '@/lib/hooks/useCustomerLookup';
import { checkQZStatus, printReceipt } from '@/lib/qz-tray';

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

// ✅ Extended CartItem interface to support defective items and services
export interface ExtendedCartItem extends CartItem {
  isDefective?: boolean;
  defectId?: string;
  isService?: boolean; // NEW: Flag to identify service items
  serviceId?: number; // NEW: Service ID if it's a service
  serviceCategory?: string; // NEW: Service category
}

export default function POSPage() {
  // UI State
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Printing
  const [autoPrintReceipt, setAutoPrintReceipt] = useState(true);
  const [posReceiptStyle, setPosReceiptStyle] = useState<'compact' | 'detailed'>('compact');
  const [lastCompletedOrderId, setLastCompletedOrderId] = useState<number | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('posAutoPrintReceipt');
      if (saved !== null) setAutoPrintReceipt(saved === '1');
    } catch {
      // ignore
    }
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('posReceiptStyle');
      if (saved === 'compact' || saved === 'detailed') setPosReceiptStyle(saved);
    } catch {
      // ignore
    }
  }, []);



  useEffect(() => {
    try {
      localStorage.setItem('posAutoPrintReceipt', autoPrintReceipt ? '1' : '0');
    } catch {
      // ignore
    }
  }, [autoPrintReceipt]);
  useEffect(() => {
    try {
      localStorage.setItem('posReceiptStyle', posReceiptStyle);
    } catch {
      // ignore
    }
  }, [posReceiptStyle]);



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
  const [isFetchingBatches, setIsFetchingBatches] = useState(false);

  // Customer Info
  const [customerName, setCustomerName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [address, setAddress] = useState('');

  // ✅ Customer lookup (existing customer by phone + last purchase)
  const customerLookup = useCustomerLookup({ debounceMs: 500, minLength: 6 });
  const [autoCustomerId, setAutoCustomerId] = useState<number | null>(null);

  // Keep mobileNo state synced for payload usage (payload still uses mobileNo)
  useEffect(() => {
    if (mobileNo !== customerLookup.phone) {
      setMobileNo(customerLookup.phone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerLookup.phone]);

  // Auto-fill name/address when a customer is found (only when switching customers)
  useEffect(() => {
    const c: any = customerLookup.customer;

    if (c?.id && c.id !== autoCustomerId) {
      setAutoCustomerId(c.id);

      // Update fields to matched customer's info
      setCustomerName(c?.name || '');

      // Address key may vary depending on backend shape
      setAddress(
        c?.address || c?.customer_address || c?.shipping_address || ''
      );
    }

    // If lookup is cleared/not found, stop auto-mode (don't wipe typed fields)
    if (!c?.id && autoCustomerId !== null) {
      setAutoCustomerId(null);
    }
  }, [customerLookup.customer, autoCustomerId]);

  // Payment
  const [transportCost, setTransportCost] = useState(0);
  const [cashPaid, setCashPaid] = useState(0);
  const [cardPaid, setCardPaid] = useState(0);
  const [bkashPaid, setBkashPaid] = useState(0);
  const [nagadPaid, setNagadPaid] = useState(0);

  // Installment / EMI (POS + Social Commerce only)
  const [isInstallment, setIsInstallment] = useState(false);
  const [installmentCount, setInstallmentCount] = useState(3);
  const [installmentPaymentMode, setInstallmentPaymentMode] = useState<'cash' | 'card' | 'bkash' | 'nagad'>('cash');
  const [installmentTransactionReference, setInstallmentTransactionReference] = useState('');

  useEffect(() => {
    // When switching to installment, ignore the regular split inputs
    if (isInstallment) {
      setCashPaid(0);
      setCardPaid(0);
      setBkashPaid(0);
      setNagadPaid(0);
    }
  }, [isInstallment]);

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
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    email: '',
    phone: '',
    role: '',
  });

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
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((toast) => toast.id !== id)),
      5000
    );
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
            showToast(
              'Error: Defect item is missing batch information',
              'error'
            );
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
        showToast(
          'Defect item data not found. Please return to defects page.',
          'error'
        );
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

    setCart((prev) => [...prev, newItem]);
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
    const discountValue =
      discountPercent > 0 ? (baseAmount * discountPercent) / 100 : discountAmount;

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

    setCart((prev) => [...prev, newItem]);
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
    setCart((prev) => prev.filter((item) => item.id !== id));
    showToast('Item removed from cart', 'success');
  };

  /**
   * Update item quantity in cart
   */
  const updateCartItemQuantity = (id: number, newQty: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          // ✅ Prevent quantity changes for defective items
          if (item.isDefective) {
            showToast('Cannot change quantity of defective items', 'error');
            return item;
          }

          if (newQty <= item.availableQty) {
            const baseAmount = item.price * newQty;
            const discountValue =
              item.discount > 0
                ? baseAmount * (item.discount / (item.price * item.qty))
                : 0;

            return {
              ...item,
              qty: newQty,
              amount: baseAmount - discountValue,
            };
          }
        }
        return item;
      })
    );
  };

  /**
   * ✅ NEW: Update item discount in cart
   */
  const updateCartItemDiscount = (id: number, discountValue: number) => {
    setCart((prev) =>
      prev.map((item) => {
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
      })
    );
  };

  /**
   * ✅ NEW: Add service to cart
   */
  const addServiceToCart = (service: ServiceItem) => {
    const newItem: ExtendedCartItem = {
      id: service.id,
      productId: 0, // Services don't have product ID
      productName: service.serviceName,
      batchId: 0, // Services don't have batch ID
      batchNumber: 'SERVICE',
      qty: service.quantity,
      price: service.price,
      discount: 0,
      amount: service.amount,
      availableQty: 999, // Services have unlimited availability
      isService: true,
      serviceId: service.serviceId,
      serviceCategory: service.category,
    };

    setCart((prev) => [...prev, newItem]);
    showToast(`Service "${service.serviceName}" added to cart`, 'success');
  };

  // ============ PRODUCT SELECTION (Manual Mode) ============

  const handleProductSelect = (productName: string) => {
    setProduct(productName);
    const selectedProd = products.find((p) => p.name === productName);

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
  const total = subtotal + transportCost;

  // Installment amount (ceil to 2 decimals so collected amount is not less than required per installment)
  const installmentAmount = useMemo(() => {
    if (!isInstallment) return 0;
    const n = Math.max(2, Math.min(24, Number(installmentCount) || 2));
    if (total <= 0) return 0;
    return Math.ceil((total / n) * 100) / 100;
  }, [isInstallment, installmentCount, total]);

  const installmentPaymentMethodId = useMemo(() => {
    if (!isInstallment) return null;
    if (installmentPaymentMode === 'card') return paymentMethods.card || 2;
    if (installmentPaymentMode === 'bkash' || installmentPaymentMode === 'nagad') return paymentMethods.mobileWallet || 6;
    return paymentMethods.cash || 1;
  }, [isInstallment, installmentPaymentMode, paymentMethods]);

  const totalPaid = isInstallment ? installmentAmount : cashPaid + cardPaid + bkashPaid + nagadPaid;

  // ✅ FIXED: Calculate due and change correctly
  const due = total - totalPaid;
  const change = !isInstallment && totalPaid > total ? totalPaid - total : 0;

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

    // ✅ Confirmation
    if (isInstallment) {
      const n = Math.max(2, Math.min(24, Number(installmentCount) || 2));
      const msg = `Installment/EMI: ${n} × ৳${installmentAmount.toFixed(2)}. First installment will be collected now. Continue?`;
      if (!confirm(msg)) return;
    } else {
      // ✅ FIXED: Only warn if there's actual unpaid balance (not overpayment)
      if (due > 0 && !confirm(`Outstanding amount: ৳${due.toFixed(2)}. Continue?`)) {
        return;
      }
    }

    setIsProcessing(true);

    try {
      console.log('═══════════════════════════════════');
      console.log('📦 PREPARING ORDER');
      console.log('Cart items:', cart.length);
      console.log('Defective items:', cart.filter((i) => i.isDefective).length);
      console.log('Total (product cost):', total.toFixed(2));
      console.log('Total paid:', totalPaid.toFixed(2));
      console.log('Change to return:', change.toFixed(2));
      console.log('═══════════════════════════════════');

      // ✅ Validate all cart items have required fields
      for (const item of cart) {
        // ✅ Skip validation for service items
        if (item.isService) continue;
        
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

      // VAT is inclusive in product prices; do not add extra tax in POS
      const itemsWithTax = cart.map((item) => ({ item, taxAmount: 0 }));

      // Create order payload
      const orderPayload = {
        order_type: 'counter' as const,
        store_id: parseInt(selectedOutlet),
        salesman_id: parseInt(selectedEmployee),

        // ✅ Only add customer if data is provided
        ...(customerName || mobileNo
          ? {
              customer: {
                name: customerName || 'Walk-in Customer',
                phone: mobileNo || '01XXXXXXXXX',
                ...(address ? { address } : {}),
              },
            }
          : {}),

        // ✅ Map cart items (VAT inclusive — send tax_amount = 0)
        items: itemsWithTax
          .filter(({ item }) => !item.isService) // ✅ Filter out service items
          .map(({ item, taxAmount }) => {
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
            tax_amount: taxAmount, // VAT inclusive — no extra tax
          };

          // ✅ CRITICAL: Only include barcode for NON-defective items
          if (!item.isDefective && item.barcode) {
            itemPayload.barcode = item.barcode;
          }

          console.log(`Item ${item.productName}:`, {
            ...itemPayload,
            isDefective: item.isDefective,
            hasBarcode: !!item.barcode,
          });

          return itemPayload;
        }),

        // ✅ NEW: Add services as separate array
        services: itemsWithTax
          .filter(({ item }) => item.isService) // ✅ Filter only service items
          .map(({ item }) => ({
            service_id: item.serviceId,
            service_name: item.productName,
            quantity: item.qty,
            unit_price: item.price,
            discount_amount: item.discount || 0,
            total_amount: item.amount,
            category: item.serviceCategory,
          })),

        // ✅ FIXED: Add totals correctly
        discount_amount: totalDiscount,
        shipping_amount: transportCost,

        // ✅ FIXED: start_date should be undefined instead of null
        ...(isInstallment
          ? {
              installment_plan: {
                total_installments: Math.max(2, Math.min(24, Number(installmentCount) || 2)),
                installment_amount: installmentAmount,
                start_date: undefined, // ✅ Changed from null to undefined
              },
            }
          : {}),

        // ✅ Add notes if any
        ...(address || change > 0
          ? {
              notes: `${address ? `Address: ${address}` : ''}${address && change > 0 ? ', ' : ''}${change > 0 ? `Change Given: ৳${change.toFixed(2)}` : ''}`.trim(),
            }
          : {}),
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
      const defectiveItems = cart.filter((item) => item.isDefective && item.defectId);

      if (defectiveItems.length > 0) {
        console.log('🏷️ Processing', defectiveItems.length, 'defective items...');

        for (const item of defectiveItems) {
          try {
            console.log(`📋 Marking defective ${item.defectId} as sold...`);

            await defectIntegrationService.markDefectiveAsSold(item.defectId!, {
              order_id: order.id,
              selling_price: item.price,
              sale_notes: `Sold via POS - Order #${order.order_number}`,
              sold_at: new Date().toISOString(),
            });

            console.log(`✅ Defective ${item.defectId} marked as sold`);
            showToast(`✓ Defective item recorded: ${item.productName}`, 'success');
          } catch (defectError: any) {
            console.error(`❌ Failed to mark defective ${item.defectId}:`, defectError);
            showToast(
              `Warning: Could not update defect status for ${item.productName}`,
              'error'
            );
          }
        }
      }

      // ✅ Payments
      if (isInstallment) {
        // Create installment plan during order creation, then collect 1st installment now
        if (!installmentPaymentMethodId) {
          throw new Error('Installment payment method is missing');
        }

        if (installmentAmount > 0) {
          console.log('💳 Processing installment/EMI first payment...');
          
          // ✅ FIXED: Remove payment_type field
          await paymentService.addInstallmentPayment(order.id, {
            payment_method_id: installmentPaymentMethodId,
            amount: installmentAmount,
            auto_complete: true,
            notes: `POS installment/EMI - 1st installment of ${Math.max(2, Math.min(24, Number(installmentCount) || 2))}`,
            payment_data: installmentTransactionReference
              ? { transaction_reference: installmentTransactionReference }
              : {},
          });
          console.log('✅ Installment payment processed');
        }
      } else {
        // ✅ FIXED: Process payments - only charge the order total, not overpayment
        const amountToCharge = Math.min(totalPaid, total); // Don't charge more than order total

        if (amountToCharge > 0) {
          console.log('💰 Processing payments...');
          console.log(
            `Amount to charge: ৳${amountToCharge.toFixed(
              2
            )} (Total paid: ৳${totalPaid.toFixed(2)}, Order total: ৳${total.toFixed(2)})`
          );

          const paymentSplits: any[] = [];

          // ✅ FIXED: If there's overpayment, reduce it from cash first
          let adjustedCashPaid = cashPaid;
          let adjustedCardPaid = cardPaid;
          let adjustedBkashPaid = bkashPaid;
          let adjustedNagadPaid = nagadPaid;

          if (change > 0) {
            // Customer overpaid - reduce cash payment by the change amount
            adjustedCashPaid = Math.max(0, cashPaid - change);
            console.log(
              `⚠️ Overpayment detected. Reducing cash from ৳${cashPaid} to ৳${adjustedCashPaid}`
            );
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
      }

      // Complete order
      console.log('🏁 Completing order...');
      await orderService.complete(order.id);
      console.log('✅ Order completed');

      // Remember last order for manual reprint
      setLastCompletedOrderId(order.id);

      // Auto print receipt (non-blocking)
      if (autoPrintReceipt) {
        (async () => {
          try {
            const status = await checkQZStatus();
            if (!status.connected) {
              showToast('QZ Tray offline - opening receipt preview (Print → Save as PDF)', 'error');
            }

            const fullOrder = await orderService.getById(order.id);
            await printReceipt(fullOrder, undefined, { template: posReceiptStyle === 'detailed' ? 'pos_receipt' : 'receipt' });
            showToast('✅ Receipt printed', 'success');
          } catch (e: any) {
            console.error('❌ Receipt auto-print failed:', e);
            showToast(`Receipt print failed: ${e?.message || 'Unknown error'}`, 'error');
          }
        })();
      }

      // ✅ FIXED: Show change message if applicable
      if (change > 0) {
        showToast(
          `✓ Order completed! Change to return: ৳${change.toFixed(2)}`,
          'success'
        );
        alert(
          `Order #${order.order_number} completed!\n\nChange to return to customer: ৳${change.toFixed(
            2
          )}`
        );
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
            return `${fieldName}: ${
              Array.isArray(messages) ? messages.join(', ') : messages
            }`;
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

  const handleReprintLastReceipt = async () => {
    if (!lastCompletedOrderId) {
      showToast('No completed order to print yet', 'error');
      return;
    }

    try {
      const status = await checkQZStatus();
      if (!status.connected) {
        showToast('QZ Tray offline - opening receipt preview (Print → Save as PDF)', 'error');
      }
      const fullOrder = await orderService.getById(lastCompletedOrderId);
      await printReceipt(fullOrder, undefined, { template: posReceiptStyle === 'detailed' ? 'pos_receipt' : 'receipt' });
      showToast('✅ Receipt printed', 'success');
    } catch (e: any) {
      console.error('❌ Receipt print failed:', e);
      showToast(`Receipt print failed: ${e?.message || 'Unknown error'}`, 'error');
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
    setAutoCustomerId(null);

    // ✅ Clear lookup input + last order UI as well
    (customerLookup as any)?.clear?.();
    if (!(customerLookup as any)?.clear && (customerLookup as any)?.setPhone) {
      (customerLookup as any).setPhone('');
    }
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

      // ✅ FIXED: Handle response type correctly
      if (!response || (typeof response === 'object' && 'success' in response && !response.success)) {
        showToast('Failed to load stores', 'error');
        return;
      }

      let stores: any[] = [];
      
      // ✅ Type guard to safely access data property
      if (Array.isArray(response)) {
        stores = response;
      } else if (typeof response === 'object' && 'data' in response) {
        const responseData = (response as any).data;
        if (Array.isArray(responseData)) {
          stores = responseData;
        } else if (responseData?.data && Array.isArray(responseData.data)) {
          stores = responseData.data;
        } else if (typeof responseData === 'object') {
          stores = [responseData];
        }
      }

      setOutlets(stores);

      if (storeId && stores.length > 0) {
        const userStore = stores.find(
          (store: Store) => String(store.id) === String(storeId)
        );
        if (userStore) {
          setSelectedOutlet(String(userStore.id));
        }
      }
    } catch (error) {
      console.error('Error fetching outlets:', error);
      showToast('Failed to load stores', 'error');
    }
  };

  // ✅ FIXED: Don't fetch batches for all products upfront to avoid rate limiting
  const fetchProducts = async () => {
    if (!selectedOutlet) return;

    try {
      console.log('🔄 Fetching products and batches for store:', selectedOutlet);

      let allBatches: Batch[] = [];

      // ✅ ROBUST: Try multiple batch fetching methods with fallbacks (like social commerce)
      
      // Method 1: Try getAvailableBatches
      try {
        const batchesData = await batchService.getAvailableBatches(parseInt(selectedOutlet));
        console.log('✅ Raw batches from getAvailableBatches:', batchesData);

        if (batchesData && batchesData.length > 0) {
          allBatches = batchesData.filter((batch: any) => batch.quantity > 0);
          console.log('✅ Fetched', allBatches.length, 'batches (method: getAvailableBatches)');
        }
      } catch (err) {
        console.warn('⚠️ getAvailableBatches failed, trying getBatchesArray...', err);
      }

      // Method 2: Try getBatchesArray if Method 1 failed
      if (allBatches.length === 0) {
        try {
          const batchesData = await batchService.getBatchesArray({
            store_id: parseInt(selectedOutlet),
            status: 'available',
          });
          console.log('✅ Raw batches from getBatchesArray:', batchesData);

          if (batchesData && batchesData.length > 0) {
            allBatches = batchesData.filter((batch: any) => batch.quantity > 0);
            console.log('✅ Fetched', allBatches.length, 'batches (method: getBatchesArray)');
          }
        } catch (err) {
          console.warn('⚠️ getBatchesArray failed, trying getBatchesByStore...', err);
        }
      }

      // Method 3: Try getBatchesByStore if Method 2 failed
      if (allBatches.length === 0) {
        try {
          const batchesData = await batchService.getBatchesByStore(parseInt(selectedOutlet));
          console.log('✅ Raw batches from getBatchesByStore:', batchesData);

          if (batchesData && batchesData.length > 0) {
            allBatches = batchesData.filter((batch: any) => batch.quantity > 0);
            console.log('✅ Fetched', allBatches.length, 'batches (method: getBatchesByStore)');
          }
        } catch (err) {
          console.warn('⚠️ getBatchesByStore failed, trying getBatches...', err);
        }
      }

      // Method 4: Fall back to getBatches (standard method) if all else failed
      if (allBatches.length === 0) {
        try {
          const batchResponse = await batchService.getBatches({
            store_id: parseInt(selectedOutlet),
            status: 'available',
            per_page: 5000,
          });

          allBatches = batchResponse.success && batchResponse.data?.data
            ? batchResponse.data.data.filter((batch: Batch) => batch.quantity > 0)
            : [];
          
          console.log('✅ Fetched', allBatches.length, 'batches (method: getBatches)');
        } catch (err) {
          console.error('❌ All batch fetch methods failed:', err);
          showToast('Failed to load product batches', 'error');
          return;
        }
      }

      if (allBatches.length === 0) {
        console.log('⚠️ No batches found for store:', selectedOutlet);
        setProducts([]);
        showToast('No products available in this store', 'error');
        return;
      }

      // ✅ Group batches by product_id
      const batchesByProduct = new Map<number, Batch[]>();
      allBatches.forEach((batch: any) => {
        const productId = batch.product?.id || batch.product_id;
        if (productId) {
          if (!batchesByProduct.has(productId)) {
            batchesByProduct.set(productId, []);
          }
          batchesByProduct.get(productId)!.push(batch);
        }
      });

      console.log('✅ Batches grouped for', batchesByProduct.size, 'products');

      // ✅ Fetch all products
      const result = await productService.getAll({
        is_archived: false,
        per_page: 1000,
      });

      let productsList: Product[] = [];

      if (Array.isArray(result)) {
        productsList = result;
      } else if (result?.data) {
        productsList = Array.isArray(result.data) ? result.data : result.data.data || [];
      }

      console.log('✅ Fetched', productsList.length, 'products');

      // ✅ Attach batches to products (no additional API calls!)
      const productsWithBatches = productsList.map((product: Product) => {
        const batches = batchesByProduct.get(product.id) || [];
        return { ...product, batches };
      });

      // ✅ Only show products that have batches in this store
      const productsWithStock = productsWithBatches.filter(
        (product) => product.batches && product.batches.length > 0
      );

      console.log('✅ Final products with stock:', productsWithStock.length);

      setProducts(productsWithStock);
    } catch (error) {
      console.error('❌ Error fetching products:', error);
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
  }, []); // ✅ Only run once on mount

  // ✅ FIXED: Only fetch products when outlet changes, not on every render
  useEffect(() => {
    if (selectedOutlet) {
      fetchProducts();
    }
  }, [selectedOutlet]); // ✅ Only depend on selectedOutlet

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
                  <p
                    className={`text-sm font-medium ${
                      toast.type === 'success'
                        ? 'text-green-900 dark:text-green-300'
                        : 'text-red-900 dark:text-red-300'
                    }`}
                  >
                    {toast.message}
                  </p>
                  <button
                    onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                    className={
                      toast.type === 'success'
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
              <InputModeSelector mode={inputMode} onModeChange={setInputMode} />

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
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                          >
                            <option value="">Select Product</option>
                            {products
                              .filter((p) => p.batches && p.batches.length > 0)
                              .map((prod) => (
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

                      {/* ✅ Mobile uses hook (auto lookup) */}
                      <input
                        type="text"
                        placeholder="Mobile No"
                        value={customerLookup.phone}
                        onChange={(e) => customerLookup.setPhone(e.target.value)}
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

                    {/* ✅ Existing customer + last purchase UI */}
                    {(customerLookup.loading ||
                      customerLookup.error ||
                      customerLookup.customer) && (
                      <div className="mt-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3">
                        {customerLookup.loading && (
                          <div className="text-xs text-gray-600 dark:text-gray-300">
                            Checking customer…
                          </div>
                        )}

                        {customerLookup.error && (
                          <div className="text-xs text-red-600 dark:text-red-400">
                            {customerLookup.error}
                          </div>
                        )}

                        {customerLookup.customer && (
                          <div className="space-y-1">
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">
                              Existing Customer:{' '}
                              {(customerLookup.customer as any)?.name || '—'}
                            </div>

                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              Phone:{' '}
                              {(customerLookup.customer as any)?.phone ||
                                customerLookup.phone}
                            </div>

                            {Array.isArray((customerLookup.customer as any)?.tags) &&
                              (customerLookup.customer as any).tags.length > 0 && (
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {(customerLookup.customer as any).tags.map((tag: string) => (
                                    <span
                                      key={tag}
                                      className="px-2 py-0.5 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-[10px] font-medium text-gray-700 dark:text-gray-200"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}

                            {customerLookup.lastOrder && (
                              <div className="text-xs text-gray-600 dark:text-gray-300 pt-1">
                                <div>
                                  Last purchase:{' '}
                                  {(customerLookup.lastOrder as any)?.last_order_date ||
                                    '—'}
                                </div>
                                <div>
                                  Total: ৳
                                  {Number(
                                    (customerLookup.lastOrder as any)?.last_order_total ??
                                      0
                                  ).toFixed(2)}
                                  {' • '}
                                  Items:{' '}
                                  {(customerLookup.lastOrder as any)
                                    ?.last_order_items_count ?? '—'}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ✅ NEW: Service Selector */}
                  <ServiceSelector 
                    onAddService={addServiceToCart}
                    darkMode={darkMode}
                    allowManualPrice={true}
                  />

                  {/* Cart Table */}
                  <CartTable
                    items={cart}
                    onRemoveItem={removeFromCart}
                    onUpdateQuantity={updateCartItemQuantity}
                    onUpdateDiscount={updateCartItemDiscount}
                    darkMode={darkMode}
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
                      <span className="text-gray-700 dark:text-gray-300">
                        Total Discount
                      </span>
                      <span className="text-gray-900 dark:text-white font-medium">
                        ৳{totalDiscount.toFixed(2)}
                      </span>
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
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Total
                        </span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ৳{total.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                          <input
                            type="checkbox"
                            checked={isInstallment}
                            onChange={(e) => setIsInstallment(e.target.checked)}
                            className="h-4 w-4"
                          />
                          Installment / EMI
                        </label>
                      </div>

                      {isInstallment && (
                        <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 p-3 space-y-2">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Total installments</label>
                              <input
                                type="number"
                                min={2}
                                max={24}
                                value={installmentCount}
                                onChange={(e) => setInstallmentCount(Number(e.target.value))}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Paying now</label>
                              <div className="w-full px-2 py-1.5 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-semibold text-gray-900 dark:text-white">
                                ৳{installmentAmount.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Payment method</label>
                              <select
                                value={installmentPaymentMode}
                                onChange={(e) => setInstallmentPaymentMode(e.target.value as any)}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                              >
                                <option value="cash">Cash</option>
                                <option value="card">Card</option>
                                <option value="bkash">bKash</option>
                                <option value="nagad">Nagad</option>
                              </select>
                            </div>
                            <div>
                              <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Txn ref (optional)</label>
                              <input
                                value={installmentTransactionReference}
                                onChange={(e) => setInstallmentTransactionReference(e.target.value)}
                                className="w-full px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                                placeholder="e.g. Txn ID"
                              />
                            </div>
                          </div>

                          <p className="text-[11px] text-gray-600 dark:text-gray-300">
                            Remaining after today: <span className="font-semibold">৳{Math.max(0, total - installmentAmount).toFixed(2)}</span>
                          </p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            Cash
                          </label>
                          <input
                            type="number"
                            value={cashPaid}
                            onChange={(e) => setCashPaid(Number(e.target.value))}
                            disabled={isProcessing || isInstallment}
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
                            disabled={isProcessing || isInstallment}
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
                            disabled={isProcessing || isInstallment}
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
                            disabled={isProcessing || isInstallment}
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
                        <span className="font-semibold text-gray-900 dark:text-white">
                          Due
                        </span>
                        <span
                          className={`font-bold ${
                            due > 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-green-600 dark:text-green-400'
                          }`}
                        >
                          ৳{Math.max(0, due).toFixed(2)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-3">
                      <label className="flex items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
                        <input
                          type="checkbox"
                          checked={autoPrintReceipt}
                          onChange={(e) => setAutoPrintReceipt(e.target.checked)}
                          className="h-4 w-4"
                        />
                        Auto-print receipt
                      </label>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-600 dark:text-gray-400">Receipt style</span>
                        <select
                          value={posReceiptStyle}
                          onChange={(e) => setPosReceiptStyle(e.target.value as any)}
                          className="text-xs rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-gray-800 dark:text-gray-100"
                          title="Choose receipt print format"
                        >
                          <option value="compact">Compact</option>
                          <option value="detailed">Detailed (RISE-style)</option>
                        </select>
                      </div>


                      {lastCompletedOrderId && (
                        <button
                          type="button"
                          onClick={handleReprintLastReceipt}
                          className="text-xs px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200"
                        >
                          Reprint last receipt
                        </button>
                      )}
                    </div>

                    <button
                      onClick={handleSell}
                      disabled={isProcessing || cart.length === 0}
                      className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 dark:bg-white dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-md text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessing ? 'Processing...' : isInstallment ? 'Complete Sale (Installment)' : 'Complete Sale'}
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
