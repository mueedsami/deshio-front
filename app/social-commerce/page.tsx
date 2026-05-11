'use client';

import { useState, useEffect, useRef, useMemo, type ReactNode } from 'react';
import { Search, X, Globe, AlertCircle, Eye, FileText, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CustomerTagManager from '@/components/customers/CustomerTagManager';
import ServiceSelector, { ServiceItem } from '@/components/ServiceSelector';
import ImageLightboxModal from '@/components/ImageLightboxModal';
import axios from '@/lib/axios';
import { useCustomerLookup, type RecentOrder } from '@/lib/hooks/useCustomerLookup';
import storeService from '@/services/storeService';
import batchService from '@/services/batchService';
import productService from '@/services/productService';
import defectIntegrationService from '@/services/defectIntegrationService';

// -----------------------------
// Helpers
// -----------------------------

interface DefectItem {
  id: string;
  barcode: string;
  productId: number;
  productName: string;
  sellingPrice?: number;
  store?: string;
  batchId: number;
}

interface CartProduct {
  id: number | string;
  product_id: number;
  batch_id: number | null;
  productName: string;
  quantity: number;
  unit_price: number;
  discount_amount: number;
  amount: number;
  isDefective?: boolean;
  defectId?: string;
  isService?: boolean; // NEW: Flag for service items
  serviceId?: number; // NEW: Service ID
  serviceCategory?: string; // NEW: Service category
}

// Pathao types
interface PathaoCity {
  city_id: number;
  city_name: string;
}
interface PathaoZone {
  zone_id: number;
  zone_name: string;
}
interface PathaoArea {
  area_id: number;
  area_name: string;
}

const SC_DRAFT_STORAGE_KEY = 'socialCommerceDraftV1';
const SC_SELECTION_QUEUE_KEY = 'socialCommerceSelectionQueueV1';
const SC_EDIT_PREFILL_KEY = 'socialCommerceEditPrefillV1';
const SC_EDIT_CONTEXT_KEY = 'socialCommerceEditContextV1';

export default function SocialCommercePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [availableBatchCount, setAvailableBatchCount] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [stores, setStores] = useState<any[]>([]);

  // Edit-order mode (navigated from orders page for social commerce orders)
  const [editOrderId, setEditOrderId] = useState<number | null>(null);
  const [editOrderNumber, setEditOrderNumber] = useState<string | null>(null);

  // Multi-product staging: collect several products before adding them all to cart at once
  interface StagingItem {
    id: string;
    product: any;
    quantity: number;
    discountPercent: string;
    discountTk: string;
    amount: string;
  }
  const [stagingQueue, setStagingQueue] = useState<StagingItem[]>([]);

  const [date, setDate] = useState(getTodayDate());
  const [salesBy, setSalesBy] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [socialId, setSocialId] = useState('');
  const [orderNotes, setOrderNotes] = useState('');

  const [isInternational, setIsInternational] = useState(false);

  // ✅ Domestic (Pathao)
  const [pathaoCities, setPathaoCities] = useState<PathaoCity[]>([]);
  const [pathaoZones, setPathaoZones] = useState<PathaoZone[]>([]);
  const [pathaoAreas, setPathaoAreas] = useState<PathaoArea[]>([]);

  const [pathaoCityId, setPathaoCityId] = useState<string>('');
  const [pathaoZoneId, setPathaoZoneId] = useState<string>('');
  const [pathaoAreaId, setPathaoAreaId] = useState<string>('');

  // ✅ NEW: Pathao auto location (address -> city/zone/area happens inside Pathao)
  // If enabled, we do NOT force city/zone/area selection in UI.
  const [usePathaoAutoLocation, setUsePathaoAutoLocation] = useState<boolean>(true);

  const [streetAddress, setStreetAddress] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // ✅ International
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [internationalCity, setInternationalCity] = useState('');
  const [internationalPostalCode, setInternationalPostalCode] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [exactPrice, setExactPrice] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [cart, setCart] = useState<CartProduct[]>([]);

  const [quantity, setQuantity] = useState('');
  const [discountPercent, setDiscountPercent] = useState('');
  const [discountTk, setDiscountTk] = useState('');
  const [amount, setAmount] = useState('0.00');

  const [defectiveProduct, setDefectiveProduct] = useState<DefectItem | null>(null);
  const [selectedStore, setSelectedStore] = useState('');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Batches are loaded dynamically via search
  const batchesLoadRef = useRef<Promise<any[]> | null>(null);

  // 🧑‍💼 Existing customer + last order summary states
  const [existingCustomer, setExistingCustomer] = useState<any | null>(null);
  const [lastOrderInfo, setLastOrderInfo] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
  const [customerCheckError, setCustomerCheckError] = useState<string | null>(null);
  const [lastPrefilledOrderId, setLastPrefilledOrderId] = useState<number | null>(null);
  
  // Payment states for edit mode
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [outstandingAmount, setOutstandingAmount] = useState<number>(0);
  const [totalAmountState, setTotalAmountState] = useState<number>(0);
  const [discountAmountState, setDiscountAmountState] = useState<number>(0);
  const [shippingAmountState, setShippingAmountState] = useState<number>(0);

  // 🔎 Order preview (from Last 5 Orders)
  const [orderPreviewOpen, setOrderPreviewOpen] = useState(false);
  const [orderPreviewId, setOrderPreviewId] = useState<number | null>(null);
  const [orderPreviewLoading, setOrderPreviewLoading] = useState(false);
  const [orderPreviewError, setOrderPreviewError] = useState<string | null>(null);
  const [orderPreview, setOrderPreview] = useState<any | null>(null);
  const orderPreviewReqRef = useRef(0);

  // 🖼️ Product image preview (before selecting)
  const [productPreviewOpen, setProductPreviewOpen] = useState(false);
  const [productPreview, setProductPreview] = useState<any | null>(null);

  // 🔍 Image popup modal (for recent orders + other inline previews)
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [imageModalSrc, setImageModalSrc] = useState<string | null>(null);
  const [imageModalTitle, setImageModalTitle] = useState<string>('');

  const [recentThumbsByProductId, setRecentThumbsByProductId] = useState<Record<number, string>>({});

  // 🖼️ Hover expansion logic (Disabled as per request, but kept state to avoid ref errors)
  const [isPreviewFromHover, setIsPreviewFromHover] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [isZoomed, setIsZoomed] = useState(false);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isOverModalRef = useRef(false);

  const handleMouseEnterProduct = (product: any) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setProductPreview(product);
      setProductPreviewOpen(true);
      setIsPreviewFromHover(true);
    }, 500);
  };

  const handleMouseLeaveProduct = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    if (isPreviewFromHover) {
      if (leaveTimeoutRef.current) clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = setTimeout(() => {
        if (!isOverModalRef.current) {
          setProductPreviewOpen(false);
          setIsPreviewFromHover(false);
          setProductPreview(null);
        }
      }, 100);
    }
  };

  // ✅ Reuse lookup hook for consistent phone lookup behavior (debounced)
  const customerLookup = useCustomerLookup({ debounceMs: 500, minLength: 6 });
  const draftHydratedRef = useRef(false);
  const queueImportingRef = useRef(false);

  function getTodayDate() {
    const today = new Date();
    const day = String(today.getDate()).padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = monthNames[today.getMonth()];
    const year = today.getFullYear();
    return `${day}-${month}-${year}`;
  }

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    if (type === 'error') {
      console.error('Error:', message);
      alert('Error: ' + message);
    } else {
      console.log('Success:', message);
      alert(message);
    }
  };

  const saveDraftToSession = () => {
    if (typeof window === 'undefined') return;
    try {
      const draft = {
        ...(editOrderId ? { editOrderId } : {}),
        ...(editOrderNumber ? { editOrderNumber } : {}),
        date,
        salesBy,
        userName,
        userEmail,
        userPhone,
        socialId,
        orderNotes,
        isInternational,
        usePathaoAutoLocation,
        pathaoCityId,
        pathaoZoneId,
        pathaoAreaId,
        streetAddress,
        postalCode,
        country,
        state,
        internationalCity,
        internationalPostalCode,
        deliveryAddress,
        selectedStore,
        searchQuery,
        minPrice,
        maxPrice,
        exactPrice,
        cart,
        paidAmount,
        totalAmountState,
        outstandingAmount,
        discountAmountState,
        shippingAmountState,
      };
      sessionStorage.setItem(SC_DRAFT_STORAGE_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save social commerce draft', e);
    }
  };

  const readQueuedSelections = () => {
    if (typeof window === 'undefined') return [];
    try {
      const rawSession = sessionStorage.getItem(SC_SELECTION_QUEUE_KEY);
      const rawLegacyLocal = localStorage.getItem('social_commerce_queue');
      
      const parsedSession = rawSession ? JSON.parse(rawSession) : [];
      const parsedLegacy = rawLegacyLocal ? JSON.parse(rawLegacyLocal) : [];
      
      const listSession = Array.isArray(parsedSession) ? parsedSession : [];
      const listLegacy = Array.isArray(parsedLegacy) ? parsedLegacy : [];
      
      // Merge them
      const list = [...listSession, ...listLegacy];

      const byId = new Map<number, any>();
      for (const item of list) {
        const id = Number(item?.id || 0);
        if (!Number.isFinite(id) || id <= 0) continue;

        const qtyRaw = Number(item?.qty ?? item?.quantity);
        const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;

        const ex = byId.get(id);
        if (ex) {
          ex.qty += qty;
          ex.ts = Math.max(Number(ex.ts || 0), Number(item?.ts || 0));
          if (!ex.image && item?.image) ex.image = String(item.image);
          if (!ex.sku && item?.sku) ex.sku = String(item.sku);
          if (!ex.name && (item?.name || item?.productName)) ex.name = String(item.name || item.productName);
        } else {
          byId.set(id, {
            id,
            name: String(item?.name || item?.productName || ''),
            sku: String(item?.sku || ''),
            image: item?.image ? String(item.image) : null,
            qty,
            ts: Number(item?.ts || 0) || Date.now(),
          });
        }
      }

      return Array.from(byId.values());
    } catch {
      return [];
    }
  };

  const clearQueuedSelections = () => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem(SC_SELECTION_QUEUE_KEY);
    localStorage.removeItem('social_commerce_queue');
  };

  const handleResetAll = () => {
    if (typeof window === 'undefined') return;
    if (!confirm('Are you sure you want to clear all data and start a new order? This will remove all items from cart and clear customer details.')) return;

    // Clear all session storage related to SC
    sessionStorage.removeItem(SC_DRAFT_STORAGE_KEY);
    sessionStorage.removeItem(SC_SELECTION_QUEUE_KEY);
    sessionStorage.removeItem(SC_EDIT_PREFILL_KEY);
    sessionStorage.removeItem(SC_EDIT_CONTEXT_KEY);
    localStorage.removeItem('social_commerce_queue'); 
    sessionStorage.removeItem('pendingOrder');

    // Reset local states
    setEditOrderId(null);
    setEditOrderNumber(null);
    setStagingQueue([]);
    setDate(getTodayDate());
    setSalesBy('');
    setUserName('');
    setUserEmail('');
    setUserPhone('');
    setSocialId('');
    setOrderNotes('');
    setIsInternational(false);
    setPathaoCityId('');
    setPathaoZoneId('');
    setPathaoAreaId('');
    setStreetAddress('');
    setPostalCode('');
    setCountry('');
    setState('');
    setInternationalCity('');
    setInternationalPostalCode('');
    setDeliveryAddress('');
    setCart([]);
    setPaidAmount(0);
    setOutstandingAmount(0);
    setTotalAmountState(0);
    setDiscountAmountState(0);
    setShippingAmountState(0);
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setExactPrice('');
    setSearchResults([]);
    setSelectedProduct(null);
    setExistingCustomer(null);
    setRecentOrders([]);
    setLastOrderInfo(null);
    setDefectiveProduct(null);

    showToast('All data cleared. You can start a new order.', 'success');
  };

  const formatOrderDateTime = (v?: any) => {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  };

  const parseCurrencyNumber = (v?: any) => {
    const n = Number(String(v ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const normalizeCartProductForState = (item: any): CartProduct | null => {
    if (!item || typeof item !== 'object') return null;

    const quantity = Math.max(1, Math.floor(parseCurrencyNumber(item.quantity ?? item.qty ?? 1) || 1));
    const discountAmount = parseCurrencyNumber(item.discount_amount ?? item.discount ?? item.discountAmount ?? 0);
    const apiLineTotal = parseCurrencyNumber(item.total_amount ?? item.total ?? item.line_total ?? item.amount ?? 0);

    let unitPrice = parseCurrencyNumber(
      item.unit_price ??
        item.unitPrice ??
        item.price ??
        item.sell_price ??
        item.selling_price ??
        item.product?.sell_price ??
        item.product?.selling_price ??
        item.product?.price ??
        0
    );

    // Recover legacy/preloaded edit carts where price became 0 but total exists.
    if (unitPrice <= 0 && apiLineTotal > 0 && quantity > 0) {
      unitPrice = (apiLineTotal + discountAmount) / quantity;
    }

    const amount = apiLineTotal > 0 ? apiLineTotal : Math.max(0, unitPrice * quantity - discountAmount);

    return {
      id: item.id ?? item.order_item_id ?? item.orderItemId ?? `${item.product_id ?? item.productId ?? item.product?.id ?? 'item'}-${Date.now()}`,
      product_id: Number(item.product_id ?? item.productId ?? item.product?.id ?? 0) || 0,
      batch_id: item.batch_id ?? item.product_batch_id ?? item.productBatchId ?? null,
      productName: item.productName ?? item.product_name ?? item.name ?? item.product?.name ?? 'Unnamed product',
      quantity,
      unit_price: unitPrice,
      discount_amount: discountAmount,
      amount,
      isDefective: Boolean(item.isDefective),
      defectId: item.defectId,
      isService: Boolean(item.isService),
      serviceId: item.serviceId,
      serviceCategory: item.serviceCategory,
    };
  };

  const formatBDT = (v?: any) => {
    const amt = parseCurrencyNumber(v);
    try {
      return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amt);
    } catch {
      return `৳${Math.round(amt)}`;
    }
  };

  const getBaseUrl = () => {
    const api = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL || '' : '';
    return api ? api.replace(/\/api\/?$/, '') : '';
  };

  // ✅ DO NOT call any image API — use URLs from product search response
  // - Quick search: product.primary_image.url
  // - Advanced search: product.images[].image_url (primary first)
  const normalizeImageUrl = (url?: string | null): string => {
    if (!url) return '/placeholder-image.jpg';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) return url;

    const baseUrl = getBaseUrl();

    // backend often returns /storage/....
    if (url.startsWith('/storage')) return baseUrl ? `${baseUrl}${url}` : url;

    // if it already starts with "/", treat as site-relative
    if (url.startsWith('/')) return url;

    // otherwise treat as storage-relative path like: products/5/xxx.jpg
    const path = `/storage/${String(url).replace(/^\/+/, '')}`;
    return baseUrl ? `${baseUrl}${path}` : path;
  };

  const pickProductImage = (p: any): string | undefined => {
    if (!p) return undefined;

    const pi = p?.primary_image;
    const piUrl = pi?.url || pi?.image_url || pi?.image_path;
    if (piUrl) return String(piUrl);

    const imgs = Array.isArray(p?.images) ? p.images : [];
    if (imgs.length > 0) {
      const active = imgs.filter((img: any) => img?.is_active !== false);
      active.sort((a: any, b: any) => {
        if (a?.is_primary && !b?.is_primary) return -1;
        if (!a?.is_primary && b?.is_primary) return 1;
        return (a?.sort_order || 0) - (b?.sort_order || 0);
      });
      const first = active[0] || imgs[0];
      const u = first?.image_url || first?.url || first?.image_path || first?.image;
      if (u) return String(u);
    }

    return undefined;
  };

  const getProductCardImage = (p: any): string => {
    return normalizeImageUrl(pickProductImage(p));
  };

  const openImageModal = (src: string, title?: string) => {
    setImageModalSrc(src);
    setImageModalTitle(title || '');
    setImageModalOpen(true);
  };

  const closeImageModal = () => {
    setImageModalOpen(false);
    setImageModalSrc(null);
    setImageModalTitle('');
  };

  const getRecentItemThumbSrc = (it: any): string => {
    // 1) Direct image fields
    const raw = it?.product_image || it?.image_url || it?.image;
    if (raw) return normalizeImageUrl(String(raw));

    // 2) Nested product primary image
    const prod = it?.product;
    if (prod) {
      const pi = prod.primary_image;
      const piUrl = pi?.url || pi?.image_url || pi?.image_path;
      if (piUrl) return normalizeImageUrl(String(piUrl));

      // Fallback to images array
      const imgs = Array.isArray(prod.images) ? prod.images : [];
      const primary = imgs.find(img => img.is_primary) || imgs[0];
      const u = primary?.image_url || primary?.url || primary?.image_path;
      if (u) return normalizeImageUrl(String(u));
    }

    // 3) Cache
    const pid = Number(it?.product_id ?? it?.productId ?? it?.product?.id ?? 0) || 0;
    if (pid && recentThumbsByProductId[pid]) return recentThumbsByProductId[pid];

    return '/placeholder-product.png';
  };

  const ensureRecentThumbs = async (productIds: number[]) => {
    const ids = Array.from(new Set(productIds.filter((id) => id > 0)));
    const missing = ids.filter((id) => !recentThumbsByProductId[id]);
    if (missing.length === 0) return;

    // Keep it lightweight: fetch up to 25 at a time
    const slice = missing.slice(0, 25);

    const fetched: Record<number, string> = {};
    await Promise.all(
      slice.map(async (id) => {
        try {
          const p = await productService.getById(id);
          const img = normalizeImageUrl(pickProductImage(p));
          fetched[id] = img || '/placeholder-product.png';
        } catch {
          fetched[id] = '/placeholder-product.png';
        }
      })
    );

    if (Object.keys(fetched).length > 0) {
      setRecentThumbsByProductId((prev) => ({ ...prev, ...fetched }));
    }
  };

  const normalizeOrderItemsForPreview = (order: any) => {
    const rawItems =
      order?.items ??
      order?.order_items ??
      order?.orderItems ??
      order?.products ??
      order?.lines ??
      order?.order_lines ??
      [];
    const arr = Array.isArray(rawItems) ? rawItems : [];

    return arr
      .map((it: any) => {
        if (!it) return null;
        const name =
          it?.product_name ||
          it?.productName ||
          it?.name ||
          it?.product?.name ||
          it?.product?.title ||
          it?.title ||
          'Unnamed product';

        const quantity =
          typeof it?.quantity === 'number'
            ? it.quantity
            : typeof it?.qty === 'number'
            ? it.qty
            : Number(String(it?.quantity ?? it?.qty ?? 0).replace(/[^0-9.-]/g, '')) || 0;

        const unit_price =
          Number(String(it?.unit_price ?? it?.price ?? it?.unitPrice ?? 0).replace(/[^0-9.-]/g, '')) || 0;
        const discount_amount =
          Number(String(it?.discount_amount ?? it?.discount ?? it?.discountAmount ?? 0).replace(/[^0-9.-]/g, '')) ||
          0;
        const total_amount =
          Number(String(it?.total_amount ?? it?.total ?? it?.line_total ?? it?.amount ?? 0).replace(/[^0-9.-]/g, '')) ||
          0;

        return {
          id: it?.id ?? it?.order_item_id ?? it?.orderItemId,
          name: String(name),
          quantity,
          unit_price,
          discount_amount,
          total_amount,
        };
      })
      .filter(Boolean);
  };

  const openOrderPreview = async (orderId: number) => {
    if (!orderId) return;
    setOrderPreviewOpen(true);
    setOrderPreviewId(orderId);
    setOrderPreview(null);
    setOrderPreviewError(null);
    setOrderPreviewLoading(true);

    const reqId = ++orderPreviewReqRef.current;
    try {
      const res = await axios.get(`/orders/${orderId}`);
      if (reqId !== orderPreviewReqRef.current) return;
      const body: any = res.data;
      const order = body?.data ?? body;
      setOrderPreview(order);
    } catch (e: any) {
      if (reqId !== orderPreviewReqRef.current) return;
      setOrderPreviewError(e?.response?.data?.message || 'Failed to load order details');
    } finally {
      if (reqId === orderPreviewReqRef.current) setOrderPreviewLoading(false);
    }
  };

  const closeOrderPreview = () => {
    setOrderPreviewOpen(false);
    setOrderPreviewId(null);
    setOrderPreview(null);
    setOrderPreviewError(null);
    setOrderPreviewLoading(false);
  };

  const openProductPreview = (product: any) => {
    setProductPreview(product);
    setProductPreviewOpen(true);
    setIsPreviewFromHover(false);
    setActiveImageIndex(0);
    setIsZoomed(false);
  };

  const handleZoomMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
    const x = ((e.pageX - left) / width) * 100;
    const y = ((e.pageY - top) / height) * 100;
    setZoomPos({ x, y });
  };

  const allPreviewImages = useMemo(() => {
    if (!productPreview) return [];
    const images: string[] = [];
    
    // 1) Main image from attributes
    if (productPreview.attributes?.mainImage) {
      images.push(productPreview.attributes.mainImage);
    } else if (productPreview.primary_image) {
      const u = pickProductImage(productPreview);
      if (u) images.push(normalizeImageUrl(u));
    }

    // 2) Other images
    const otherImages = productPreview.images || productPreview.attributes?.images || [];
    if (Array.isArray(otherImages)) {
      otherImages.forEach((img: any) => {
        const url = typeof img === 'string' ? img : img.image_url || img.image_path || img.url || img.image;
        if (url) {
          const fullUrl = normalizeImageUrl(url);
          if (!images.includes(fullUrl)) {
            images.push(fullUrl);
          }
        }
      });
    }

    return images.length > 0 ? images : ['https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800'];
  }, [productPreview]);


  const closeProductPreview = () => {
    setProductPreviewOpen(false);
    setProductPreview(null);
    setIsPreviewFromHover(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
  };

  const orderPreviewItems = orderPreview ? normalizeOrderItemsForPreview(orderPreview) : [];


  const fetchStores = async () => {
    try {
      // Backend validation: per_page must be <= 100
      const response = await storeService.getStores({ is_active: true, per_page: 100 });
      let storesData: any[] = [];

      if (response?.success && response?.data) {
        storesData = Array.isArray(response.data)
          ? response.data
          : Array.isArray(response.data.data)
          ? response.data.data
          : [];
      } else if (Array.isArray((response as any)?.data)) {
        storesData = (response as any).data;
      }

      // Prefer "Office" as the fixed store
      const normalized = (s: any) => String(s ?? '').toLowerCase().trim();
      const officeStore = storesData.find(
        (s) => normalized(s?.name).includes('office')
      );

      const targetStore = officeStore || storesData[0];

      if (targetStore) {
        setStores([targetStore]);
        setSelectedStore(String(targetStore.id));
      } else {
        setStores([]);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    }
  };

  const fetchStoreBatchCount = async (storeId: string) => {
    if (!storeId) {
      setAvailableBatchCount(null);
      return;
    }

    setIsLoadingData(true);
    try {
      // ✅ lightweight: fetch counts only (no batch list download)
      const res = await batchService.getStatistics(parseInt(storeId));
      const data: any = (res as any)?.data ?? {};
      const count =
        typeof data?.available_batches === 'number'
          ? data.available_batches
          : typeof data?.active_batches === 'number'
          ? data.active_batches
          : typeof data?.total_batches === 'number'
          ? data.total_batches
          : null;

      setAvailableBatchCount(typeof count === 'number' ? count : null);
    } catch (error) {
      console.error('Error fetching batch statistics:', error);
      setAvailableBatchCount(null);
    } finally {
      setIsLoadingData(false);
    }
  };


  // ✅ Pathao lookup
  const fetchPathaoCities = async () => {
    try {
      const res = await axios.get('/shipments/pathao/cities');
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setPathaoCities(data);
    } catch (err) {
      console.error('Failed to load Pathao cities', err);
      setPathaoCities([]);
    }
  };

  const fetchPathaoZones = async (cityId: number) => {
    try {
      const res = await axios.get(`/shipments/pathao/zones/${cityId}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setPathaoZones(data);
    } catch (err) {
      console.error('Failed to load Pathao zones', err);
      setPathaoZones([]);
    }
  };

  const fetchPathaoAreas = async (zoneId: number) => {
    try {
      const res = await axios.get(`/shipments/pathao/areas/${zoneId}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];
      setPathaoAreas(data);
    } catch (err) {
      console.error('Failed to load Pathao areas', err);
      setPathaoAreas([]);
    }
  };

  const parseSellPrice = (v: any): number => {
    const n = Number(String(v ?? '0').replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : 0;
  };

  const withinPriceRange = (price: number, min: number | null, max: number | null) => {
    if (min !== null && price < min) return false;
    if (max !== null && price > max) return false;
    return true;
  };



  const matchesOneCharQuery = (batch: any, q: string) => {
    const needle = String(q || '').trim().toLowerCase();
    if (!needle) return false;
    const prod = batch?.product ?? {};
    const name = String(prod?.name ?? batch?.product_name ?? '').toLowerCase();
    const sku = String(prod?.sku ?? batch?.product_sku ?? '').toLowerCase();
    const bn = String(batch?.batch_number ?? '').toLowerCase();
    return name.includes(needle) || sku.includes(needle) || bn.includes(needle);
  };
  const buildProductResultsFromBatches = (
    batches: any[],
    options?: {
      productOverrides?: Map<number, any>;
      relevanceOverrides?: Map<number, { score: number; stage: string }>;
      defaultStage?: string;
      defaultScore?: number;
    }
  ) => {
    const byProduct = new Map<number, any>();
    const productOverrides = options?.productOverrides;
    const relevanceOverrides = options?.relevanceOverrides;
    const defaultStage = options?.defaultStage ?? 'local';
    const defaultScore = options?.defaultScore ?? 0;

    for (const b of batches || []) {
      const pid = Number(b?.product?.id ?? b?.product_id ?? 0);
      if (!pid) continue;

      const prod = productOverrides?.get(pid) ?? b?.product ?? {};
      const name = String(prod?.name ?? b?.product_name ?? 'Unknown product');
      const sku = String(prod?.sku ?? b?.product_sku ?? '');
      const imageUrl = getProductCardImage(prod);

      const sellPrice = parseSellPrice(b?.sell_price ?? b?.sellPrice ?? 0);
      const qty = Math.max(0, Number(b?.quantity ?? 0) || 0);

      const daysRaw = b?.days_until_expiry ?? b?.daysUntilExpiry ?? null;
      const days = typeof daysRaw === 'number' && Number.isFinite(daysRaw) ? daysRaw : null;

      const rel = relevanceOverrides?.get(pid);

      const existing = byProduct.get(pid);
      if (!existing) {
        byProduct.set(pid, {
          id: pid,
          name,
          sku,
          // ✅ Price used for the order (we keep the MIN sell price across batches by default)
          attributes: {
            Price: sellPrice,
            mainImage: imageUrl,
          },
          available: qty, // total stock across ALL batches (summed)
          minPrice: sellPrice,
          maxPrice: sellPrice,
          batchesCount: 1,
          expiryDate: b?.expiry_date ?? b?.expiryDate ?? null,
          daysUntilExpiry: days,
          // keep relevance/stage for sorting + debugging
          relevance_score: rel?.score ?? Number((prod as any)?.relevance_score ?? defaultScore) ?? defaultScore,
          search_stage: rel?.stage ?? String((prod as any)?.search_stage ?? defaultStage),
        });
      } else {
        existing.available += qty;
        existing.batchesCount += 1;

        if (sellPrice < existing.minPrice) {
          existing.minPrice = sellPrice;
          existing.attributes.Price = sellPrice;
        }
        if (sellPrice > existing.maxPrice) {
          existing.maxPrice = sellPrice;
        }

        if (days !== null) {
          if (existing.daysUntilExpiry === null || days < existing.daysUntilExpiry) {
            existing.daysUntilExpiry = days;
            existing.expiryDate = b?.expiry_date ?? b?.expiryDate ?? existing.expiryDate;
          }
        }
      }
    }

    return Array.from(byProduct.values());
  };

  const formatPriceRangeLabel = (p: any) => {
    const minP = Number(p?.minPrice ?? p?.attributes?.Price ?? 0);
    const maxP = Number(p?.maxPrice ?? p?.attributes?.Price ?? minP);
    if (Number.isFinite(minP) && Number.isFinite(maxP) && minP !== maxP) {
      return `${minP} - ${maxP} Tk`;
    }
    const v = Number(p?.attributes?.Price ?? minP);
    return `${Number.isFinite(v) ? v : 0} Tk`;
  };

  const calculateAmount = (basePrice: number, qty: number, discPer: number, discTk: number) => {
    const baseAmount = basePrice * qty;
    const percentDiscount = (baseAmount * discPer) / 100;
    const totalDiscount = percentDiscount + discTk;
    return Math.max(0, baseAmount - totalDiscount);
  };

  const getProductUnitPrice = (product: any) => {
    return parseCurrencyNumber(product?.attributes?.Price ?? product?.minPrice ?? product?.price ?? product?.sell_price ?? 0);
  };

  const normalizeQtyForProduct = (product: any, rawQty: any) => {
    const parsedQty = Math.max(1, Math.floor(Number(rawQty) || 1));
    return parsedQty; // Remove hard-cap to allow flexible manual entry
  };

  const buildStagingItem = (product: any, overrides: Partial<StagingItem> = {}): StagingItem => {
    const quantity = normalizeQtyForProduct(product, overrides.quantity ?? 1);
    const discountPercent = String(overrides.discountPercent ?? '');
    const discountTk = String(overrides.discountTk ?? '');
    const parsedAmount = Number(String(overrides.amount ?? '').replace(/[^0-9.-]/g, ''));
    const computedAmount = Number.isFinite(parsedAmount)
      ? Math.max(0, parsedAmount)
      : calculateAmount(getProductUnitPrice(product), quantity, parseFloat(discountPercent) || 0, parseFloat(discountTk) || 0);

    return {
      id: String(overrides.id ?? `stg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      product,
      quantity,
      discountPercent,
      discountTk,
      amount: computedAmount.toFixed(2),
    };
  };

  const updateStagingItem = (
    id: string,
    changes: Partial<StagingItem>,
    mode: 'formula' | 'finalAmount' = 'formula'
  ) => {
    setStagingQueue((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const quantity = normalizeQtyForProduct(item.product, changes.quantity ?? item.quantity);
        const nextDiscountPercent = changes.discountPercent !== undefined ? String(changes.discountPercent) : item.discountPercent;
        const nextDiscountTk = changes.discountTk !== undefined ? String(changes.discountTk) : item.discountTk;
        const baseAmount = getProductUnitPrice(item.product) * quantity;

        if (mode === 'finalAmount') {
          const rawInput = changes.amount !== undefined ? String(changes.amount) : item.amount;
          const rawAmount = Number(rawInput.replace(/[^0-9.-]/g, ''));
          const finalAmount = Number.isFinite(rawAmount) ? Math.max(0, rawAmount) : baseAmount;
          const discountValue = baseAmount - finalAmount;

          // Reverse-calculate discountPercent so the discount persists during quantity changes
          const calculatedDiscountPercent = (baseAmount > 0 && discountValue > 0) 
            ? ((discountValue / baseAmount) * 100).toFixed(2) 
            : '';

          return {
            ...item,
            quantity,
            discountPercent: calculatedDiscountPercent,
            discountTk: '',
            amount: rawInput, // Preserve the exact string user types (to allow decimals like "100.")
          };
        }

        const finalAmount = calculateAmount(
          getProductUnitPrice(item.product),
          quantity,
          parseFloat(nextDiscountPercent) || 0,
          parseFloat(nextDiscountTk) || 0
        );

        return {
          ...item,
          quantity,
          discountPercent: nextDiscountPercent,
          discountTk: nextDiscountTk,
          amount: finalAmount.toFixed(2),
        };
      })
    );
  };

  const handleAutoStageProduct = (product: any) => {
    if (!product) return;
    if (!product?.isDefective && Number(product?.available ?? 0) <= 0) return;

    setStagingQueue((prev) => {
      const existingIndex = prev.findIndex(
        (item) => Number(item.product?.id) === Number(product.id) && !item.product?.isDefective && !product?.isDefective
      );

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const nextQty = normalizeQtyForProduct(product, existing.quantity + 1);
        if (nextQty === existing.quantity) return prev;

        const updated: StagingItem = {
          ...existing,
          quantity: nextQty,
          amount: calculateAmount(
            getProductUnitPrice(product),
            nextQty,
            parseFloat(existing.discountPercent) || 0,
            parseFloat(existing.discountTk) || 0
          ).toFixed(2),
        };

        const copy = [...prev];
        copy[existingIndex] = updated;
        return copy;
      }

      return [...prev, buildStagingItem(product, { quantity: 1 })];
    });

    setSelectedProduct(null);
    setQuantity('');
    setDiscountPercent('');
    setDiscountTk('');
    setAmount('0.00');
  };

  // ✅ Auto-fill Pathao/international delivery fields from previous order
  const prefillDeliveryFromOrder = async (orderId: number) => {
    if (!orderId || orderId === lastPrefilledOrderId) return;

    try {
      // Fetch full order details
      const res = await axios.get(`/orders/${orderId}`);
      const body: any = res.data;
      const order = body?.data ?? body;
      const shipping = order?.shipping_address || order?.delivery_address || {};

      // If Pathao IDs exist -> domestic
      const cityId = shipping?.pathao_city_id ?? shipping?.pathaoCityId;
      const zoneId = shipping?.pathao_zone_id ?? shipping?.pathaoZoneId;
      const areaId = shipping?.pathao_area_id ?? shipping?.pathaoAreaId;

      if (cityId || zoneId || areaId) {
        if (isInternational) setIsInternational(false);

        if (!streetAddress && (shipping?.street || shipping?.address)) {
          setStreetAddress(String(shipping?.street || shipping?.address));
        }
        if (!postalCode && shipping?.postal_code) {
          setPostalCode(String(shipping.postal_code));
        }

        // Ensure city list exists
        if (!pathaoCities?.length) {
          await fetchPathaoCities();
        }

        // City -> load zones -> set zone -> load areas -> set area
        if (!pathaoCityId && cityId) {
          setPathaoCityId(String(cityId));
        }
        if (cityId) {
          await fetchPathaoZones(Number(cityId));
        }
        if (!pathaoZoneId && zoneId) {
          setPathaoZoneId(String(zoneId));
        }
        if (zoneId) {
          await fetchPathaoAreas(Number(zoneId));
        }
        if (!pathaoAreaId && areaId) {
          setPathaoAreaId(String(areaId));
        }

        setLastPrefilledOrderId(orderId);
        return;
      }

      // Otherwise, check if it's explicitly international
      const isActuallyIntl = !!(shipping?.country && String(shipping.country).toLowerCase() !== 'bangladesh');
      
      if (isActuallyIntl) {
        if (!isInternational) setIsInternational(true);
        if (!country && shipping?.country) setCountry(String(shipping.country));
        if (!state && shipping?.state) setState(String(shipping.state));
        if (!internationalCity && shipping?.city) setInternationalCity(String(shipping.city));
        if (!internationalPostalCode && (shipping?.postal_code || shipping?.postalCode)) {
          setInternationalPostalCode(String(shipping?.postal_code || shipping?.postalCode));
        }
        if (!deliveryAddress && (shipping?.street || shipping?.address)) {
          setDeliveryAddress(String(shipping?.street || shipping?.address));
        }
        setLastPrefilledOrderId(orderId);
      } else {
        // It's a domestic order without Pathao IDs (auto location)
        if (isInternational) setIsInternational(false);
        if (!streetAddress && (shipping?.street || shipping?.address)) {
          setStreetAddress(String(shipping?.street || shipping?.address));
        }
        if (!postalCode && shipping?.postal_code) {
          setPostalCode(String(shipping.postal_code));
        }
        setUsePathaoAutoLocation(true);
        setLastPrefilledOrderId(orderId);
      }
    } catch (e) {
      console.warn('Failed to prefill delivery info from last order', e);
    }
  };

  // ✅ Sync typed phone to lookup hook (debounced)
  useEffect(() => {
    if (customerLookup.phone !== userPhone) {
      customerLookup.setPhone(userPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPhone]);

  // ✅ Reflect lookup results into UI + auto-fill basics
  useEffect(() => {
    setIsCheckingCustomer(customerLookup.loading);
    setCustomerCheckError(customerLookup.error);

    const c: any = customerLookup.customer;
    if (c?.id) {
      setExistingCustomer(c);
      if (!userName && c?.name) setUserName(c.name);
      if (!userEmail && c?.email) setUserEmail(c.email);
    } else {
      setExistingCustomer(null);
    }

    const lo: any = customerLookup.lastOrder;
    const ros = Array.isArray(customerLookup.recentOrders)
      ? (customerLookup.recentOrders as RecentOrder[])
      : [];
    setRecentOrders(ros);

    // Prefer the detailed list for UI; fall back to the summary if list isn't available
    if (ros.length > 0) {
      const first = ros[0];
      setLastOrderInfo({
        id: first.id,
        date: first.order_date,
        total_amount: first.total_amount,
        items: Array.isArray(first.items) ? first.items : [],
      });
    } else if (lo?.last_order_id) {
      setLastOrderInfo({
        id: lo.last_order_id,
        date: lo.last_order_date,
        total_amount: lo.last_order_total,
        items: [],
      });
    } else {
      setLastOrderInfo(null);
    }

    // Prefill Pathao/international from last order details (if any)
    if (lo?.last_order_id) {
      prefillDeliveryFromOrder(Number(lo.last_order_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerLookup.customer, customerLookup.lastOrder, customerLookup.recentOrders, customerLookup.loading, customerLookup.error]);

  // 🖼️ Warm cache: thumbnails for items in the recent orders list
  useEffect(() => {
    const ids: number[] = [];
    recentOrders
      .slice(0, 5)
      .forEach((o) => (Array.isArray(o.items) ? o.items.slice(0, 12) : []).forEach((it: any) => {
        const pid = Number(it?.product_id ?? it?.productId ?? it?.product?.id ?? 0) || 0;
        if (pid) ids.push(pid);
      }));
    if (ids.length) ensureRecentThumbs(ids);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentOrders]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      // ── Check for edit-order prefill first (overrides any draft) ──
      const editRaw = sessionStorage.getItem(SC_EDIT_PREFILL_KEY);
      if (editRaw) {
        sessionStorage.removeItem(SC_EDIT_PREFILL_KEY);
        // Also clear any stale draft so prefill values win
        sessionStorage.removeItem(SC_DRAFT_STORAGE_KEY);
        const ep = JSON.parse(editRaw);
        if (ep && typeof ep === 'object') {
          const incomingEditOrderId = Number(ep.editOrderId || 0) || null;
          const incomingEditOrderNumber = typeof ep.editOrderNumber === 'string' ? ep.editOrderNumber : null;
          if (incomingEditOrderId) {
            setEditOrderId(incomingEditOrderId);
            sessionStorage.setItem(
              SC_EDIT_CONTEXT_KEY,
              JSON.stringify({ editOrderId: incomingEditOrderId, editOrderNumber: incomingEditOrderNumber })
            );
          }
          if (incomingEditOrderNumber) setEditOrderNumber(incomingEditOrderNumber);
          if (typeof ep.storeId === 'string') setSelectedStore(ep.storeId);
          if (typeof ep.userName === 'string') setUserName(ep.userName);
          if (typeof ep.userPhone === 'string') setUserPhone(ep.userPhone);
          if (typeof ep.userEmail === 'string') setUserEmail(ep.userEmail);
          if (typeof ep.socialId === 'string') setSocialId(ep.socialId);
          if (typeof ep.orderNotes === 'string') setOrderNotes(ep.orderNotes);
          if (typeof ep.isInternational === 'boolean') setIsInternational(ep.isInternational);
          if (typeof ep.usePathaoAutoLocation === 'boolean') setUsePathaoAutoLocation(ep.usePathaoAutoLocation);
          if (typeof ep.pathaoCityId === 'string') setPathaoCityId(ep.pathaoCityId);
          if (typeof ep.pathaoZoneId === 'string') setPathaoZoneId(ep.pathaoZoneId);
          if (typeof ep.pathaoAreaId === 'string') setPathaoAreaId(ep.pathaoAreaId);
          if (typeof ep.streetAddress === 'string') setStreetAddress(ep.streetAddress);
          if (typeof ep.postalCode === 'string') setPostalCode(ep.postalCode);
          if (typeof ep.country === 'string') setCountry(ep.country);
          if (typeof ep.state === 'string') setState(ep.state);
          if (typeof ep.internationalCity === 'string') setInternationalCity(ep.internationalCity);
          if (typeof ep.internationalPostalCode === 'string') setInternationalPostalCode(ep.internationalPostalCode);
          if (typeof ep.deliveryAddress === 'string') setDeliveryAddress(ep.deliveryAddress);
          if (Array.isArray(ep.cart)) setCart(ep.cart.map(normalizeCartProductForState).filter(Boolean) as CartProduct[]);
          if (typeof ep.paidAmount === 'number') setPaidAmount(ep.paidAmount);
          if (typeof ep.totalAmount === 'number') setTotalAmountState(ep.totalAmount);
          if (typeof ep.outstandingAmount === 'number') setOutstandingAmount(ep.outstandingAmount);
          if (typeof ep.discountAmount === 'number') setDiscountAmountState(ep.discountAmount);
          if (typeof ep.shippingAmount === 'number') setShippingAmountState(ep.shippingAmount);
        }
        draftHydratedRef.current = true;
        return;
      }

      const raw = sessionStorage.getItem(SC_DRAFT_STORAGE_KEY);
      if (!raw) {
        draftHydratedRef.current = true;
        return;
      }
      const d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        const draftEditOrderId = Number(d.editOrderId || 0) || null;
        const draftEditOrderNumber = typeof d.editOrderNumber === 'string' ? d.editOrderNumber : null;
        if (draftEditOrderId) {
          setEditOrderId(draftEditOrderId);
          sessionStorage.setItem(
            SC_EDIT_CONTEXT_KEY,
            JSON.stringify({ editOrderId: draftEditOrderId, editOrderNumber: draftEditOrderNumber })
          );
        }
        if (draftEditOrderNumber) setEditOrderNumber(draftEditOrderNumber);
        if (typeof d.date === 'string') setDate(d.date);
        if (typeof d.salesBy === 'string') setSalesBy(d.salesBy);
        if (typeof d.userName === 'string') setUserName(d.userName);
        if (typeof d.userEmail === 'string') setUserEmail(d.userEmail);
        if (typeof d.userPhone === 'string') setUserPhone(d.userPhone);
        if (typeof d.socialId === 'string') setSocialId(d.socialId);
        if (typeof d.orderNotes === 'string') setOrderNotes(d.orderNotes);
        if (typeof d.isInternational === 'boolean') setIsInternational(d.isInternational);
        if (typeof d.usePathaoAutoLocation === 'boolean') setUsePathaoAutoLocation(d.usePathaoAutoLocation);
        if (typeof d.pathaoCityId === 'string') setPathaoCityId(d.pathaoCityId);
        if (typeof d.pathaoZoneId === 'string') setPathaoZoneId(d.pathaoZoneId);
        if (typeof d.pathaoAreaId === 'string') setPathaoAreaId(d.pathaoAreaId);
        if (typeof d.streetAddress === 'string') setStreetAddress(d.streetAddress);
        if (typeof d.postalCode === 'string') setPostalCode(d.postalCode);
        if (typeof d.country === 'string') setCountry(d.country);
        if (typeof d.state === 'string') setState(d.state);
        if (typeof d.internationalCity === 'string') setInternationalCity(d.internationalCity);
        if (typeof d.internationalPostalCode === 'string') setInternationalPostalCode(d.internationalPostalCode);
        if (typeof d.deliveryAddress === 'string') setDeliveryAddress(d.deliveryAddress);
        if (typeof d.selectedStore === 'string') setSelectedStore(d.selectedStore);
        if (typeof d.searchQuery === 'string') setSearchQuery(d.searchQuery);
        if (typeof d.minPrice === 'string') setMinPrice(d.minPrice);
        if (typeof d.maxPrice === 'string') setMaxPrice(d.maxPrice);
        if (typeof d.exactPrice === 'string') setExactPrice(d.exactPrice);
        if (Array.isArray(d.cart)) setCart(d.cart.map(normalizeCartProductForState).filter(Boolean) as CartProduct[]);
        if (typeof d.paidAmount === 'number') setPaidAmount(d.paidAmount);
        if (typeof d.totalAmountState === 'number') setTotalAmountState(d.totalAmountState);
        if (typeof d.outstandingAmount === 'number') setOutstandingAmount(d.outstandingAmount);
        if (typeof d.discountAmountState === 'number') setDiscountAmountState(d.discountAmountState);
        if (typeof d.shippingAmountState === 'number') setShippingAmountState(d.shippingAmountState);
      }
    } catch (e) {
      console.warn('Failed to restore social commerce draft', e);
    } finally {
      draftHydratedRef.current = true;
    }
  }, []);

  useEffect(() => {
    if (!draftHydratedRef.current) return;
    saveDraftToSession();
  }, [
    date,
    salesBy,
    userName,
    userEmail,
    userPhone,
    socialId,
    orderNotes,
    isInternational,
    usePathaoAutoLocation,
    pathaoCityId,
    pathaoZoneId,
    pathaoAreaId,
    streetAddress,
    postalCode,
    country,
    state,
    internationalCity,
    internationalPostalCode,
    deliveryAddress,
    selectedStore,
    searchQuery,
    minPrice,
    maxPrice,
    exactPrice,
    cart,
    editOrderId,
    editOrderNumber,
    paidAmount,
    totalAmountState,
    outstandingAmount,
    discountAmountState,
    shippingAmountState,
  ]);

  useEffect(() => {
    if (!selectedStore || queueImportingRef.current) return;

    const queued = readQueuedSelections();
    if (!queued.length) return;

    const run = async () => {
      queueImportingRef.current = true;
      try {
        const storeId = Number(selectedStore);
        if (!Number.isFinite(storeId) || storeId <= 0) return;

        const ids = queued.map((q: any) => Number(q?.id || 0)).filter((id: number) => id > 0);
        if (!ids.length) {
          clearQueuedSelections();
          return;
        }

        const batches = await batchService.getBatchesAll({
          store_id: storeId,
          status: 'available',
          product_ids: ids.join(',')
        });

        const idSet = new Set(ids);
        const matchedBatches = (batches || []).filter((b: any) => {
          const pid = Number(b?.product?.id ?? b?.product_id ?? 0);
          return idSet.has(pid);
        });
        const productResults = buildProductResultsFromBatches(matchedBatches, { defaultStage: 'queue', defaultScore: 0 });
        const byId = new Map<number, any>(productResults.map((p: any) => [Number(p.id), p]));

        const missingNames: string[] = [];
        const selectedProducts: any[] = [];
        for (const q of queued) {
          const pid = Number(q?.id || 0);
          const qty = Math.max(1, Math.floor(Number(q?.qty) || 1));
          const p = byId.get(pid);
          if (!p || Number(p?.available ?? 0) <= 0) {
            missingNames.push(String(q?.name || `#${pid}`));
            continue;
          }
          for (let i = 0; i < qty; i += 1) {
            selectedProducts.push(p);
          }
        }

        let addedCount = 0;
        const stockLimitedNames: string[] = [];

        if (selectedProducts.length) {
          setStagingQueue((prev) => {
            const next = [...prev];
            const queuedCountByPid = new Map<number, number>();

            for (const p of selectedProducts) {
              const pid = Number(p.id);
              const name = String(p?.name || `#${pid}`);
              const price = Number(String(p?.attributes?.Price ?? '0').replace(/[^0-9.-]/g, '')) || 0;
              const available = Math.max(0, Number(p?.available ?? 0) || 0);

              const alreadyInCartQty = cart
                .filter((item) => !item.isService && !item.isDefective && Number(item.product_id) === pid)
                .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

              const alreadyInStagingQty = next
                .filter((item) => Number(item.product?.id || 0) === pid)
                .reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

              const queuedUsed = queuedCountByPid.get(pid) || 0;
              if (alreadyInCartQty + alreadyInStagingQty + queuedUsed + 1 > available) {
                stockLimitedNames.push(name);
                continue;
              }

              const existingIndex = next.findIndex((item) => Number(item.product?.id || 0) === pid);
              if (existingIndex >= 0) {
                const ex = next[existingIndex];
                const newQty = (Number(ex.quantity) || 0) + 1;
                const dTk = Number(ex.discountTk) || 0;
                next[existingIndex] = {
                  ...ex,
                  quantity: newQty,
                  amount: Math.max(0, (price * newQty) - dTk).toFixed(2),
                };
              } else {
                next.push({
                  id: `queued-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  product: p,
                  quantity: 1,
                  discountPercent: '',
                  discountTk: '',
                  amount: price.toFixed(2),
                });
              }

              queuedCountByPid.set(pid, queuedUsed + 1);
              addedCount += 1;
            }

            return next;
          });
        }

        clearQueuedSelections();

        if (addedCount > 0) {
          if (missingNames.length || stockLimitedNames.length) {
            showToast(
              `Added ${addedCount} queued product(s). ${missingNames.length + stockLimitedNames.length} could not be added for this store/stock.`,
              'success'
            );
          } else {
            showToast(`Added ${addedCount} product(s) from Product List`, 'success');
          }
        } else if (missingNames.length || stockLimitedNames.length) {
          showToast('Queued products are not available in the selected store', 'error');
        }
      } catch (e) {
        console.error('Failed to import queued products', e);
      } finally {
        queueImportingRef.current = false;
      }
    };

    run();
  }, [selectedStore]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const defectId = urlParams.get('defect');

    if (defectId) {
      console.log('🔍 DEFECT ID IN URL:', defectId);

      const defectData = sessionStorage.getItem('defectItem');
      console.log('📦 Checking sessionStorage:', defectData);

      if (defectData) {
        try {
          const defect = JSON.parse(defectData);
          console.log('✅ Loaded defect from sessionStorage:', defect);

          if (!defect.batchId) {
            console.error('❌ Missing batch_id in defect data');
            showToast('Error: Defect item is missing batch information', 'error');
            return;
          }

          setDefectiveProduct(defect);

          const defectCartItem: CartProduct = {
            id: Date.now(),
            product_id: defect.productId,
            batch_id: defect.batchId,
            productName: `${defect.productName}`,
            quantity: 1,
            unit_price: defect.sellingPrice || 0,
            discount_amount: 0,
            amount: defect.sellingPrice || 0,
            isDefective: true,
            defectId: defect.id,
          };

          setCart([defectCartItem]);
          showToast(`Defective item added to cart: ${defect.productName}`, 'success');
          sessionStorage.removeItem('defectItem');
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

  useEffect(() => {
    const userName = localStorage.getItem('userName') || '';
    setSalesBy(userName);

    const loadInitialData = async () => {
      await fetchStores();
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedStore) {
      setAvailableBatchCount(null);
      setSearchResults([]);
      batchesLoadRef.current = null;
      return;
    }

    // ✅ lightweight: only fetch counts (no batch download)
    fetchStoreBatchCount(selectedStore);

    // Reset cache when store changes (batches will be loaded on-demand when searching)
    batchesLoadRef.current = null;

    // Do not auto-load batches/products; wait for user to type or set price filters
    setSelectedProduct(null);
    setSearchResults([]);
  }, [selectedStore]);

  // ✅ Load Pathao cities only when domestic + manual selection mode
  useEffect(() => {
    if (isInternational) {
      // reset domestic fields if switching to international
      setPathaoCityId('');
      setPathaoZoneId('');
      setPathaoAreaId('');
      setPathaoZones([]);
      setPathaoAreas([]);
      return;
    }

    // Domestic
    if (usePathaoAutoLocation) {
      // Auto mode: clear selections (Pathao will map from address text)
      setPathaoCityId('');
      setPathaoZoneId('');
      setPathaoAreaId('');
      setPathaoZones([]);
      setPathaoAreas([]);
      return;
    }

    // Manual mode
    fetchPathaoCities();
  }, [isInternational, usePathaoAutoLocation]);

  // ✅ Fetch zones when city changes
  useEffect(() => {
    if (isInternational) return;
    if (usePathaoAutoLocation) return;
    if (!pathaoCityId) {
      setPathaoZoneId('');
      setPathaoAreaId('');
      setPathaoZones([]);
      setPathaoAreas([]);
      return;
    }
    fetchPathaoZones(Number(pathaoCityId));
    setPathaoZoneId('');
    setPathaoAreaId('');
    setPathaoAreas([]);
  }, [pathaoCityId, isInternational]);

  // ✅ Fetch areas when zone changes
  useEffect(() => {
    if (isInternational) return;
    if (usePathaoAutoLocation) return;
    if (!pathaoZoneId) {
      setPathaoAreaId('');
      setPathaoAreas([]);
      return;
    }
    fetchPathaoAreas(Number(pathaoZoneId));
    setPathaoAreaId('');
  }, [pathaoZoneId, isInternational]);

  
  useEffect(() => {
    const hasPriceFilter = Boolean(minPrice.trim() || maxPrice.trim() || exactPrice.trim());

    if (!selectedStore) {
      setSearchResults([]);
      return;
    }

    if (!searchQuery.trim() && !hasPriceFilter) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const storeId = Number(selectedStore);
      if (!Number.isFinite(storeId) || storeId <= 0) {
        setSearchResults([]);
        return;
      }

      const min = minPrice.trim() !== '' && Number.isFinite(Number(minPrice)) ? Number(minPrice) : undefined;
      const max = maxPrice.trim() !== '' && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : undefined;
      const exact = exactPrice.trim() !== '' && Number.isFinite(Number(exactPrice)) ? Number(exactPrice) : undefined;

      const q = String(searchQuery || '').trim();

      setIsSearching(true);

      try {
        // Single unified search using batchService
        const batches = await batchService.getBatchesAll({
          store_id: storeId,
          status: 'available',
          search: q || undefined,
          min_sell_price: min,
          max_sell_price: max,
          exact_price: exact,
        }, { max_items: 2000 }); // Fast search with capped results

        const results = buildProductResultsFromBatches(batches, {
          defaultStage: q ? 'advanced' : 'price',
          defaultScore: 0,
        });

        // Optional local sanity filter for price
        const finalResults = results.filter((p: any) => {
          const price = Number(p?.attributes?.Price ?? p?.minPrice ?? 0);
          if (exact !== undefined && price !== exact) return false;
          if (min !== undefined && price < min) return false;
          if (max !== undefined && price > max) return false;
          return true;
        });

        // Sort: cheaper batches first
        finalResults.sort((a: any, b: any) => {
          return Number(a?.attributes?.Price ?? 0) - Number(b?.attributes?.Price ?? 0);
        });

        setSearchResults(finalResults);
      } catch (error) {
        console.error('❌ Social commerce search failed:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 350);

    return () => clearTimeout(delayDebounce);
  }, [selectedStore, searchQuery, minPrice, maxPrice, exactPrice]);

  useEffect(() => {
    if (selectedProduct && quantity) {
      const price = parseFloat(String(selectedProduct.attributes?.Price || 0));
      const qty = parseFloat(quantity) || 0;
      const discPer = parseFloat(discountPercent) || 0;
      const discTk = parseFloat(discountTk) || 0;

      const finalAmount = calculateAmount(price, qty, discPer, discTk);
      setAmount(finalAmount.toFixed(2));
    } else {
      setAmount('0.00');
    }
  }, [selectedProduct, quantity, discountPercent, discountTk]);

  const handleProductSelect = (product: any) => {
    handleAutoStageProduct(product);
  };

  const handleFinalAmountChange = (rawValue: string) => {
    setAmount(rawValue);

    if (!selectedProduct) {
      setDiscountPercent('');
      setDiscountTk('');
      return;
    }

    if (String(rawValue).trim() === '') {
      setDiscountPercent('');
      setDiscountTk('');
      return;
    }

    const price = Number(String(selectedProduct.attributes?.Price ?? '0').replace(/[^0-9.-]/g, ''));
    const qty = parseFloat(quantity) || 0;
    const baseAmount = Math.max(0, price * qty);

    if (qty <= 0 || baseAmount <= 0) {
      setDiscountPercent('');
      setDiscountTk('');
      return;
    }

    const parsedAmount = Number(String(rawValue).replace(/[^0-9.-]/g, ''));
    if (!Number.isFinite(parsedAmount)) {
      setDiscountPercent('');
      setDiscountTk('');
      return;
    }

    const clampedFinalAmount = Math.min(baseAmount, Math.max(0, parsedAmount));
    const discountValue = Math.max(0, baseAmount - clampedFinalAmount);

    setDiscountPercent('');
    setDiscountTk(discountValue ? discountValue.toFixed(2) : '0');
    setAmount(clampedFinalAmount.toFixed(2));
  };

  const addToCart = () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      alert('Please select a product and enter quantity');
      return;
    }

    const price = Number(String(selectedProduct.attributes?.Price ?? '0').replace(/[^0-9.-]/g, ''));
    const qty = parseInt(quantity);
    const discPer = parseFloat(discountPercent) || 0;
    const discTk = parseFloat(discountTk) || 0;

    if (qty > selectedProduct.available && !selectedProduct.isDefective) {
      alert(`Only ${selectedProduct.available} units available in this store`);
      return;
    }

    const baseAmount = price * qty;
    const discountValue = discPer > 0 ? (baseAmount * discPer) / 100 : discTk;
    const finalAmount = baseAmount - discountValue;

    const newItem: CartProduct = {
      id: Date.now(),
      product_id: selectedProduct.id,
      batch_id: null,
      productName: `${selectedProduct.name}`,
      quantity: qty,
      unit_price: price,
      discount_amount: discountValue,
      amount: finalAmount,
      isDefective: selectedProduct.isDefective,
      defectId: selectedProduct.defectId,
    };

    console.log('✅ Adding to cart:', {
      product_id: newItem.product_id,
      batch_id: newItem.batch_id,
      isDefective: newItem.isDefective,
    });

    setCart([...cart, newItem]);
    setSelectedProduct(null);
    setQuantity('');
    setDiscountPercent('');
    setDiscountTk('');
    setAmount('0.00');
  };

  const removeFromCart = (id: number | string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  // ── Multi-product staging ──────────────────────────────────────────────────
  const addToStaging = () => {
    if (!selectedProduct || !quantity || parseInt(quantity) <= 0) {
      alert('Please select a product and enter quantity');
      return;
    }
    const price = Number(String(selectedProduct.attributes?.Price ?? '0').replace(/[^0-9.-]/g, ''));
    const qty = parseInt(quantity);
    const discPer = parseFloat(discountPercent) || 0;
    const discTk = parseFloat(discountTk) || 0;
    if (qty > selectedProduct.available && !selectedProduct.isDefective) {
      alert(`Only ${selectedProduct.available} units available in this store`);
      return;
    }
    const finalAmount = calculateAmount(price, qty, discPer, discTk);
    setStagingQueue((prev) => [
      ...prev,
      {
        id: `stg-${Date.now()}-${Math.random()}`,
        product: selectedProduct,
        quantity: qty,
        discountPercent,
        discountTk,
        amount: finalAmount.toFixed(2),
      },
    ]);
    // Reset selection so user can immediately search next product
    setSelectedProduct(null);
    setQuantity('');
    setDiscountPercent('');
    setDiscountTk('');
    setAmount('0.00');
    setSearchQuery('');
    setSearchResults([]);
  };

  const removeStagingItem = (id: string) => {
    setStagingQueue((prev) => prev.filter((s) => s.id !== id));
  };

  const addAllStagedToCart = () => {
    if (stagingQueue.length === 0) return;
    const newItems: CartProduct[] = stagingQueue.map((s) => {
      const price = Number(String(s.product.attributes?.Price ?? '0').replace(/[^0-9.-]/g, ''));
      const discPer = parseFloat(s.discountPercent) || 0;
      const discTk = parseFloat(s.discountTk) || 0;
      const baseAmount = price * s.quantity;
      const discountValue = discPer > 0 ? (baseAmount * discPer) / 100 : discTk;
      return {
        id: Date.now() + Math.random(),
        product_id: s.product.id,
        batch_id: null,
        productName: s.product.name,
        quantity: s.quantity,
        unit_price: price,
        discount_amount: discountValue,
        amount: baseAmount - discountValue,
        isDefective: s.product.isDefective,
        defectId: s.product.defectId,
      };
    });
    setCart((prev) => [...prev, ...newItems]);
    setStagingQueue([]);
  };

  /**
   * ✅ NEW: Add service to cart
   */
  const addServiceToCart = (service: ServiceItem) => {
    const newItem: CartProduct = {
      id: `service-${Date.now()}`,
      product_id: 0, // Services don't have product ID
      batch_id: 0, // Services don't have batch ID
      productName: service.serviceName,
      quantity: service.quantity,
      unit_price: service.price,
      discount_amount: 0,
      amount: service.amount,
      isService: true,
      serviceId: service.serviceId,
      serviceCategory: service.category,
    };

    setCart([...cart, newItem]);
  };

  const stagedQtyByProductId = stagingQueue.reduce<Record<number, number>>((acc, item) => {
    const productId = Number(item.product?.id ?? 0);
    if (productId > 0) {
      acc[productId] = (acc[productId] || 0) + (Number(item.quantity) || 0);
    }
    return acc;
  }, {});

  const subtotal = cart.reduce((sum, item) => sum + item.amount, 0);

  const handleConfirmOrder = async () => {
    let cleanPhone = userPhone ? userPhone.replace(/\D/g, '') : '';
    if (cleanPhone.startsWith('880')) {
      cleanPhone = '0' + cleanPhone.slice(3);
    }

    if (!userName || !cleanPhone) {
      alert('Please fill in customer name and phone number');
      return;
    }

    if (cleanPhone.length !== 11) {
      alert('Mobile number must be exactly 11 digits.');
      return;
    }
    if (cart.length === 0) {
      alert('Please add products to cart');
      return;
    }
    if (!selectedStore) {
      alert('Please select a store');
      return;
    }

    // ✅ Always delivery validation
    if (isInternational) {
      if (!country || !internationalCity || !deliveryAddress) {
        alert('Please fill in international address');
        return;
      }
    } else {
      // Domestic
      if (!streetAddress) {
        alert('Please enter a full address (e.g., House/Road/Sector, Uttara, Dhaka)');
        return;
      }

      // Manual Pathao selection is only required when auto-location is OFF
      if (!usePathaoAutoLocation && (!pathaoCityId || !pathaoZoneId || !pathaoAreaId)) {
        alert('Please select City/Zone/Area OR turn on Auto-detect Pathao location');
        return;
      }
    }

    // ⚠️ Duplicate protection: warn if there is an order today already
    if (lastOrderInfo && lastOrderInfo.date) {
      const lastDate = new Date(lastOrderInfo.date);
      const now = new Date();
      const sameDay = lastDate.toDateString() === now.toDateString();

      if (sameDay) {
        const summaryText = lastOrderInfo.summary_text || '';
        const confirmMsg = `This customer already has an order today.\n\nLast order: ${lastDate.toLocaleString()}\n${
          summaryText ? `Items: ${summaryText}\n` : ''
        }\nDo you still want to place another order?`;

        const proceed = window.confirm(confirmMsg);
        if (!proceed) return;
      }
    }

    try {
      console.log(editOrderId ? '✏️ EDITING SOCIAL COMMERCE ORDER' : '📦 CREATING SOCIAL COMMERCE ORDER');

      const isDomesticAuto = !isInternational && usePathaoAutoLocation;

      const cityObj = isDomesticAuto
        ? undefined
        : pathaoCities.find((c) => String(c.city_id) === String(pathaoCityId));
      const zoneObj = isDomesticAuto
        ? undefined
        : pathaoZones.find((z) => String(z.zone_id) === String(pathaoZoneId));
      const areaObj = isDomesticAuto
        ? undefined
        : pathaoAreas.find((a) => String(a.area_id) === String(pathaoAreaId));

      const formattedCustomerAddress = isInternational
        ? `${deliveryAddress}, ${internationalCity}${state ? ', ' + state : ''}, ${country}${internationalPostalCode ? ' - ' + internationalPostalCode : ''}`
        : (() => {
            // Domestic
            if (isDomesticAuto) {
              return `${streetAddress}${postalCode ? ' - ' + postalCode : ''}`;
            }
            const parts = [streetAddress, areaObj?.area_name, zoneObj?.zone_name, cityObj?.city_name].filter(Boolean);
            const base = parts.join(', ');
            return base + (postalCode ? ` - ${postalCode}` : '');
          })();

      const deliveryAddressForUi = isInternational
        ? {
            country,
            state: state || '',
            city: internationalCity,
            postalCode: internationalPostalCode || '',
            address: deliveryAddress,
          }
        : {
            auto_pathao_location: isDomesticAuto,
            city: cityObj?.city_name || '',
            zone: zoneObj?.zone_name || '',
            area: areaObj?.area_name || '',
            postalCode: postalCode || '',
            address: streetAddress,
          };

      const shipping_address = isInternational
        ? {
            name: userName,
            phone: cleanPhone,
            address_line1: deliveryAddress,
            street: deliveryAddress,
            city: internationalCity,
            state: state || undefined,
            country: country || 'Bangladesh',
            postal_code: internationalPostalCode || undefined,
          }
        : (() => {
            // Domestic
            const base: any = {
              name: userName,
              phone: cleanPhone,
              address_line1: streetAddress,
              street: streetAddress,
              city: cityObj?.city_name || 'Dhaka',
              country: 'Bangladesh',
              postal_code: postalCode || undefined,
            };

            // Manual: include IDs + names
            if (!isDomesticAuto) {
              return {
                ...base,
                area: areaObj?.area_name || '',
                pathao_city_id: pathaoCityId ? Number(pathaoCityId) : undefined,
                pathao_zone_id: pathaoZoneId ? Number(pathaoZoneId) : undefined,
                pathao_area_id: pathaoAreaId ? Number(pathaoAreaId) : undefined,
              };
            }

            // Auto: no IDs (Pathao will map from text)
            return base;
          })();

      let effectiveEditOrderId = editOrderId;
      let effectiveEditOrderNumber = editOrderNumber;
      if (!effectiveEditOrderId) {
        try {
          const ctx = JSON.parse(sessionStorage.getItem(SC_EDIT_CONTEXT_KEY) || '{}');
          effectiveEditOrderId = Number(ctx.editOrderId || 0) || null;
          effectiveEditOrderNumber = effectiveEditOrderNumber || (typeof ctx.editOrderNumber === 'string' ? ctx.editOrderNumber : null);
        } catch {
          // ignore bad session data
        }
      }

      const orderData = {
        order_type: 'social_commerce',
        ...(effectiveEditOrderId ? { editOrderId: effectiveEditOrderId } : {}),
        ...(effectiveEditOrderNumber ? { editOrderNumber: effectiveEditOrderNumber } : {}),
        store_id: parseInt(selectedStore),
        customer: {
          name: userName,
          email: userEmail || undefined,
          phone: cleanPhone,
          // UI display only
          address: formattedCustomerAddress,
        },
        shipping_address,
        // ✅ Separate products and services
        items: cart
          .filter((item) => !item.isService)
          .map((item) => ({
            ...(item.id ? { id: item.id } : {}),
            product_id: item.product_id,
            ...(item.batch_id ? { batch_id: item.batch_id } : {}),
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
          })),
        // ✅ NEW: Add services array
        services: cart
          .filter((item) => item.isService)
          .map((item) => ({
            service_id: item.serviceId,
            service_name: item.productName,
            quantity: item.quantity,
            unit_price: item.unit_price,
            discount_amount: item.discount_amount,
            total_amount: item.amount,
            category: item.serviceCategory,
          })),
        shipping_amount: shippingAmountState || 0,
        discount_amount: discountAmountState || 0,
        notes: orderNotes?.trim() || '',
      };

      sessionStorage.setItem(
        'pendingOrder',
        JSON.stringify({
          ...orderData,
          salesBy,
          date,
          isInternational,
          subtotal,
          deliveryAddress: deliveryAddressForUi,

          defectiveItems: cart
            .filter((item) => item.isDefective)
            .map((item) => ({
              defectId: item.defectId,
              price: item.unit_price,
              productName: item.productName,
            })),
          paid_amount: paidAmount,
          outstanding_amount: outstandingAmount,
          total_amount: totalAmountState,
          original_discount_amount: discountAmountState,
          original_shipping_amount: shippingAmountState,
        })
      );

      console.log('✅ Order data prepared, redirecting...');
      window.location.href = '/social-commerce/amount-details';
    } catch (error) {
      console.error('❌ Error:', error);
      alert('Failed to process order');
    }
  };

  return (
    <div className={darkMode ? 'dark' : ''}>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

        <div className="flex-1 flex flex-col overflow-hidden">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

          <main className="flex-1 overflow-auto p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">Social Commerce</h1>
                  <button
                    onClick={handleResetAll}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 dark:bg-red-900/10 dark:text-red-400 dark:border-red-800 transition-colors shadow-sm"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset Order / Clear All
                  </button>
                </div>

                {editOrderId && (
                  <div className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700 rounded-lg">
                    <span className="text-base">✏️</span>
                    <span className="text-sm font-medium text-amber-900 dark:text-amber-200">
                      Editing Order <span className="font-bold">#{editOrderNumber}</span> — adjust the details and cart, then proceed to Amount Details as usual.
                    </span>
                    <button
                      type="button"
                      onClick={() => { setEditOrderId(null); setEditOrderNumber(null); }}
                      className="ml-auto text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {defectiveProduct && (
                  <div className="w-full sm:w-auto flex items-center flex-wrap gap-2 px-4 py-2 bg-orange-100 dark:bg-orange-900/30 border border-orange-300 dark:border-orange-700 rounded-lg">
                    <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-sm font-medium text-orange-900 dark:text-orange-300">
                      Defective Item: {defectiveProduct.productName}
                    </span>
                  </div>
                )}
              </div>

              <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <div className="w-full sm:w-auto">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">Sales By</label>
                  <input
                    type="text"
                    value={salesBy}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="w-full sm:w-auto">
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                    Store
                  </label>
                  <input
                    type="text"
                    value={stores.length > 0 ? stores[0].name : 'Loading...'}
                    readOnly
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  {selectedStore && isLoadingData && <p className="mt-1 text-xs text-blue-600">Loading store info...</p>}
                  {selectedStore && !isLoadingData && typeof availableBatchCount === 'number' && (
                    <p className="mt-1 text-xs text-green-600">{availableBatchCount} batches available</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
                {/* Left Column - Customer Info & Address */}
                <div className="space-y-4 md:space-y-6">
                  {/* Customer Information */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-5">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-4">Customer Information</h3>

                    <div className="space-y-3">
                      {/* 1. Name */}
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">User Name*</label>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                      </div>

                      {/* 2. Contact (Phone) */}
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">User Phone Number*</label>
                        <input
                          type="text"
                          placeholder="Phone Number"
                          value={userPhone}
                          onChange={(e) => setUserPhone(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        {isCheckingCustomer && (
                          <p className="mt-1 text-xs text-blue-600 dark:text-blue-400">
                            Checking existing customer & last order...
                          </p>
                        )}
                        {customerCheckError && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{customerCheckError}</p>
                        )}
                        {existingCustomer && (
                          <div className="mt-2 p-2 rounded border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/60 text-xs text-gray-800 dark:text-gray-100">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                              <div className="space-y-1">
                                <p className="font-semibold">
                                  Existing Customer: {existingCustomer.name}{' '}
                                  {existingCustomer.customer_code ? `(${existingCustomer.customer_code})` : ''}
                                </p>
                                <p>
                                  Total Orders: <span className="font-medium">{existingCustomer.total_orders ?? 0}</span>
                                </p>
                                {/* Customer Tags (view + manage) */}
                                <CustomerTagManager
                                  customerId={existingCustomer.id}
                                  initialTags={Array.isArray(existingCustomer.tags) ? existingCustomer.tags : []}
                                  compact
                                  onTagsChange={(next: any) =>
                                    setExistingCustomer((prev: any) => (prev ? { ...prev, tags: next } : prev))
                                  }
                                />
                                {recentOrders.length > 0 ? (
                                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/40 dark:bg-amber-900/15">
                                    <p className="text-sm font-extrabold tracking-wide text-amber-900 dark:text-amber-100">
                                      LAST 5 ORDERS
                                    </p>

                                    <div className="mt-2 space-y-2 max-h-56 overflow-auto pr-1">
                                      {recentOrders.slice(0, 5).map((o, idx) => (
                                        <div
                                          key={o.id}
                                          className="rounded-lg border border-amber-200/70 bg-white/70 p-2 dark:border-amber-700/40 dark:bg-black/10"
                                        >
                                          <div className="flex items-start justify-between gap-3">
                                            <p className="text-[11px] font-bold text-amber-900 dark:text-amber-100">
                                              {idx === 0 ? 'Most recent:' : `#${idx + 1}:`}{' '}
                                              <span className="text-gray-900 dark:text-white">
                                                {o.order_number ? `Order ${o.order_number}` : `Order ID ${o.id}`}
                                              </span>
                                            </p>
                                            <div className="flex items-center gap-2 whitespace-nowrap">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.preventDefault();
                                                  e.stopPropagation();
                                                  openOrderPreview(o.id);
                                                }}
                                                className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-200 dark:border-amber-700/50 dark:bg-amber-900/30 dark:text-amber-100 dark:hover:bg-amber-900/45"
                                                title="View full order"
                                              >
                                                <FileText className="h-3.5 w-3.5" />
                                                View
                                              </button>
                                              <p className="text-[11px] font-bold text-gray-900 dark:text-white bg-amber-100/50 dark:bg-amber-900/30 px-1.5 py-0.5 rounded">
                                                {formatOrderDateTime(o.order_date)}
                                              </p>
                                            </div>
                                          </div>

                                          <div className="mt-1 flex items-start justify-between gap-3">
                                            <div className="text-[11px] text-gray-700 dark:text-gray-200">
                                              {Array.isArray(o.items) && o.items.length > 0 ? (
                                                <div className="space-y-0.5">
                                                  {o.items.slice(0, 6).map((it: any, i: number) => {
                                                    const name = it.product_name || 'Unnamed product';
                                                    const src = getRecentItemThumbSrc(it);
                                                    return (
                                                      <div key={`${o.id}-${i}`} className="flex items-center gap-2">
                                                        <button
                                                          type="button"
                                                          onClick={() => openImageModal(src, name)}
                                                          className="group relative h-8 w-8 flex-shrink-0 overflow-hidden rounded border border-amber-200 bg-white dark:border-amber-700/40 dark:bg-black/20 focus:outline-none focus:ring-2 focus:ring-amber-500"
                                                          title="View image"
                                                        >
                                                          <img
                                                            src={src}
                                                            alt={name}
                                                            className="h-8 w-8 object-cover transition-transform duration-200 group-hover:scale-[1.05]"
                                                            onError={(e) => {
                                                              e.currentTarget.src = '/placeholder-product.png';
                                                            }}
                                                          />
                                                        </button>
                                                        <div className="min-w-0 truncate">
                                                          • {name}
                                                          {it.quantity ? ` ×${it.quantity}` : ''}
                                                        </div>
                                                      </div>
                                                    );
                                                  })}
                                                  {o.items.length > 6 && (
                                                    <div className="text-gray-500 dark:text-gray-300 italic">
                                                      + {o.items.length - 6} more
                                                    </div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="text-gray-500 dark:text-gray-300 italic">Items not available</div>
                                              )}
                                            </div>

                                            <div className="text-[11px] font-semibold text-gray-900 dark:text-white whitespace-nowrap">
                                              {formatBDT((o as any)?.total_amount)}
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <p className="mt-1 text-gray-600 dark:text-gray-300">No previous orders found for this customer.</p>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 3. Address (street) */}
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                          {isInternational ? 'Street Address*' : (usePathaoAutoLocation ? 'Full Address*' : 'Street Address*')}
                        </label>
                        {isInternational ? (
                          <textarea
                            placeholder="Full Address"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            rows={3}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        ) : (
                          <textarea
                            placeholder={
                              usePathaoAutoLocation
                                ? 'House 71, Road 15, Sector 11, Uttara, Dhaka'
                                : 'House 12, Road 5, etc.'
                            }
                            value={streetAddress}
                            onChange={(e) => setStreetAddress(e.target.value)}
                            rows={usePathaoAutoLocation ? 3 : 2}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        )}
                      </div>

                      {/* 4. Postal Code */}
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                        <input
                          type="text"
                          placeholder="e.g., 1212"
                          value={isInternational ? internationalPostalCode : postalCode}
                          onChange={(e) =>
                            isInternational
                              ? setInternationalPostalCode(e.target.value)
                              : setPostalCode(e.target.value)
                          }
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                      </div>

                      {/* 5. Email */}
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">User Email</label>
                        <input
                          type="email"
                          placeholder="sample@email.com (optional)"
                          value={userEmail}
                          onChange={(e) => setUserEmail(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                      </div>

                      {/* 6. Social ID */}
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Social ID</label>
                        <input
                          type="text"
                          placeholder="Enter Social ID"
                          value={socialId}
                          onChange={(e) => setSocialId(e.target.value)}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                      </div>

                      {/* 7. Domestic / International toggle */}
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (!isInternational) return;
                            setIsInternational(false);
                            setCountry(''); setState(''); setInternationalCity('');
                            setInternationalPostalCode(''); setDeliveryAddress('');
                          }}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            !isInternational
                              ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 border-gray-900 dark:border-gray-100'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          🏠 Domestic
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (isInternational) return;
                            setIsInternational(true);
                            setPathaoCityId(''); setPathaoZoneId(''); setPathaoAreaId('');
                            setPathaoZones([]); setPathaoAreas([]);
                            setStreetAddress(''); setPostalCode('');
                          }}
                          className={`flex-1 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                            isInternational
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                          }`}
                        >
                          <Globe className="w-3 h-3 inline mr-1" />
                          International
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* ✅ NEW: Service Selector */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <ServiceSelector 
                      onAddService={addServiceToCart}
                      darkMode={darkMode}
                      allowManualPrice={true}
                    />
                  </div>

                  {/* Delivery Address */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 md:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Delivery Details
                        <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded-full ${isInternational ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                          {isInternational ? '🌍 International' : '🏠 Domestic'}
                        </span>
                      </h3>
                    </div>

                    {isInternational ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Country*</label>
                          <input
                            type="text"
                            placeholder="Enter Country"
                            value={country}
                            onChange={(e) => setCountry(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">State/Province</label>
                          <input
                            type="text"
                            placeholder="Enter State"
                            value={state}
                            onChange={(e) => setState(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">City*</label>
                          <input
                            type="text"
                            placeholder="Enter City"
                            value={internationalCity}
                            onChange={(e) => setInternationalCity(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {/* ✅ Auto-detect toggle (recommended) */}
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20 p-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-900 dark:text-white">Auto-detect Pathao location</p>
                            <p className="mt-0.5 text-[11px] text-gray-600 dark:text-gray-300">
                              When ON, City/Zone/Area are not required. Pathao will infer the location from the full address text.
                            </p>
                          </div>
                          <label className="inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={usePathaoAutoLocation}
                              onChange={(e) => setUsePathaoAutoLocation(e.target.checked)}
                              className="h-4 w-4"
                            />
                          </label>
                        </div>

                        {!usePathaoAutoLocation && (
                          <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">City (Pathao)*</label>
                                <select
                                  value={pathaoCityId}
                                  onChange={(e) => setPathaoCityId(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                  <option value="">Select City</option>
                                  {pathaoCities.map((c) => (
                                    <option key={c.city_id} value={c.city_id}>
                                      {c.city_name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              <div>
                                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Zone (Pathao)*</label>
                                <select
                                  value={pathaoZoneId}
                                  onChange={(e) => setPathaoZoneId(e.target.value)}
                                  disabled={!pathaoCityId}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                                >
                                  <option value="">Select Zone</option>
                                  {pathaoZones.map((z) => (
                                    <option key={z.zone_id} value={z.zone_id}>
                                      {z.zone_name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Area (Pathao)*</label>
                              <select
                                value={pathaoAreaId}
                                onChange={(e) => setPathaoAreaId(e.target.value)}
                                disabled={!pathaoZoneId}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                              >
                                <option value="">Select Area</option>
                                {pathaoAreas.map((a) => (
                                  <option key={a.area_id} value={a.area_id}>
                                    {a.area_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </>
                        )}

                        {usePathaoAutoLocation && (
                          <p className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                            Tip: include area + city (e.g., <span className="font-semibold">Uttara, Dhaka</span>) in the address above.
                          </p>
                        )}
                      </div>
                    )}

                    <div className="mt-4">
                      <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Order Notes</label>
                      <textarea
                        placeholder="Special instructions, landmark, preferred delivery note, packaging note, etc."
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                      />
                    </div>
                  </div>
                </div>

                {/* Right Column - Product Search & Cart */}
                <div className="space-y-4 md:space-y-6">
                  {/* Product Search */}
                  <div
                    className={`bg-white dark:bg-gray-800 rounded-lg border p-4 md:p-5 ${
                      selectedProduct?.isDefective
                        ? 'border-orange-300 dark:border-orange-700'
                        : 'border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Search Product</h3>
                      {selectedProduct?.isDefective && (
                        <span className="px-2 py-1 bg-orange-500 text-white text-xs font-medium rounded">
                          Defective Product
                        </span>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                      <input
                        type="text"
                        placeholder={
                          !selectedStore
                            ? 'Select a store first...'
                            : isSearching
                            ? 'Searching...'
                            : 'Type to search product...'
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!selectedStore}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-2 sm:flex-shrink-0">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Min ৳"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          disabled={!selectedStore || !!exactPrice}
                          className="w-full sm:w-20 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Max ৳"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          disabled={!selectedStore || !!exactPrice}
                          className="w-full sm:w-20 px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Exact ৳"
                          value={exactPrice}
                          onChange={(e) => {
                            setExactPrice(e.target.value);
                            if (e.target.value) {
                              setMinPrice('');
                              setMaxPrice('');
                            }
                          }}
                          disabled={!selectedStore}
                          title="Search for a specific exact price. Disables Min/Max."
                          className="w-full sm:w-24 px-2 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded bg-blue-50 dark:bg-blue-900/30 text-gray-900 dark:text-white placeholder-gray-500 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <button
                        disabled={!selectedStore}
                        className="w-full sm:w-auto px-4 py-2 bg-black hover:bg-gray-800 text-white rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Search size={18} />
                      </button>
                    </div>

                    <div className="mb-4 flex items-center justify-between gap-2 rounded border border-dashed border-gray-300 dark:border-gray-600 p-2">
                      <p className="text-xs text-gray-600 dark:text-gray-300">
                        Click a product card to stage it instantly, or open Product List for bigger browsing.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          saveDraftToSession();
                          window.location.href = `/product/list?selectMode=true&mode=social_commerce&redirect=${encodeURIComponent('/social-commerce')}`;
                        }}
                        disabled={!selectedStore}
                        className="px-3 py-1.5 text-xs font-semibold rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Browse Product List
                      </button>
                    </div>

                    {!selectedStore && (
                      <div className="text-center py-8 text-sm text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                        Please select a store to search products
                      </div>
                    )}

                    
                    {selectedStore && isSearching && (searchQuery || minPrice || maxPrice) && (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        Searching...
                      </div>
                    )}

                    {selectedStore && !isSearching && (searchQuery || minPrice || maxPrice) && searchResults.length === 0 && (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        {searchQuery ? (
                        <>No products found matching "{searchQuery}"</>
                      ) : (
                        <>No products found in that price range</>
                      )}
                      </div>
                    )}

                    {searchResults.length > 0 && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[28rem] overflow-y-auto mb-4 p-2">
                          {searchResults.map((product) => (
                            <div
                              key={`${product.id}`}
                              onClick={() => handleProductSelect(product)}
                              className="group relative flex flex-col border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 p-3 shadow-sm cursor-pointer hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                            >
                            <div 
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                openProductPreview(product);
                              }}
                              className="relative w-full aspect-square mb-3 overflow-hidden rounded bg-gray-50 dark:bg-gray-900/50"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openProductPreview(product);
                                }}
                                className="absolute right-2 top-2 z-10 p-1.5 rounded-full bg-white/90 dark:bg-gray-900/90 text-gray-700 dark:text-gray-200 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white dark:hover:bg-gray-800 shadow-sm"
                                title="Preview image"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <img
                                src={product.attributes.mainImage}
                                alt={product.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                onError={(e) => {
                                  e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400';
                                }}
                              />
                            </div>
                            <div className="flex-1 flex flex-col justify-between">
                              <div>
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-white line-clamp-2 leading-tight mb-1" title={product.name}>
                                  {product.name}
                                </h3>
                                {product.sku && (
                                  <p className="text-[10px] text-gray-500 font-mono mb-2">{product.sku}</p>
                                )}
                              </div>
                              <div className="mt-auto pt-2 border-t border-gray-100 dark:border-gray-700/50">
                                <div className="flex justify-between items-end mb-1">
                                  <p className="text-sm font-bold text-gray-900 dark:text-white">
                                    {formatPriceRangeLabel(product)}
                                  </p>
                                  {Number(product.batchesCount ?? 0) > 1 && (
                                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                                      {product.batchesCount} Batches
                                    </span>
                                  )}
                                </div>
                                <div className="flex justify-between items-center text-xs gap-2">
                                  <span className={`font-medium ${product.available > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                                    {product.available > 0 ? `Stock: ${product.available}` : 'Out of Stock'}
                                  </span>
                                  <div className="flex items-center gap-1.5">
                                    {stagedQtyByProductId[Number(product.id)] > 0 && (
                                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                                        Staged: {stagedQtyByProductId[Number(product.id)]}
                                      </span>
                                    )}
                                    {product.daysUntilExpiry !== null && product.daysUntilExpiry < 30 && (
                                      <span className="text-[10px] text-orange-600 dark:text-orange-400 font-medium">
                                        Exp: {product.daysUntilExpiry}d
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 rounded-lg border border-indigo-100 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-900/15 px-3 py-2">
                      <p className="text-xs text-indigo-700 dark:text-indigo-300">
                        Instant stage mode is on. Click any product card to add it to the staged list, then edit quantity, discount, or final amount there before adding everything to cart.
                      </p>
                    </div>

                    {/* Staging Queue */}
                    {stagingQueue.length > 0 && (
                      <div className="mt-4 border border-indigo-200 dark:border-indigo-700 rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 dark:bg-indigo-900/20 border-b border-indigo-200 dark:border-indigo-700">
                          <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">
                            Staged ({stagingQueue.length}) — keep selecting products, then add all to cart once
                          </span>
                          <button
                            onClick={addAllStagedToCart}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded transition-colors"
                          >
                            Add All to Cart →
                          </button>
                        </div>
                        <div className="divide-y divide-indigo-100 dark:divide-indigo-800 max-h-[28rem] overflow-y-auto">
                          {stagingQueue.map((s) => {
                            const unitPrice = getProductUnitPrice(s.product);
                            const available = Number(s.product?.available ?? 0) || 0;

                            return (
                              <div key={s.id} className="px-3 py-3 bg-white dark:bg-gray-800">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.product.name}</p>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                      Price: ৳{unitPrice.toFixed(2)} · Available: {available}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => removeStagingItem(s.id)}
                                    className="text-red-500 hover:text-red-700 flex-shrink-0"
                                    title="Remove"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>

                                <div className="mt-3 grid grid-cols-2 xl:grid-cols-4 gap-2">
                                  <div>
                                    <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max={available || 1}
                                      value={s.quantity}
                                      onChange={(e) => updateStagingItem(s.id, { quantity: Number(e.target.value) || 1 })}
                                      className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={s.discountPercent}
                                      onChange={(e) => updateStagingItem(s.id, { discountPercent: e.target.value, discountTk: '' })}
                                      className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Discount Tk</label>
                                    <input
                                      type="number"
                                      placeholder="0"
                                      value={s.discountTk}
                                      onChange={(e) => updateStagingItem(s.id, { discountTk: e.target.value, discountPercent: '' })}
                                      className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-gray-700 dark:text-gray-300 mb-1">Sell At / Final Amount</label>
                                    <input
                                      type="text"
                                      inputMode="decimal"
                                      value={s.amount}
                                      onChange={(e) => updateStagingItem(s.id, { amount: e.target.value }, 'finalAmount')}
                                      onBlur={() => {
                                        // Format nicely on blur
                                        const n = parseFloat(s.amount);
                                        if (!isNaN(n)) {
                                          updateStagingItem(s.id, { amount: n.toFixed(2) }, 'finalAmount');
                                        }
                                      }}
                                      className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cart */}
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Cart ({cart.length} items)</h3>
                    </div>
                    <div className="max-h-60 md:max-h-96 overflow-y-auto overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                              Product
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                              Qty
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                              Price
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                              Amount
                            </th>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">
                              Action
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {cart.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                No products in cart
                              </td>
                            </tr>
                          ) : (
                            cart.map((item) => (
                              <tr
                                key={item.id}
                                className={`border-b border-gray-200 dark:border-gray-700 ${
                                  item.isDefective ? 'bg-orange-50 dark:bg-orange-900/10' : ''
                                }`}
                              >
                                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">
                                  {item.productName}
                                  {item.isDefective && (
                                    <span className="ml-2 px-2 py-0.5 bg-orange-500 text-white text-xs rounded">
                                      DEFECTIVE
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{item.quantity}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{item.unit_price.toFixed(2)}</td>
                                <td className="px-3 py-2 text-sm text-gray-900 dark:text-white">{item.amount.toFixed(2)}</td>
                                <td className="px-3 py-2">
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="text-red-600 hover:text-red-700 text-xs font-medium"
                                  >
                                    Remove
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {cart.length > 0 && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex justify-between text-sm mb-3">
                          <span className="text-gray-600 dark:text-gray-400">Subtotal:</span>
                          <span className="text-gray-900 dark:text-white font-medium">{subtotal.toFixed(2)} Tk</span>
                        </div>
                        {isInternational && (
                          <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded flex items-center gap-2 text-xs text-blue-700 dark:text-blue-400">
                            <Globe className="w-4 h-4 flex-shrink-0" />
                            <span>International shipping rates will apply</span>
                          </div>
                        )}
                        <button
                          onClick={handleConfirmOrder}
                          className="w-full px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded transition-colors"
                        >
                          Confirm Order
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>

          {/* 🔎 Order Preview (from Last 5 Orders) */}
          {orderPreviewOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={closeOrderPreview}
                aria-hidden="true"
              />

              <div className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-gray-700">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Order details</p>
                    <p className="mt-0.5 text-xs text-gray-600 dark:text-gray-300">
                      {orderPreviewId ? `Order ID: ${orderPreviewId}` : ''}
                      {orderPreview?.order_number ? ` • Order ${orderPreview.order_number}` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={closeOrderPreview}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="max-h-[80vh] overflow-auto p-4">
                  {orderPreviewLoading && (
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-transparent dark:border-gray-600" />
                      Loading order…
                    </div>
                  )}

                  {!orderPreviewLoading && orderPreviewError && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/15 dark:text-red-200">
                      {orderPreviewError}
                    </div>
                  )}

                  {!orderPreviewLoading && !orderPreviewError && orderPreview && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-100">
                          <p className="font-semibold">Customer</p>
                          <p className="mt-1">
                            {orderPreview?.customer?.name || orderPreview?.customer_name || '—'}
                          </p>
                          <p className="text-gray-600 dark:text-gray-300">
                            {orderPreview?.customer?.phone || orderPreview?.customer_phone || '—'}
                          </p>
                        </div>
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-100">
                          <p className="font-semibold">Summary</p>
                          <div className="mt-1 space-y-0.5 text-gray-700 dark:text-gray-200">
                            <p>
                              Date:{' '}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {formatOrderDateTime(orderPreview?.order_date || orderPreview?.created_at)}
                              </span>
                            </p>
                            <p>
                              Status:{' '}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {orderPreview?.status || '—'}
                              </span>
                            </p>
                            <p>
                              Payment:{' '}
                              <span className="font-medium text-gray-900 dark:text-white">
                                {orderPreview?.payment_status || orderPreview?.paymentStatus || '—'}
                              </span>
                            </p>
                            <p>
                              Total:{' '}
                              <span className="font-bold text-gray-900 dark:text-white">
                                {formatBDT(orderPreview?.total_amount ?? orderPreview?.total ?? orderPreview?.grand_total ?? 0)}
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-900/30">
                          <p className="text-xs font-semibold text-gray-900 dark:text-white">Items</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300">
                            {orderPreviewItems.length} item{orderPreviewItems.length === 1 ? '' : 's'}
                          </p>
                        </div>
                        {orderPreviewItems.length === 0 ? (
                          <div className="p-3 text-sm text-gray-600 dark:text-gray-300">No items found.</div>
                        ) : (
                          <div className="max-h-64 overflow-auto">
                            <table className="w-full text-left text-xs">
                              <thead className="sticky top-0 bg-white dark:bg-gray-800">
                                <tr className="border-b border-gray-200 dark:border-gray-700">
                                  <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Product</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Qty</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Unit</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Disc</th>
                                  <th className="px-3 py-2 font-semibold text-gray-700 dark:text-gray-200">Total</th>
                                </tr>
                              </thead>
                              <tbody>
                                {orderPreviewItems.map((it: any, i: number) => (
                                  <tr key={String(it?.id ?? i)} className="border-b border-gray-100 dark:border-gray-700/50">
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{it.name}</td>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{it.quantity}</td>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{formatBDT(it.unit_price)}</td>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{formatBDT(it.discount_amount)}</td>
                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{formatBDT(it.total_amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {(orderPreview?.shipping_address || orderPreview?.delivery_address) && (
                        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-800 dark:border-gray-700 dark:bg-gray-900/30 dark:text-gray-100">
                          <p className="font-semibold">Shipping address</p>
                          <p className="mt-1 text-gray-700 dark:text-gray-200">
                            {String(
                              (orderPreview?.shipping_address?.street ||
                                orderPreview?.shipping_address?.address ||
                                orderPreview?.delivery_address?.street ||
                                orderPreview?.delivery_address?.address ||
                                '')
                            ) || '—'}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 🖼️ Product Image Preview (before selecting) */}
          {productPreviewOpen && productPreview && (
            <div 
              className={`fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 ${isPreviewFromHover ? 'pointer-events-none' : ''}`}
            >
              <div
                className={`absolute inset-0 transition-opacity duration-300 ${isPreviewFromHover ? 'bg-transparent' : 'bg-black/50'}`}
                onClick={closeProductPreview}
                aria-hidden="true"
              />

              <div 
                className="relative w-full max-w-xl overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-800 pointer-events-auto"
                onMouseEnter={() => {
                  isOverModalRef.current = true;
                  if (leaveTimeoutRef.current) {
                    clearTimeout(leaveTimeoutRef.current);
                    leaveTimeoutRef.current = null;
                  }
                }}
                onMouseLeave={() => {
                  isOverModalRef.current = false;
                  if (isPreviewFromHover) handleMouseLeaveProduct();
                }}
              >
                <div className="flex items-start justify-between gap-4 border-b border-gray-200 p-4 dark:border-gray-700">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">Product preview</p>
                    <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-gray-300">{productPreview?.name}</p>
                  </div>
                  <button
                    type="button"
                    onClick={closeProductPreview}
                    className="rounded p-1 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                    title="Close"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="p-4">
                  <div className="relative group overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 aspect-square bg-gray-100 dark:bg-gray-900 mb-4">
                    <div 
                      className="w-full h-full cursor-zoom-in overflow-hidden flex items-center justify-center"
                      onMouseEnter={() => setIsZoomed(true)}
                      onMouseLeave={() => setIsZoomed(false)}
                      onMouseMove={handleZoomMouseMove}
                    >
                      <img
                        src={allPreviewImages[activeImageIndex]}
                        alt={productPreview?.name}
                        className={`max-w-full max-h-full object-contain transition-transform duration-200 ${isZoomed ? 'scale-[2.5]' : 'scale-100'}`}
                        style={isZoomed ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` } : {}}
                        onError={(e) => {
                          e.currentTarget.src = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
                        }}
                      />
                    </div>

                    {/* Navigation buttons */}
                    {allPreviewImages.length > 1 && (
                      <>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(prev => (prev > 0 ? prev - 1 : allPreviewImages.length - 1));
                          }}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-sm"
                        >
                          <ChevronLeft size={24} />
                        </button>
                        <button 
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveImageIndex(prev => (prev < allPreviewImages.length - 1 ? prev + 1 : 0));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors backdrop-blur-sm"
                        >
                          <ChevronRight size={24} />
                        </button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {allPreviewImages.map((_, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveImageIndex(i);
                              }}
                              className={`w-2 h-2 rounded-full transition-all ${i === activeImageIndex ? 'bg-white scale-125' : 'bg-white/40'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-700 dark:text-gray-200">
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
                      <p className="text-gray-500 dark:text-gray-300">Price</p>
                      <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                        {formatPriceRangeLabel(productPreview)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
                      <p className="text-gray-500 dark:text-gray-300">Available</p>
                      <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">{productPreview?.available ?? 0}</p>
                    </div>
                    {Number(productPreview?.batchesCount ?? 0) > 1 && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
                        <p className="text-gray-500 dark:text-gray-300">Batches</p>
                        <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">{productPreview?.batchesCount}</p>
                      </div>
                    )}
                    {productPreview?.daysUntilExpiry !== null && productPreview?.daysUntilExpiry !== undefined && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-900/30">
                        <p className="text-gray-500 dark:text-gray-300">Expiry</p>
                        <p className="mt-0.5 font-semibold text-gray-900 dark:text-white">
                          {productPreview?.daysUntilExpiry < 0
                            ? 'Expired'
                            : `${productPreview?.daysUntilExpiry} days`}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={closeProductPreview}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-800 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-700"
                    >
                      Close
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleProductSelect(productPreview);
                        closeProductPreview();
                      }}
                      className="inline-flex items-center gap-2 rounded-lg bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800"
                    >
                      <Eye className="h-4 w-4" />
                      Select
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 🔍 Image popup (recent orders + inline thumbnails) */}
          <ImageLightboxModal
            open={imageModalOpen}
            src={imageModalSrc}
            title="Product image"
            subtitle={imageModalTitle}
            onClose={closeImageModal}
          />
        </div>
      </div>
    </div>
  );
}