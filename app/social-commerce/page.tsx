'use client';

import { useState, useEffect } from 'react';
import { Search, X, Globe, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CustomerTagManager from '@/components/customers/CustomerTagManager';
import ServiceSelector, { ServiceItem } from '@/components/ServiceSelector';
import axios from '@/lib/axios';
import { useCustomerLookup, type RecentOrder } from '@/lib/hooks/useCustomerLookup';
import storeService from '@/services/storeService';
import batchService from '@/services/batchService';
import defectIntegrationService from '@/services/defectIntegrationService';

// -----------------------------
// Helpers
// -----------------------------
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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
  batch_id: number;
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

export default function SocialCommercePage() {
  const [darkMode, setDarkMode] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [availableBatchCount, setAvailableBatchCount] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [stores, setStores] = useState<any[]>([]);

  const [date, setDate] = useState(getTodayDate());
  const [salesBy, setSalesBy] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [socialId, setSocialId] = useState('');

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

  // 🧑‍💼 Existing customer + last order summary states
  const [existingCustomer, setExistingCustomer] = useState<any | null>(null);
  const [lastOrderInfo, setLastOrderInfo] = useState<any | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isCheckingCustomer, setIsCheckingCustomer] = useState(false);
  const [customerCheckError, setCustomerCheckError] = useState<string | null>(null);
  const [lastPrefilledOrderId, setLastPrefilledOrderId] = useState<number | null>(null);

  // ✅ Reuse lookup hook for consistent phone lookup behavior (debounced)
  const customerLookup = useCustomerLookup({ debounceMs: 500, minLength: 6 });

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

  const formatOrderDateTime = (v?: any) => {
    if (!v) return '—';
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString();
  };

  const formatBDT = (v?: any) => {
    const n = Number(String(v ?? '0').replace(/[^0-9.-]/g, ''));
    const amt = Number.isFinite(n) ? n : 0;
    try {
      return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', minimumFractionDigits: 0 }).format(amt);
    } catch {
      return `৳${Math.round(amt)}`;
    }
  };

  const getBaseUrl = () => {
    const api = process.env.NEXT_PUBLIC_API_URL || '';
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


  const fetchStores = async () => {
    try {
      const response = await storeService.getStores({ is_active: true, per_page: 1000 });
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

      // Prefer "Main Store" as the default store (falls back to the first store)
      const normalized = (s: any) => String(s ?? '').toLowerCase().trim();
      const mainStore = storesData.find(
        (s) =>
          s?.is_main === true ||
          normalized(s?.name) === 'main store' ||
          normalized(s?.code) === 'main' ||
          normalized(s?.slug) === 'main'
      );

      // Put Main Store on top (UI dropdown stays the same, but feels nicer)
      const sortedStores = mainStore
        ? [mainStore, ...storesData.filter((s) => s?.id !== mainStore?.id)]
        : storesData;

      setStores(sortedStores);
      if (sortedStores.length > 0) {
        setSelectedStore(String((mainStore ?? sortedStores[0]).id));
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

  const buildSearchResultItem = (batch: any, prod: any, imageUrl: string, relevance_score: number, search_stage: string) => {
    const pid = prod?.id ?? batch.product?.id ?? batch.product_id;
    return {
      id: pid,
      name: prod?.name || batch.product?.name || batch.product_name || 'Unknown product',
      sku: prod?.sku || batch.product?.sku || batch.product_sku || '',
      batchId: batch.id,
      batchNumber: batch.batch_number,
      attributes: {
        Price: parseSellPrice(batch.sell_price ?? 0),
        mainImage: imageUrl,
      },
      available: batch.quantity,
      expiryDate: batch.expiry_date,
      daysUntilExpiry: batch.days_until_expiry,
      relevance_score: relevance_score || 0,
      search_stage: search_stage || 'api',
    };
  };

  /**
   * Server-side batch search (paged) for Social Commerce.
   * Uses backend batch list filtering (store_id + status + search) and then applies price filtering client-side.
   * This avoids per-product batch calls (which can trigger 429) and avoids silently missing results due to backend page caps.
   */
  const performServerBatchSearch = async (
    storeId: number,
    query: string,
    min: number | null,
    max: number | null,
    limit = 60
  ) => {
    const q = String(query || '').trim();
    const results: any[] = [];

    const items = await batchService.getBatchesAll(
      {
        store_id: storeId,
        status: 'available',
        search: q || undefined,
        sort_by: 'sell_price',
        sort_order: 'asc',
      },
      {
        // Backend often caps per_page; we page through until we have enough.
        per_page: 200,
        max_items: Math.max(1, Number(limit) || 60),
        max_pages: 200,
      }
    );

    const filtered = items.filter((b: any) => {
      if (Number(b.quantity) <= 0) return false;
      const price = parseSellPrice(b.sell_price);
      return withinPriceRange(price, min, max);
    });

    for (const b of filtered) {
      const pid = b.product?.id || b.product_id;
      if (!pid) continue;
      results.push(buildSearchResultItem(b, b.product, getProductCardImage(b.product), 50, 'batch-search'));
      if (results.length >= limit) break;
    }

    return results;
  };

  const calculateAmount = (basePrice: number, qty: number, discPer: number, discTk: number) => {
    const baseAmount = basePrice * qty;
    const percentDiscount = (baseAmount * discPer) / 100;
    const totalDiscount = percentDiscount + discTk;
    return Math.max(0, baseAmount - totalDiscount);
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

      // Otherwise, treat as international if fields exist
      const hasInternational = !!shipping?.country || !!shipping?.state || !!shipping?.city;
      if (hasInternational) {
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
    const ros = Array.isArray((customerLookup as any)?.recentOrders)
      ? ((customerLookup as any).recentOrders as RecentOrder[])
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
  }, [customerLookup.customer, customerLookup.lastOrder, (customerLookup as any).recentOrders, customerLookup.loading, customerLookup.error]);

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
            productName: `${defect.productName} [DEFECTIVE]`,
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
      return;
    }

    // ✅ lightweight: only fetch counts (no batch download)
    fetchStoreBatchCount(selectedStore);

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
    const hasPriceFilter = Boolean(minPrice.trim() || maxPrice.trim());

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

      const min = minPrice.trim() !== '' && Number.isFinite(Number(minPrice)) ? Number(minPrice) : null;
      const max = maxPrice.trim() !== '' && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : null;

      const q = String(searchQuery || '').trim();

      setIsSearching(true);

      try {
        // ✅ Price-only filtering (no text query): fetch a single page from backend (no full preload)
        if (!q) {
          const res = await batchService.getBatches({
            store_id: storeId,
            status: 'available',
            // Keep this small; user can refine with text query for accuracy.
            per_page: 60,
            page: 1,
            sort_by: 'sell_price',
            sort_order: 'asc',
          });

          const items = Array.isArray(res?.data?.data) ? res.data.data : [];
          const filtered = items.filter((b: any) => {
            if (Number(b.quantity) <= 0) return false;
            const price = parseSellPrice(b.sell_price);
            return withinPriceRange(price, min, max);
          });

          const results: any[] = [];
          for (const b of filtered) {
            const pid = b.product?.id || b.product_id;
            if (!pid) continue;
            results.push(buildSearchResultItem(b, b.product, getProductCardImage(b.product), 50, 'price'));
            if (results.length >= 60) break;
          }

          setSearchResults(results);
          return;
        }

        // ✅ Text query present
        // IMPORTANT: Do NOT ... per-product batch calls (can trigger 429 and silently miss results).
        // Instead, use the backend batch search (paged) to return ... batches.
        // This ensures searching "jamdani" finds ALL jamdani batches (not just first 30/60).

        // For 1-char queries keep results small (very broad query).
        const desiredLimit = q.length <= 1
          ? 120
          : Math.min(Math.max(Number(availableBatchCount ?? 0), 500), 15000);

        const results = await performServerBatchSearch(storeId, q, min, max, desiredLimit);
        // Sort cheapest first for easier selection.
        results.sort((a: any, b: any) => Number(a?.attributes?.Price ?? 0) - Number(b?.attributes?.Price ?? 0));
        setSearchResults(results);
        return;
      } catch (error) {
        const status = (error as any)?.response?.status;
        if (status === 429) {
          console.warn('⚠️ Rate limited (429). Waiting briefly before allowing another search.');
          setSearchResults([]);
          // Do NOT call fallback on 429 (it will likely trigger more 429s)
          return;
        }
        console.warn('❌ Search failed, using batch-search fallback', error);
        try {
          const fallback = await performServerBatchSearch(storeId, q, min, max, 60);
          setSearchResults(fallback);
        } catch (e) {
          setSearchResults([]);
        }
      } finally {
        setIsSearching(false);
      }
    }, 600);

    return () => clearTimeout(delayDebounce);
  }, [selectedStore, searchQuery, minPrice, maxPrice, availableBatchCount]);

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
    setSelectedProduct(product);
    setSearchQuery('');
    setMinPrice('');
    setMaxPrice('');
    setSearchResults([]);
    setQuantity('1');
    setDiscountPercent('');
    setDiscountTk('');
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
      alert(`Only ${selectedProduct.available} units available for this batch`);
      return;
    }

    const baseAmount = price * qty;
    const discountValue = discPer > 0 ? (baseAmount * discPer) / 100 : discTk;
    const finalAmount = baseAmount - discountValue;

    const newItem: CartProduct = {
      id: Date.now(),
      product_id: selectedProduct.id,
      batch_id: selectedProduct.batchId,
      productName: `${selectedProduct.name}${selectedProduct.batchNumber ? ` (Batch: ${selectedProduct.batchNumber})` : ''}`,
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

  const subtotal = cart.reduce((sum, item) => sum + item.amount, 0);

  const handleConfirmOrder = async () => {
    if (!userName || !userPhone) {
      alert('Please fill in customer name and phone number');
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
      console.log('📦 CREATING SOCIAL COMMERCE ORDER');

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
            phone: userPhone,
            street: deliveryAddress,
            city: internationalCity,
            state: state || undefined,
            country,
            postal_code: internationalPostalCode || undefined,
          }
        : (() => {
            // Domestic
            const base: any = {
              name: userName,
              phone: userPhone,
              street: streetAddress,
              postal_code: postalCode || undefined,
            };

            // Manual: include IDs + names
            if (!isDomesticAuto) {
              return {
                ...base,
                area: areaObj?.area_name || '',
                city: cityObj?.city_name || '',
                pathao_city_id: pathaoCityId ? Number(pathaoCityId) : undefined,
                pathao_zone_id: pathaoZoneId ? Number(pathaoZoneId) : undefined,
                pathao_area_id: pathaoAreaId ? Number(pathaoAreaId) : undefined,
              };
            }

            // Auto: no IDs (Pathao will map from text)
            return base;
          })();

      const orderData = {
        order_type: 'social_commerce',
        store_id: parseInt(selectedStore),
        customer: {
          name: userName,
          email: userEmail || undefined,
          phone: userPhone,
          // UI display only
          address: formattedCustomerAddress,
        },
        shipping_address,
        // ✅ Separate products and services
        items: cart
          .filter((item) => !item.isService)
          .map((item) => ({
            product_id: item.product_id,
            batch_id: item.batch_id,
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
        shipping_amount: 0,
        notes: `Social Commerce. ${socialId ? `ID: ${socialId}. ` : ''}${isInternational ? 'International' : 'Domestic'} delivery.`,
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
                <h1 className="text-xl md:text-2xl font-semibold text-gray-900 dark:text-white">Social Commerce</h1>

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
                    Store <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Store</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
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
                                  onTagsChange={(next) =>
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
                                            <p className="text-[11px] text-gray-600 dark:text-gray-200 whitespace-nowrap">
                                              {formatOrderDateTime(o.order_date)}
                                            </p>
                                          </div>

                                          <div className="mt-1 flex items-start justify-between gap-3">
                                            <div className="text-[11px] text-gray-700 dark:text-gray-200">
                                              {Array.isArray(o.items) && o.items.length > 0 ? (
                                                <div className="space-y-0.5">
                                                  {o.items.slice(0, 6).map((it, i) => (
                                                    <div key={`${o.id}-${i}`} className="truncate">
                                                      • {it.product_name || 'Unnamed product'}
                                                      {it.quantity ? ` ×${it.quantity}` : ''}
                                                    </div>
                                                  ))}
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
                      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Delivery Address</h3>
                      <button
                        onClick={() => {
                          setIsInternational(!isInternational);

                          // reset domestic
                          setPathaoCityId('');
                          setPathaoZoneId('');
                          setPathaoAreaId('');
                          setPathaoZones([]);
                          setPathaoAreas([]);
                          setStreetAddress('');
                          setPostalCode('');

                          // reset international
                          setCountry('');
                          setState('');
                          setInternationalCity('');
                          setInternationalPostalCode('');
                          setDeliveryAddress('');
                        }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isInternational
                            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border border-blue-300 dark:border-blue-700'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        <Globe className="w-4 h-4" />
                        {isInternational ? 'International' : 'Domestic'}
                      </button>
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
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                          <input
                            type="text"
                            placeholder="Enter Postal Code"
                            value={internationalPostalCode}
                            onChange={(e) => setInternationalPostalCode(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Street Address*</label>
                          <textarea
                            placeholder="Full Address"
                            value={deliveryAddress}
                            onChange={(e) => setDeliveryAddress(e.target.value)}
                            rows={3}
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

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                              <div>
                                <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                                <input
                                  type="text"
                                  placeholder="e.g., 1212"
                                  value={postalCode}
                                  onChange={(e) => setPostalCode(e.target.value)}
                                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                                />
                              </div>
                            </div>
                          </>
                        )}

                        {usePathaoAutoLocation && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Postal Code</label>
                              <input
                                type="text"
                                placeholder="e.g., 1212"
                                value={postalCode}
                                onChange={(e) => setPostalCode(e.target.value)}
                                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                              />
                            </div>
                            <div className="text-[11px] text-gray-600 dark:text-gray-300 flex items-end">
                              Tip: include area + city (e.g., <span className="font-semibold">Uttara, Dhaka</span>) in the address.
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                            {usePathaoAutoLocation ? 'Full Address*' : 'Street Address*'}
                          </label>
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
                        </div>
                      </div>
                    )}
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
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:flex-shrink-0">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Min ৳"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          disabled={!selectedStore}
                          className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Max ৳"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          disabled={!selectedStore}
                          className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <button
                        disabled={!selectedStore}
                        className="w-full sm:w-auto px-4 py-2 bg-black hover:bg-gray-800 text-white rounded transition-colors flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Search size={18} />
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
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 md:max-h-80 overflow-y-auto mb-4 p-1">
                        {searchResults.map((product) => (
                          <div
                            key={`${product.id}-${product.batchId}`}
                            onClick={() => handleProductSelect(product)}
                            className="border border-gray-200 dark:border-gray-600 rounded p-2 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          >
                            <img
                              src={product.attributes.mainImage}
                              alt={product.name}
                              className="w-full h-24 sm:h-32 object-cover rounded mb-2"
                            />
                            <p className="text-xs text-gray-900 dark:text-white font-medium truncate">
                              {product.name}
                            </p>
                            {product.batchNumber && (
                              <p className="text-xs text-blue-600 dark:text-blue-400 truncate">
                                Batch: {product.batchNumber}
                              </p>
                            )}
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {product.attributes.Price} Tk
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              Available: {product.available}
                            </p>
                            {product.daysUntilExpiry !== null && product.daysUntilExpiry < 30 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                                Expires in {product.daysUntilExpiry} days
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedProduct && (
                      <div
                        className={`mt-4 p-3 border rounded mb-4 ${
                          selectedProduct.isDefective
                            ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-300 dark:border-orange-700'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">Selected Product</span>
                          <button
                            onClick={() => {
                              setSelectedProduct(null);
                              setQuantity('');
                              setDiscountPercent('');
                              setDiscountTk('');
                              setAmount('0.00');
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedProduct.name}</p>
                        {selectedProduct.batchNumber && (
                          <p className="text-sm text-blue-600 dark:text-blue-400">
                            Batch: {selectedProduct.batchNumber}
                          </p>
                        )}
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Price: {selectedProduct.attributes.Price} Tk
                        </p>
                        <p className="text-sm text-green-600 dark:text-green-400">
                          Available: {selectedProduct.available}
                        </p>
                      </div>
                    )}

                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Quantity</label>
                        <input
                          type="number"
                          placeholder="0"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          disabled={!selectedProduct || selectedProduct?.isDefective}
                          min="1"
                          max={selectedProduct?.available || 1}
                          className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Discount %</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={discountPercent}
                            onChange={(e) => {
                              setDiscountPercent(e.target.value);
                              setDiscountTk('');
                            }}
                            disabled={!selectedProduct || selectedProduct?.isDefective}
                            className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Discount Tk</label>
                          <input
                            type="number"
                            placeholder="0"
                            value={discountTk}
                            onChange={(e) => {
                              setDiscountTk(e.target.value);
                              setDiscountPercent('');
                            }}
                            disabled={!selectedProduct || selectedProduct?.isDefective}
                            className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:opacity-50"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                          <input
                            type="text"
                            value={amount}
                            readOnly
                            className="w-full px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-600 text-gray-900 dark:text-white"
                          />
                        </div>
                      </div>

                      <button
                        onClick={addToCart}
                        disabled={!selectedProduct}
                        className="w-full px-4 py-2.5 bg-black hover:bg-gray-800 text-white text-sm font-medium rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Add to Cart
                      </button>
                    </div>
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
        </div>
      </div>
    </div>
  );
}
