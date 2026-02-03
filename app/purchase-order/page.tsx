'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Plus, Eye, Check, Package, FileText, Loader2, AlertCircle, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import GroupedAllBarcodesPrinter, { BatchBarcodeSource } from '@/components/GroupedAllBarcodesPrinter';
import { renderBarcodeLabelBase64 } from '@/components/MultiBarcodePrinter';
import { barcodeTrackingService } from '@/services/barcodeTrackingService';
import purchaseOrderService, { 
  PurchaseOrder, 
  ReceiveItemData,
  PurchaseOrderFilters 
} from '@/services/purchase-order.service';
import { vendorService, Vendor } from '@/services/vendorService';
import { productService, Product } from '@/services/productService';

// --- Image helpers (same approach as Orders page) ---
const getApiBaseUrl = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  return raw.replace(/\/api\/?$/, '').replace(/\/$/, '');
};

const toPublicImageUrl = (imagePath?: string | null) => {
  if (!imagePath) return null;
  const p = String(imagePath);
  if (!p) return null;
  if (p.startsWith('http')) return p;
  if (p.startsWith('/storage/')) return `${getApiBaseUrl()}${p}`;
  if (p.startsWith('storage/')) return `${getApiBaseUrl()}/${p}`;
  return `${getApiBaseUrl()}/storage/${p.replace(/^\//, '')}`;
};

const pickPOItemImage = (item: any): string | null => {
  const direct =
    item?.product_image ||
    item?.image_url ||
    item?.image ||
    item?.thumbnail ||
    item?.product?.image_url ||
    item?.product?.image_path ||
    item?.product?.image ||
    item?.product?.thumbnail;

  if (direct) return toPublicImageUrl(direct);

  const imgs: any[] = item?.product?.images || item?.images || item?.product_images || item?.product?.product_images || [];
  if (Array.isArray(imgs) && imgs.length > 0) {
    const primary = imgs.find((x) => x?.is_primary && x?.is_active) || imgs.find((x) => x?.is_primary) || imgs[0];
    const path = primary?.image_url || primary?.image_path || primary?.url;
    return toPublicImageUrl(path);
  }

  return null;
};

const pickProductImage = (p: any): string | null => {
  if (!p) return null;
  const direct = p?.image_url || p?.image_path || p?.image || p?.thumbnail;
  if (direct) return toPublicImageUrl(direct);

  const imgs: any[] = p?.images || p?.product_images || [];
  if (Array.isArray(imgs) && imgs.length > 0) {
    const primary = imgs.find((x) => x?.is_primary && x?.is_active) || imgs.find((x) => x?.is_primary) || imgs[0];
    const path = primary?.image_url || primary?.image_path || primary?.url || primary?.image;
    return toPublicImageUrl(path);
  }

  return null;
};

// Utility function to safely format currency
const formatCurrency = (value: any): string => {
  if (value === null || value === undefined || value === '') return '0.00';
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  return isNaN(numValue) ? '0.00' : numValue.toFixed(2);
};

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'md' | 'lg' | 'xl' | '2xl';
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    'md': 'max-w-md',
    'lg': 'max-w-lg',
    'xl': 'max-w-4xl',
    '2xl': 'max-w-6xl'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-y-auto p-4">
      <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
};

const Alert = ({ type, message }: { type: 'success' | 'error'; message: string }) => (
  <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
    type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
  }`}>
    <AlertCircle className="w-5 h-5" />
    <span>{message}</span>
  </div>
);

const StatusBadge = ({ status }: { status: string }) => {
  const colors = {
    draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    approved: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    partially_received: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    received: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  };

  const color = colors[status as keyof typeof colors] || colors.draft;

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

const PaymentStatusBadge = ({ status }: { status: string }) => {
  const colors = {
    unpaid: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    partially_paid: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    paid: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
  };

  const color = colors[status as keyof typeof colors] || colors.unpaid;

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
};

export default function PurchaseOrdersPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // ✅ Image preview (same UX as Orders page)
  const [imagePreview, setImagePreview] = useState<{ url: string; name: string } | null>(null);

  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [pagination, setPagination] = useState<{
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number;
    to: number;
  }>({ current_page: 1, last_page: 1, per_page: 50, total: 0, from: 0, to: 0 });
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [expandedPO, setExpandedPO] = useState<number | null>(null);

  // ✅ Barcode Center (Print ALL unit-level barcodes for a PO)
  const poBarcodeSources: BatchBarcodeSource[] = useMemo(() => {
    const items = (selectedPO?.items ?? []) as any[];
    if (!Array.isArray(items) || items.length === 0) return [];

    const toNumber = (v: any) => {
      if (v === null || v === undefined || v === '') return 0;
      const n = typeof v === 'string' ? Number(String(v).replace(/,/g, '')) : Number(v);
      return Number.isFinite(n) ? n : 0;
    };

    const out: BatchBarcodeSource[] = [];

    for (const it of items) {
      // Backend may return different shapes; keep it defensive.
      const pb = it?.productBatch || it?.product_batch || it?.batch || it?.product_batch_data;
      const batchId = pb?.id;
      if (!batchId) continue;

      const productName =
        it?.product_name ||
        it?.product?.name ||
        pb?.product?.name ||
        it?.product_sku ||
        'Product';

      // Prefer sell price if provided by PO receive flow; otherwise fallback.
      const price = toNumber(it?.unit_sell_price ?? pb?.sell_price ?? it?.unit_cost ?? 0);

      const fallbackCode =
        pb?.barcode?.barcode ||
        pb?.barcode ||
        pb?.primary_barcode ||
        pb?.batch_number;

      out.push({
        batchId: Number(batchId),
        productName: String(productName),
        price,
        fallbackCode: fallbackCode ? String(fallbackCode) : undefined,
      });
    }

    return out;
  }, [selectedPO]);

  // ✅ Per-batch / per-barcode printing UI helpers (inside PO details modal)
  const [expandedBatchIds, setExpandedBatchIds] = useState<Record<number, boolean>>({});
  const [batchBarcodeCache, setBatchBarcodeCache] = useState<
    Record<number, { loading: boolean; codes: string[]; error?: string }>
  >({});

  const toggleBatchBarcodes = async (source: BatchBarcodeSource) => {
    const batchId = Number(source.batchId);
    if (!batchId) return;

    setExpandedBatchIds((prev) => ({ ...prev, [batchId]: !prev[batchId] }));

    // If we're collapsing, no need to fetch
    const willExpand = !expandedBatchIds[batchId];
    if (!willExpand) return;

    // Already loaded
    if (batchBarcodeCache[batchId]?.codes?.length) return;
    if (batchBarcodeCache[batchId]?.loading) return;

    setBatchBarcodeCache((prev) => ({
      ...prev,
      [batchId]: { loading: true, codes: [], error: undefined },
    }));

    try {
      const res = await barcodeTrackingService.getBatchBarcodes(batchId);
      const codes = (res.data?.barcodes || [])
        .filter((b) => b.is_active)
        .map((b) => String(b.barcode))
        .filter(Boolean);

      // Fallback to primary barcode if no per-unit barcodes exist
      const finalCodes = codes.length ? codes : source.fallbackCode ? [String(source.fallbackCode)] : [];

      setBatchBarcodeCache((prev) => ({
        ...prev,
        [batchId]: { loading: false, codes: finalCodes, error: undefined },
      }));
    } catch (e: any) {
      console.error('Failed to fetch batch barcodes:', batchId, e);
      setBatchBarcodeCache((prev) => ({
        ...prev,
        [batchId]: { loading: false, codes: [], error: e?.message || 'Failed to load barcodes' },
      }));
    }
  };

  const quickPrintSingleBarcode = async (params: { barcode: string; productName: string; price: number }) => {
    try {
      const qz = (window as any)?.qz;
      if (!qz) throw new Error('QZ Tray not available');

      if (!(await qz.websocket.isActive())) {
        await qz.websocket.connect();
      }

      // Pick default printer (fallback to first available)
      let printer: string | null = null;
      try {
        printer = await qz.printers.getDefault();
      } catch (e) {
        const list = await qz.printers.find();
        if (Array.isArray(list) && list.length) printer = list[0];
      }
      if (!printer) throw new Error('No printer found. Set a default printer and try again.');

      const LABEL_W_MM = 39;
      const LABEL_H_MM = 25;
      const DPI = 300;
      const mmToIn = (mm: number) => mm / 25.4;

      const base64 = await renderBarcodeLabelBase64({
        code: params.barcode,
        productName: params.productName,
        price: params.price,
        dpi: DPI,
      });

      const config = qz.configs.create(printer, {
        units: 'in',
        size: { width: mmToIn(LABEL_W_MM), height: mmToIn(LABEL_H_MM) },
        margins: { top: 0, right: 0, bottom: 0, left: 0 },
        density: DPI,
        colorType: 'blackwhite',
        interpolation: 'nearest-neighbor',
        scaleContent: false,
      });

      const data: any[] = [{ type: 'pixel', format: 'image', flavor: 'base64', data: base64 }];
      await qz.print(config, data);
    } catch (err: any) {
      console.error('Single barcode print failed:', err);
      alert(err?.message || 'Failed to print barcode');
    }
  };

  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState<PurchaseOrderFilters>({
    vendor_id: undefined,
    status: '',
    payment_status: '',
    search: '',
    // ✅ backend seems to default to a very small page size in some environments
    // so we force a sane default here.
    per_page: 50,
    page: 1,
  });


  // Receive form
  const [receiveForm, setReceiveForm] = useState<{
    items: Array<{
      item_id: number;
      quantity_received: string;
      batch_number: string;
      manufactured_date: string;
      expiry_date: string;
    }>;
  }>({
    items: []
  });

  // Edit Purchase Order
  const [showEditModal, setShowEditModal] = useState(false);
  const [editPO, setEditPO] = useState<PurchaseOrder | null>(null);
  const [editForm, setEditForm] = useState<{
    tax_amount: string;
    discount_amount: string;
    shipping_cost: string;
    notes: string;
    items: Array<{
      id: number;
      product_label: string;
      quantity_ordered: string;
      unit_cost: string;
      unit_sell_price: string;
    }>;
    new_items: Array<{
      temp_id: number;
      product_id: number;
      product_label: string;
      quantity_ordered: string;
      unit_cost: string;
      unit_sell_price: string;
      product?: Product;
    }>;
  }>({
    tax_amount: '0',
    discount_amount: '0',
    shipping_cost: '0',
    notes: '',
    items: [],
    new_items: [],
  });

  // Add more products in PO Edit
  const [editProductSearch, setEditProductSearch] = useState('');
  const [editProductResults, setEditProductResults] = useState<Product[]>([]);
  const [editProductSearching, setEditProductSearching] = useState(false);

  const [editOriginal, setEditOriginal] = useState<{
    tax_amount: number;
    discount_amount: number;
    shipping_cost: number;
    notes: string;
    items: Record<number, { quantity_ordered: number; unit_cost: number; unit_sell_price: number }>;
  } | null>(null);


  useEffect(() => {
    loadPurchaseOrders();
    loadVendors();
  }, []);

  useEffect(() => {
    loadPurchaseOrders();
  }, [filters.vendor_id, filters.status, filters.payment_status, filters.page, filters.per_page]);

  // 🔎 Live product search inside PO edit (debounced)
  useEffect(() => {
    if (!showEditModal || !editPO) return;

    const q = editProductSearch.trim();
    if (!q) {
      setEditProductResults([]);
      return;
    }

    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        setEditProductSearching(true);
        const res = await productService.advancedSearch({
          query: q,
          vendor_id: editPO.vendor_id,
          is_archived: false,
          enable_fuzzy: true,
          fuzzy_threshold: 60,
          search_fields: ['name', 'sku', 'description', 'category', 'custom_fields'],
          per_page: 15,
        });
        if (!cancelled) setEditProductResults(Array.isArray(res?.items) ? res.items : []);
      } catch {
        if (!cancelled) setEditProductResults([]);
      } finally {
        if (!cancelled) setEditProductSearching(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [editProductSearch, showEditModal, editPO]);

  const showAlert = (type: 'success' | 'error', message: string) => {
    setAlert({ type, message });
    setTimeout(() => setAlert(null), 3000);
  };

  const updateFilters = (
  partial: Partial<PurchaseOrderFilters>,
  opts?: { resetPage?: boolean }
) => {
  const resetPage = opts?.resetPage ?? true;

  setFilters((prev) => ({
      ...prev,
      ...partial,
      // reset to page 1 by default when changing filters,
      // BUT do not override page if caller explicitly sets it
      ...(resetPage && !('page' in partial) ? { page: 1 } : {}),
    }));
  };


  const loadPurchaseOrders = async () => {
    try {
      setLoading(true);
      const response = await purchaseOrderService.getAll(filters);

      // Support both paginated and non-paginated shapes
      const paginated = (response as any)?.data && !Array.isArray((response as any).data) ? (response as any).data : null;
      const list = Array.isArray(paginated?.data)
        ? paginated.data
        : Array.isArray(paginated?.data?.data)
          ? paginated.data.data
          : Array.isArray((response as any)?.data)
            ? (response as any).data
            : Array.isArray((response as any)?.data?.data)
              ? (response as any).data.data
              : [];

      setPurchaseOrders(Array.isArray(list) ? list : []);

      // Try to keep pagination meta if available
      const meta = paginated;
      if (meta && typeof (meta as any).current_page === 'number') {
        setPagination({
          current_page: (meta as any).current_page ?? 1,
          last_page: (meta as any).last_page ?? 1,
          per_page: (meta as any).per_page ?? (filters.per_page ?? 50),
          total: (meta as any).total ?? 0,
          from: (meta as any).from ?? 0,
          to: (meta as any).to ?? 0,
        });
      } else {
        // If backend doesn't paginate, just derive a simple meta
        setPagination((prev) => ({
          ...prev,
          current_page: 1,
          last_page: 1,
          total: Array.isArray(list) ? list.length : 0,
          from: Array.isArray(list) && list.length ? 1 : 0,
          to: Array.isArray(list) ? list.length : 0,
        }));
      }
    } catch (error: any) {
      console.error('Failed to load purchase orders:', error);
      setPurchaseOrders([]);
      showAlert('error', error.message || 'Failed to load purchase orders');
    } finally {
      setLoading(false);
    }
  };

  const loadVendors = async () => {
    try {
      const data = await vendorService.getAll({ is_active: true });
      setVendors(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Failed to load vendors:', error);
      setVendors([]);
    }
  };

  const handleViewPO = async (po: PurchaseOrder) => {
    try {
      setLoading(true);
      const res = await purchaseOrderService.getById(po.id);

      // ✅ unwrap ApiResponse
      const fullPO: PurchaseOrder = (res as any)?.data?.data ?? (res as any)?.data ?? po;

      setSelectedPO(fullPO);
      setShowViewModal(true);
    }  catch (error: any) {
      showAlert('error', 'Failed to load purchase order details');
    } finally {
      setLoading(false);
    }
  };


  const handleApprovePO = async (id: number) => {
    if (!confirm('Are you sure you want to approve this purchase order?')) return;

    try {
      setLoading(true);
      await purchaseOrderService.approve(id);
      showAlert('success', 'Purchase order approved successfully');
      loadPurchaseOrders();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to approve purchase order');
    } finally {
      setLoading(false);
    }
  };

  const openReceiveModal = async (po: PurchaseOrder) => {
  try {
    setLoading(true);
    const res = await purchaseOrderService.getById(po.id);

    const fullPO: PurchaseOrder = (res as any)?.data?.data ?? (res as any)?.data ?? po;
    setSelectedPO(fullPO);

    const items = (fullPO.items ?? []).map((item: any) => {
      const ordered = Number(item.quantity_ordered ?? 0);
      const received = Number(item.quantity_received ?? 0);
      const remaining = Math.max(0, ordered - received);

      return {
        item_id: item.id || 0,
        quantity_received: String(remaining),
        batch_number: '',
        manufactured_date: '',
        expiry_date: '',
      };
    });

    setReceiveForm({ items });
    setShowReceiveModal(true);
  } catch (error: any) {
    showAlert('error', 'Failed to load purchase order details');
  } finally {
    setLoading(false);
  }
};


  const openEditModal = async (po: PurchaseOrder) => {
  try {
    setLoading(true);

    const res = await purchaseOrderService.getById(po.id);
    const fullPO: PurchaseOrder = (res as any)?.data?.data ?? (res as any)?.data ?? po;

    const items = (fullPO.items ?? []).map((it: any) => ({
      id: it.id,
      product_label: it.product?.name
        ? `${it.product.name}${it.product.sku ? ` (${it.product.sku})` : ''}`
        : `Item #${it.id}`,
      quantity_ordered: String(it.quantity_ordered ?? 0),
      unit_cost: String(it.unit_cost ?? 0),
      unit_sell_price: String(it.unit_sell_price ?? 0),
    }));

    const originalItems: Record<number, { quantity_ordered: number; unit_cost: number; unit_sell_price: number }> = {};
    (fullPO.items ?? []).forEach((it: any) => {
      originalItems[it.id] = {
        quantity_ordered: Number(it.quantity_ordered ?? 0),
        unit_cost: Number(it.unit_cost ?? 0),
        unit_sell_price: Number(it.unit_sell_price ?? 0),
      };
    });

    setEditPO(fullPO);
    setEditForm({
      tax_amount: String((fullPO as any).tax_amount ?? 0),
      discount_amount: String((fullPO as any).discount_amount ?? 0),
      shipping_cost: String((fullPO as any).shipping_cost ?? 0),
      notes: String((fullPO as any).notes ?? ''),
      items,
      new_items: [],
    });

    setEditOriginal({
      tax_amount: Number((fullPO as any).tax_amount ?? 0),
      discount_amount: Number((fullPO as any).discount_amount ?? 0),
      shipping_cost: Number((fullPO as any).shipping_cost ?? 0),
      notes: String((fullPO as any).notes ?? ''),
      items: originalItems,
    });

    setEditProductSearch('');
    setEditProductResults([]);

    setShowEditModal(true);
  } catch (error) {
    console.error('Error loading PO for edit:', error);
    showAlert('error', 'Failed to load purchase order for editing');
  } finally {
    setLoading(false);
  }
};


  const handleSaveEditPO = async () => {
    if (!editPO) return;

    try {
      setLoading(true);

      const tax = parseFloat(editForm.tax_amount || '0') || 0;
      const discount = parseFloat(editForm.discount_amount || '0') || 0;
      const shipping = parseFloat(editForm.shipping_cost || '0') || 0;
      const notes = String(editForm.notes || '');

      await purchaseOrderService.update(editPO.id, {
        tax_amount: tax,
        discount_amount: discount,
        shipping_cost: shipping,
        notes,
      });

      if (editOriginal) {
        for (const it of editForm.items) {
          const qty = parseInt(it.quantity_ordered || '0', 10) || 0;
          const cost = parseFloat(it.unit_cost || '0') || 0;
          const sell = parseFloat(it.unit_sell_price || '0') || 0;
          const orig = editOriginal.items[it.id];

          if (!orig || orig.quantity_ordered !== qty || Number(orig.unit_cost) !== cost || Number(orig.unit_sell_price) !== sell) {
            await purchaseOrderService.updateItem(editPO.id, it.id, {
              quantity_ordered: qty,
              unit_cost: cost,
              unit_sell_price: sell,
            });
          }
        }
      }

      // Add any newly appended products
      if (Array.isArray(editForm.new_items) && editForm.new_items.length > 0) {
        for (const ni of editForm.new_items) {
          const pid = Number(ni.product_id);
          if (!pid) continue;

          const qty = parseInt(ni.quantity_ordered || '0', 10) || 0;
          if (qty <= 0) continue;

          const cost = parseFloat(ni.unit_cost || '0') || 0;
          const sell = parseFloat(ni.unit_sell_price || '0') || 0;

          await purchaseOrderService.addItem(editPO.id, {
            product_id: pid,
            quantity_ordered: qty,
            unit_cost: cost,
            unit_sell_price: sell,
          });
        }
      }

      showAlert('success', 'Purchase order updated successfully');
      setShowEditModal(false);
      setEditPO(null);
      await loadPurchaseOrders();
    } catch (error: any) {
      console.error('Error updating PO:', error);
      showAlert('error', error?.response?.data?.message || 'Failed to update purchase order');
    } finally {
      setLoading(false);
    }
  };

  const appendProductToEdit = (p: Product) => {
    if (!p || !p.id) return;

    // Prevent adding duplicates (already in PO items)
    const existing = (editPO?.items ?? []).some((it: any) => Number(it?.product_id) === Number(p.id));
    if (existing) {
      showAlert('error', 'This product is already in the PO');
      return;
    }

    const foundIdx = editForm.new_items.findIndex((x) => Number(x.product_id) === Number(p.id));
    if (foundIdx >= 0) {
      // If already in new-items, just increment qty
      setEditForm((prev) => ({
        ...prev,
        new_items: prev.new_items.map((x, i) => {
          if (i !== foundIdx) return x;
          const q = parseInt(x.quantity_ordered || '0', 10) || 0;
          return { ...x, quantity_ordered: String(q + 1) };
        }),
      }));
      return;
    }

    const label = `${p.name}${p.sku ? ` (${p.sku})` : ''}`;
    setEditForm((prev) => ({
      ...prev,
      new_items: [
        ...prev.new_items,
        {
          temp_id: Date.now() + Math.floor(Math.random() * 100000),
          product_id: p.id,
          product_label: label,
          quantity_ordered: '1',
          unit_cost: '0',
          unit_sell_price: '0',
          product: p,
        },
      ],
    }));
  };

  const removeEditNewItem = (tempId: number) => {
    setEditForm((prev) => ({
      ...prev,
      new_items: prev.new_items.filter((x) => x.temp_id !== tempId),
    }));
  };



  const handleReceivePO = async () => {
    if (!selectedPO) return;

    // Validate that at least one item has quantity
    const hasItems = receiveForm.items.some(item => 
      item.quantity_received && parseFloat(item.quantity_received) > 0
    );

    if (!hasItems) {
      showAlert('error', 'Please enter quantity received for at least one item');
      return;
    }

    try {
      setLoading(true);

      const receiveData: { items: ReceiveItemData[] } = {
        items: receiveForm.items
          .filter(item => item.quantity_received && parseFloat(item.quantity_received) > 0)
          .map(item => ({
            item_id: item.item_id,
            quantity_received: parseInt(item.quantity_received),
            batch_number: item.batch_number || undefined,
            manufactured_date: item.manufactured_date || undefined,
            expiry_date: item.expiry_date || undefined
          }))
      };

      await purchaseOrderService.receive(selectedPO.id, receiveData);
      showAlert('success', 'Products received successfully');
      setShowReceiveModal(false);
      loadPurchaseOrders();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to receive products');
    } finally {
      setLoading(false);
    }
  };

  const updateReceiveItem = (index: number, field: string, value: string) => {
    const newItems = [...receiveForm.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setReceiveForm({ items: newItems });
  };

  const handleCancelPO = async (id: number) => {
    const reason = prompt('Enter cancellation reason (optional):');
    if (reason === null) return; // User clicked cancel

    try {
      setLoading(true);
      await purchaseOrderService.cancel(id, reason);
      showAlert('success', 'Purchase order cancelled successfully');
      loadPurchaseOrders();
    } catch (error: any) {
      showAlert('error', error.message || 'Failed to cancel purchase order');
    } finally {
      setLoading(false);
    }
  };

  const getTotalOrderedQty = (items?: any[]) =>
    (Array.isArray(items) ? items : []).reduce((sum, it) => sum + Number(it?.quantity_ordered ?? 0), 0);

  return (
    <div className={`${darkMode ? 'dark' : ''} flex min-h-screen`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        {alert && <Alert type={alert.type} message={alert.message} />}

        {/* 🖼️ Product image preview (same UX as Orders > View Details) */}
        {imagePreview && (
          <div
            className="fixed inset-0 bg-black/70 flex items-center justify-center z-[999] p-4"
            onClick={() => setImagePreview(null)}
          >
            <div
              className="bg-white dark:bg-gray-900 rounded-xl w-full max-w-2xl border border-gray-200 dark:border-gray-800 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-black dark:text-white truncate">{imagePreview.name}</p>
                <button
                  onClick={() => setImagePreview(null)}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <X className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                </button>
              </div>

              <div className="p-3">
                <img
                  src={imagePreview.url}
                  alt={imagePreview.name}
                  className="w-full max-h-[70vh] object-contain rounded-lg bg-white dark:bg-black"
                  onError={(e) => {
                    e.currentTarget.src = '/placeholder-product.png';
                  }}
                />
              </div>
            </div>
          </div>
        )}

        <main className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">
              Purchase Orders
            </h1>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Vendor
                </label>
                <select
                  value={filters.vendor_id || ''}
                  onChange={(e) => updateFilters({ vendor_id: e.target.value ? parseInt(e.target.value) : undefined })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Vendors</option>
                  {Array.isArray(vendors) && vendors.map(v => (
                    <option key={v.id} value={v.id}>{v.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => updateFilters({ status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="approved">Approved</option>
                  <option value="partially_received">Partially Received</option>
                  <option value="received">Received</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payment Status
                </label>
                <select
                  value={filters.payment_status}
                  onChange={(e) => updateFilters({ payment_status: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="">All Payment Status</option>
                  <option value="unpaid">Unpaid</option>
                  <option value="partially_paid">Partially Paid</option>
                  <option value="paid">Paid</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => updateFilters({ search: e.target.value }, { resetPage: false })}
                  onKeyPress={(e) => e.key === 'Enter' && loadPurchaseOrders()}
                  placeholder="Search PO number..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Per Page
                </label>
                <select
                  value={filters.per_page || 50}
                  onChange={(e) => updateFilters({ per_page: parseInt(e.target.value), page: 1 })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  {[15, 30, 50, 100].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Purchase Orders List */}
          {loading && purchaseOrders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {Array.isArray(purchaseOrders) && purchaseOrders.map((po) => (
                <div
                  key={po.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden"
                >
                  {/* PO Header */}
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                              {po.po_number}
                            </h3>
                            <StatusBadge status={po.status} />
                            <PaymentStatusBadge status={po.payment_status} />
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            Vendor: {po.vendor?.name || 'N/A'} • Order Date: {formatDate(po.order_date)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setExpandedPO(expandedPO === po.id ? null : po.id)}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Toggle details"
                        >
                          {expandedPO === po.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          )}
                        </button>

                        <button
                          onClick={() => handleViewPO(po)}
                          className="flex items-center gap-1 px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100 rounded-lg transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                          View
                        </button>
                        {po.status === 'draft' && (
                          <button
                            onClick={() => openEditModal(po)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            title="Edit purchase order"
                          >
                            <Edit2 className="w-4 h-4" />
                            Edit
                          </button>
                        )}


                        {po.status === 'draft' && (
                          <button
                            onClick={() => handleApprovePO(po.id)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                            Approve
                          </button>
                        )}

                        {(po.status === 'approved' || po.status === 'partially_received') && (
                          <button
                            onClick={() => openReceiveModal(po)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                            title="Receive products"
                          >
                            <Package className="w-4 h-4" />
                            Receive
                          </button>
                        )}

                        {po.status !== 'received' && po.status !== 'cancelled' && (
                          <button
                            onClick={() => handleCancelPO(po.id)}
                            className="flex items-center gap-1 px-3 py-2 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                            title="Cancel PO"
                          >
                            <X className="w-4 h-4" />
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* PO Summary */}
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 grid grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Total Amount</p>
                      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        ৳{formatCurrency(po.total_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Paid Amount</p>
                      <p className="text-lg font-semibold text-green-600 dark:text-green-400">
                        ৳{formatCurrency(po.paid_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Outstanding</p>
                      <p className="text-lg font-semibold text-yellow-600 dark:text-yellow-400">
                        ৳{formatCurrency(po.outstanding_amount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Expected Delivery</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {formatDate(po.expected_delivery_date || '')}
                      </p>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedPO === po.id && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        Order Items
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50 dark:bg-gray-700">
                            <tr>
                              <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Image</th>
                              <th className="px-4 py-2 text-left text-gray-900 dark:text-gray-100">Product</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Qty Ordered</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Qty Received</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Unit Cost</th>
                              <th className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">Total</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.isArray(po.items) && po.items.map((item, idx) => (
                              <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
                                <td className="px-4 py-2">
                                  {(() => {
                                    const img = pickPOItemImage(item);
                                    if (!img) return <span className="text-xs text-gray-400">—</span>;
                                    return (
                                      <button
                                        type="button"
                                        onClick={() => setImagePreview({ url: img, name: item.product_name || 'Product image' })}
                                        className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800"
                                        title="View image"
                                      >
                                        <img
                                          src={img}
                                          alt={item.product_name || 'Product'}
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.currentTarget.src = '/placeholder-product.png';
                                          }}
                                        />
                                      </button>
                                    );
                                  })()}
                                </td>
                                <td className="px-4 py-2 text-gray-900 dark:text-gray-100">
                                  {item.product_name}
                                  <span className="text-xs text-gray-500 dark:text-gray-400 block">
                                    SKU: {item.product_sku}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                                  {item.quantity_ordered}
                                </td>
                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                                  {item.quantity_received || 0}
                                </td>
                                <td className="px-4 py-2 text-right text-gray-900 dark:text-gray-100">
                                  ৳{formatCurrency(item.unit_cost)}
                                </td>
                                <td className="px-4 py-2 text-right font-medium text-gray-900 dark:text-gray-100">
                                  ৳{formatCurrency((item.quantity_ordered || 0) * (item.unit_cost || 0))}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {purchaseOrders.length > 0 && (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 py-3 px-2">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    Showing <span className="font-medium text-gray-900 dark:text-gray-100">{pagination.from}</span>–<span className="font-medium text-gray-900 dark:text-gray-100">{pagination.to}</span> of{' '}
                    <span className="font-medium text-gray-900 dark:text-gray-100">{pagination.total}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => updateFilters({ page: Math.max(1, (filters.page || 1) - 1) }, { resetPage: false })}
                      disabled={(filters.page || 1) <= 1}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Prev
                    </button>

                    <div className="text-sm text-gray-700 dark:text-gray-300 px-2">
                      Page <span className="font-semibold">{pagination.current_page}</span> / <span className="font-semibold">{pagination.last_page}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => updateFilters({ page: Math.min(pagination.last_page || 1, (filters.page || 1) + 1) }, { resetPage: false })}
                      disabled={(pagination.last_page || 1) <= (filters.page || 1)}
                      className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}

              {purchaseOrders.length === 0 && !loading && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  No purchase orders found.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* View Modal */}
      <Modal
        isOpen={showViewModal}
        onClose={() => setShowViewModal(false)}
        title="Purchase Order Details"
        size="lg"
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">PO Number</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{selectedPO.po_number}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Status</p>
                <StatusBadge status={selectedPO.status} />
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Vendor</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPO.vendor?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Warehouse</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {selectedPO.store?.name || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Items (Qty)</p>
                <p className="font-semibold text-gray-900 dark:text-gray-100">
                  {getTotalOrderedQty(selectedPO.items)}
                </p>
              </div>
            </div>

            {/* 📝 Notes / Terms */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">Notes</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                {selectedPO.notes ? String(selectedPO.notes) : '—'}
              </p>
              {selectedPO.terms_and_conditions && (
                <div className="mt-3">
                  <h5 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">Terms &amp; Conditions</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {String(selectedPO.terms_and_conditions)}
                  </p>
                </div>
              )}
            </div>

            {/* ✅ PO Barcode Center */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <h4 className="font-semibold text-gray-900 dark:text-gray-100">Barcode Center</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    One-click print for this Purchase Order. It prints all <b>active unit-level</b> barcodes from the received batches.
                    If a batch has no individual barcodes, it falls back to its primary barcode.
                  </p>
                  {poBarcodeSources.length === 0 ? (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      No received batches found for this PO yet. Receive the PO first to generate batches/barcodes.
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Found {poBarcodeSources.length} received batch(es) linked to this PO.
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <GroupedAllBarcodesPrinter
                    sources={poBarcodeSources}
                    buttonLabel="Print ALL barcodes (PO)"
                    title={`PO ${selectedPO.po_number} — All barcodes`}
                    softLimit={1200}
                  />
                </div>
              </div>

              {/* ✅ Per-batch + per-unit controls */}
              {poBarcodeSources.length > 0 ? (
                <div className="mt-4 space-y-3">
                  <div className="text-xs text-gray-600 dark:text-gray-400">
                    Tip: Use <b>Print this batch</b> to print all active unit barcodes for a single received batch.
                    Or expand a batch to <b>print any unit barcode one by one</b>.
                  </div>

                  {poBarcodeSources.map((s) => {
                    const open = !!expandedBatchIds[s.batchId];
                    const cache = batchBarcodeCache[s.batchId];
                    const priceText = `৳${formatCurrency(s.price)}`;

                    return (
                      <div
                        key={s.batchId}
                        className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3"
                      >
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {s.productName}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Batch ID: {s.batchId}
                              {s.fallbackCode ? ` • Primary: ${s.fallbackCode}` : ''}
                              {s.price ? ` • Price: ${priceText}` : ''}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <GroupedAllBarcodesPrinter
                              sources={[s]}
                              buttonLabel="Print this batch"
                              title={`PO ${selectedPO.po_number} — Batch ${s.batchId}`}
                              softLimit={600}
                            />

                            <button
                              type="button"
                              onClick={() => toggleBatchBarcodes(s)}
                              className="px-3 py-2 rounded-lg text-sm font-semibold border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              {open ? 'Hide barcodes' : 'Show barcodes'}
                            </button>
                          </div>
                        </div>

                        {open ? (
                          <div className="mt-3">
                            {cache?.loading ? (
                              <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                <Loader2 className="w-4 h-4 animate-spin" /> Loading barcodes...
                              </div>
                            ) : cache?.error ? (
                              <div className="text-xs text-red-600 dark:text-red-400">{cache.error}</div>
                            ) : (cache?.codes?.length || 0) === 0 ? (
                              <div className="text-xs text-amber-600 dark:text-amber-400">
                                No active unit barcodes found for this batch.
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {cache!.codes.map((code) => (
                                  <div
                                    key={code}
                                    className="flex items-center justify-between gap-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/40 px-3 py-2"
                                  >
                                    <div className="text-xs font-mono text-gray-900 dark:text-gray-100 truncate">
                                      {code}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => quickPrintSingleBarcode({ barcode: code, productName: s.productName, price: s.price })}
                                      className="px-2.5 py-1.5 rounded-md text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700"
                                      title="Print this single barcode"
                                    >
                                      Print 1
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : null}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Items</h4>
              <div className="space-y-2">
                {Array.isArray(selectedPO.items) && selectedPO.items.map((item, idx) => {
                  const img = pickPOItemImage(item);
                  return (
                    <div key={idx} className="flex justify-between gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-start gap-3 min-w-0">
                        {img && (
                          <button
                            type="button"
                            onClick={() => setImagePreview({ url: img, name: item.product_name || 'Product image' })}
                            className="w-11 h-11 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 flex-shrink-0"
                            title="View image"
                          >
                            <img
                              src={img}
                              alt={item.product_name || 'Product'}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.src = '/placeholder-product.png';
                              }}
                            />
                          </button>
                        )}

                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{item.product_name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Qty: {item.quantity_ordered} × ৳{formatCurrency(item.unit_cost)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100">
                          ৳{formatCurrency((item.quantity_ordered || 0) * (item.unit_cost || 0))}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.subtotal_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tax</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.tax_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Discount</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    -৳{formatCurrency(selectedPO.discount_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Shipping</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.shipping_cost)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Total</span>
                  <span className="font-bold text-lg text-gray-900 dark:text-gray-100">
                    ৳{formatCurrency(selectedPO.total_amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </Modal>

      
      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Edit Purchase Order</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[70vh] space-y-6">
              {editPO?.status && editPO.status !== 'draft' && (
                <div className="p-3 rounded-md bg-yellow-50 text-yellow-800 text-sm">
                  Note: Your backend may allow editing only in <b>draft</b> status. If saving fails, change the PO back to draft first.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tax Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.tax_amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, tax_amount: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.discount_amount}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, discount_amount: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Shipping Cost</label>
                  <input
                    type="number"
                    step="0.01"
                    value={editForm.shipping_cost}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, shipping_cost: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
                  placeholder="Add a note for this purchase order"
                />
              </div>

              {/* ➕ Add more products in this PO */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Add More Products</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Search vendor products and add them to this PO before saving.</p>
                  </div>
                </div>

                <div className="mt-3">
                  <input
                    type="text"
                    value={editProductSearch}
                    onChange={(e) => setEditProductSearch(e.target.value)}
                    placeholder="Search products by name / SKU"
                    className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  {editProductSearching && (
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Searching…</p>
                  )}
                </div>

                {editProductSearch.trim() && (
                  <div className="mt-3 max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700">
                    {editProductResults.map((p) => {
                      const img = pickProductImage(p);
                      return (
                        <div key={p.id} className="flex items-center justify-between gap-3 p-3 bg-white dark:bg-gray-800">
                          <div className="flex items-center gap-3 min-w-0">
                            {img ? (
                              <button
                                type="button"
                                onClick={() => setImagePreview({ url: img, name: p.name })}
                                className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-900 flex-shrink-0"
                                title="View image"
                              >
                                <img
                                  src={img}
                                  alt={p.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = '/placeholder-product.png';
                                  }}
                                />
                              </button>
                            ) : (
                              <div className="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600" />
                            )}

                            <div className="min-w-0">
                              <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{p.name}</div>
                              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{(p as any).sku || ''}</div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => appendProductToEdit(p)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md"
                          >
                            <Plus className="w-3 h-3" />
                            Add
                          </button>
                        </div>
                      );
                    })}

                    {!editProductSearching && editProductResults.length === 0 && (
                      <div className="p-4 text-sm text-gray-500 dark:text-gray-400">No products found.</div>
                    )}
                  </div>
                )}
              </div>

              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Items (Quantity &amp; Prices)</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Qty Ordered</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unit Cost</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unit Sell</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                      {editForm.items.map((it, idx) => (
                        <tr key={it.id} className="bg-white dark:bg-gray-800">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{it.product_label}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={it.quantity_ordered}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditForm((prev) => ({
                                  ...prev,
                                  items: prev.items.map((x, i) => (i === idx ? { ...x, quantity_ordered: v } : x)),
                                }));
                              }}
                              className="w-28 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={it.unit_cost}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditForm((prev) => ({
                                  ...prev,
                                  items: prev.items.map((x, i) => (i === idx ? { ...x, unit_cost: v } : x)),
                                }));
                              }}
                              className="w-32 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={it.unit_sell_price}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditForm((prev) => ({
                                  ...prev,
                                  items: prev.items.map((x, i) => (i === idx ? { ...x, unit_sell_price: v } : x)),
                                }));
                              }}
                              className="w-32 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">—</td>
                        </tr>
                      ))}

                      {editForm.new_items.map((it, idx) => (
                        <tr key={`new-${it.temp_id}`} className="bg-emerald-50/60 dark:bg-emerald-900/10">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white">NEW</span>
                              <span>{it.product_label}</span>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              value={it.quantity_ordered}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditForm((prev) => ({
                                  ...prev,
                                  new_items: prev.new_items.map((x, i) => (i === idx ? { ...x, quantity_ordered: v } : x)),
                                }));
                              }}
                              className="w-28 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={it.unit_cost}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditForm((prev) => ({
                                  ...prev,
                                  new_items: prev.new_items.map((x, i) => (i === idx ? { ...x, unit_cost: v } : x)),
                                }));
                              }}
                              className="w-32 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              step="0.01"
                              value={it.unit_sell_price}
                              onChange={(e) => {
                                const v = e.target.value;
                                setEditForm((prev) => ({
                                  ...prev,
                                  new_items: prev.new_items.map((x, i) => (i === idx ? { ...x, unit_sell_price: v } : x)),
                                }));
                              }}
                              className="w-32 px-2 py-1 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <button
                              type="button"
                              onClick={() => removeEditNewItem(it.temp_id)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEditPO}
                disabled={loading}
                className="px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

{/* Receive Modal */}
      <Modal
        isOpen={showReceiveModal}
        onClose={() => setShowReceiveModal(false)}
        title="Receive Products"
        size="2xl"
      >
        {selectedPO && (
          <div className="space-y-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                Purchase Order: {selectedPO.po_number}
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Vendor: {selectedPO.vendor?.name}
              </p>
            </div>

            <div className="space-y-4">
              {receiveForm.items.map((item, index) => {
                const poItem = selectedPO.items?.[index];
                if (!poItem) return null;

                return (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                      {poItem.product_name}
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({poItem.product_sku})
                      </span>
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      Ordered: {poItem.quantity_ordered} • 
                      Already Received: {poItem.quantity_received || 0}
                    </p>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Quantity Receiving *
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={(poItem.quantity_ordered || 0) - (poItem.quantity_received || 0)}
                          value={item.quantity_received}
                          onChange={(e) => updateReceiveItem(index, 'quantity_received', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="0"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Batch Number
                        </label>
                        <input
                          type="text"
                          value={item.batch_number}
                          onChange={(e) => updateReceiveItem(index, 'batch_number', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          placeholder="BATCH-001"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Manufactured Date
                        </label>
                        <input
                          type="date"
                          value={item.manufactured_date}
                          onChange={(e) => updateReceiveItem(index, 'manufactured_date', e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Expiry Date
                        </label>
                        <input
                          type="date"
                          value={item.expiry_date}
                          onChange={(e) => updateReceiveItem(index, 'expiry_date', e.target.value)}
                          min={item.manufactured_date || undefined}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowReceiveModal(false)}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={handleReceivePO}
                disabled={loading}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Receive Products
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}