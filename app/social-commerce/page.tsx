'use client';

import { useState, useEffect } from 'react';
import { Search, X, Globe, AlertCircle } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import CustomerTagManager from '@/components/customers/CustomerTagManager';
import ServiceSelector, { ServiceItem } from '@/components/ServiceSelector';
import axios from '@/lib/axios';
import { useCustomerLookup } from '@/lib/hooks/useCustomerLookup';
import storeService from '@/services/storeService';
import productImageService from '@/services/productImageService';
import batchService from '@/services/batchService';
import defectIntegrationService from '@/services/defectIntegrationService';

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
  const [allProducts, setAllProducts] = useState<any[]>([]);
  const [batches, setBatches] = useState<any[]>([]);
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

  const getImageUrl = (imagePath: string | null | undefined): string => {
    if (!imagePath) return '/placeholder-image.jpg';

    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
      return imagePath;
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || '';

    if (imagePath.startsWith('/storage')) {
      return `${baseUrl}${imagePath}`;
    }

    return `${baseUrl}/storage/product-images/${imagePath}`;
  };

  // ✅ Image cache to prevent duplicate API calls
  const imageCache = new Map<number, string>();

  const fetchPrimaryImage = async (productId: number): Promise<string> => {
    // ✅ Check cache first
    if (imageCache.has(productId)) {
      return imageCache.get(productId)!;
    }

    try {
      const images = await productImageService.getProductImages(productId);

      const primaryImage = images.find((img: any) => img.is_primary && img.is_active);

      let imageUrl = '/placeholder-image.jpg';

      if (primaryImage) {
        imageUrl = getImageUrl(primaryImage.image_url || primaryImage.image_path);
      } else {
        const firstActiveImage = images.find((img: any) => img.is_active);
        if (firstActiveImage) {
          imageUrl = getImageUrl(firstActiveImage.image_url || firstActiveImage.image_path);
        }
      }

      // ✅ Cache the result
      imageCache.set(productId, imageUrl);
      return imageUrl;
    } catch (error) {
      console.error('Error fetching product images:', error);
      const fallback = '/placeholder-image.jpg';
      imageCache.set(productId, fallback);
      return fallback;
    }
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

      setStores(storesData);
      if (storesData.length > 0) {
        setSelectedStore(String(storesData[0].id));
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setStores([]);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/products', { params: { per_page: 1000 } });
      let productsData: any[] = [];

      if (response.data?.success && response.data?.data) {
        productsData = Array.isArray(response.data.data)
          ? response.data.data
          : Array.isArray(response.data.data.data)
          ? response.data.data.data
          : [];
      } else if (Array.isArray(response.data)) {
        productsData = response.data;
      }

      setAllProducts(productsData);
    } catch (error) {
      console.error('Error fetching products:', error);
      setAllProducts([]);
    }
  };

  const fetchBatchesForStore = async (storeId: string) => {
    if (!storeId) return;

    try {
      setIsLoadingData(true);
      console.log('📦 Fetching batches for store:', storeId);

      try {
        const batchesData = await batchService.getAvailableBatches(parseInt(storeId));
        console.log('✅ Raw batches from getAvailableBatches:', batchesData);

        if (batchesData && batchesData.length > 0) {
          const availableBatches = batchesData.filter((batch: any) => batch.quantity > 0);
          setBatches(availableBatches);
          console.log('✅ Filtered available batches:', availableBatches.length);
          return;
        }
      } catch (err) {
        console.warn('⚠️ getAvailableBatches failed, trying getBatchesArray...', err);
      }

      try {
        const batchesData = await batchService.getBatchesArray({
          store_id: parseInt(storeId),
          status: 'available',
        });
        console.log('✅ Raw batches from getBatchesArray:', batchesData);

        if (batchesData && batchesData.length > 0) {
          const availableBatches = batchesData.filter((batch: any) => batch.quantity > 0);
          setBatches(availableBatches);
          console.log('✅ Filtered available batches:', availableBatches.length);
          return;
        }
      } catch (err) {
        console.warn('⚠️ getBatchesArray failed, trying getBatchesByStore...', err);
      }

      try {
        const batchesData = await batchService.getBatchesByStore(parseInt(storeId));
        console.log('✅ Raw batches from getBatchesByStore:', batchesData);

        if (batchesData && batchesData.length > 0) {
          const availableBatches = batchesData.filter((batch: any) => batch.quantity > 0);
          setBatches(availableBatches);
          console.log('✅ Filtered available batches:', availableBatches.length);
          return;
        }
      } catch (err) {
        console.error('⚠️ All batch fetch methods failed', err);
      }

      setBatches([]);
      console.log('⚠️ No batches found for store:', storeId);
    } catch (error: any) {
      console.error('❌ Batch fetch error:', error);
      setBatches([]);
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

  const performLocalSearch = async (query: string) => {
    const results: any[] = [];
    const queryLower = query.toLowerCase().trim();

    console.log('🔍 Local search for:', queryLower);

    // ✅ First pass: collect matching products
    const matchingProducts: Array<{ prod: any; relevanceScore: number }> = [];

    for (const prod of allProducts) {
      const productName = (prod.name || '').toLowerCase();
      const productSku = (prod.sku || '').toLowerCase();

      let matches = false;
      let relevanceScore = 0;

      if (productName === queryLower || productSku === queryLower) {
        relevanceScore = 100;
        matches = true;
      } else if (productName.startsWith(queryLower) || productSku.startsWith(queryLower)) {
        relevanceScore = 80;
        matches = true;
      } else if (productName.includes(queryLower) || productSku.includes(queryLower)) {
        relevanceScore = 60;
        matches = true;
      }

      if (matches) {
        const productBatches = batches.filter((batch: any) => {
          const batchProductId = batch.product?.id || batch.product_id;
          return batchProductId === prod.id && batch.quantity > 0;
        });

        if (productBatches.length > 0) {
          matchingProducts.push({ prod, relevanceScore });
        }
      }
    }

    // ✅ OPTIMIZED: Fetch images for all matching products in parallel
    const uniqueProductIds = [...new Set(matchingProducts.map(m => m.prod.id))];
    const imagePromises = uniqueProductIds.map(async (productId) => {
      const imageUrl = await fetchPrimaryImage(productId);
      return { productId, imageUrl };
    });
    
    const imageResults = await Promise.all(imagePromises);
    const imageMap = new Map(imageResults.map(r => [r.productId, r.imageUrl]));

    // ✅ Second pass: build results with cached images
    for (const { prod, relevanceScore } of matchingProducts) {
      const productBatches = batches.filter((batch: any) => {
        const batchProductId = batch.product?.id || batch.product_id;
        return batchProductId === prod.id && batch.quantity > 0;
      });

      const imageUrl = imageMap.get(prod.id) || '/placeholder-image.jpg';

      for (const batch of productBatches) {
        results.push({
          id: prod.id,
          name: prod.name,
          sku: prod.sku,
          batchId: batch.id,
          batchNumber: batch.batch_number,
          attributes: {
            Price: Number(String(batch.sell_price ?? '0').replace(/[^0-9.-]/g, '')),
            mainImage: imageUrl,
          },
          available: batch.quantity,
          expiryDate: batch.expiry_date,
          daysUntilExpiry: batch.days_until_expiry,
          relevance_score: relevanceScore,
          search_stage: 'local',
        });
      }
    }

    results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
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
    if (lo?.last_order_id) {
      setLastOrderInfo({
        id: lo.last_order_id,
        date: lo.last_order_date,
        total_amount: lo.last_order_total,
      });
    } else {
      setLastOrderInfo(null);
    }

    // Prefill Pathao/international from last order details (if any)
    if (lo?.last_order_id) {
      prefillDeliveryFromOrder(Number(lo.last_order_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerLookup.customer, customerLookup.lastOrder, customerLookup.loading, customerLookup.error]);

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
      await Promise.all([fetchProducts(), fetchStores()]);
    };
    loadInitialData();
  }, []);

  useEffect(() => {
    if (selectedStore) {
      fetchBatchesForStore(selectedStore);
    }
  }, [selectedStore]);

  // ✅ Load Pathao cities when domestic
  useEffect(() => {
    if (!isInternational) {
      fetchPathaoCities();
    } else {
      // reset domestic fields if switching to international
      setPathaoCityId('');
      setPathaoZoneId('');
      setPathaoAreaId('');
      setPathaoZones([]);
      setPathaoAreas([]);
    }
  }, [isInternational]);

  // ✅ Fetch zones when city changes
  useEffect(() => {
    if (isInternational) return;
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

    if ((!searchQuery.trim() && !hasPriceFilter) || !Array.isArray(batches)) {
      setSearchResults([]);
      return;
    }

    if (batches.length === 0) {
      console.log('⚠️ No batches available to search');
      return;
    }

    const delayDebounce = setTimeout(async () => {
      const min = minPrice.trim() !== '' && Number.isFinite(Number(minPrice)) ? Number(minPrice) : null;
      const max = maxPrice.trim() !== '' && Number.isFinite(Number(maxPrice)) ? Number(maxPrice) : null;

      const withinPriceRange = (price: number) => {
        if (min !== null && price < min) return false;
        if (max !== null && price > max) return false;
        return true;
      };

      try {
        // If only price filter is set (no text query), search locally from loaded batches
        if (!searchQuery.trim()) {
          const availableBatches = Array.isArray(batches)
            ? batches.filter((b: any) => Number(b.quantity) > 0)
            : [];

          const productIds = [
            ...new Set(
              availableBatches
                .map((b: any) => b.product?.id || b.product_id)
                .filter((id: any) => typeof id === 'number')
            ),
          ];

          const imagePromises = productIds.map(async (productId: number) => {
            const imageUrl = await fetchPrimaryImage(productId);
            return { productId, imageUrl };
          });

          const imageResults = await Promise.all(imagePromises);
          const imageMap = new Map(imageResults.map((r) => [r.productId, r.imageUrl]));

          const results: any[] = [];

          for (const batch of availableBatches) {
            const pid = batch.product?.id || batch.product_id;
            if (!pid) continue;

            const price = Number(String(batch.sell_price ?? '0').replace(/[^0-9.-]/g, ''));
            if (!withinPriceRange(price)) continue;

            const prod =
              batch.product || allProducts.find((p: any) => p.id === pid) || null;

            results.push({
              id: pid,
              name: prod?.name || batch.product_name || 'Unknown product',
              sku: prod?.sku || batch.product_sku || '',
              batchId: batch.id,
              batchNumber: batch.batch_number,
              attributes: {
                Price: price,
              },
              image: imageMap.get(pid) || '/placeholder-image.jpg',
              isDefective: false,
            });

            if (results.length >= 50) break;
          }

          setSearchResults(results);

          if (results.length === 0) {
            showToast('No products found in that price range', 'error');
          }
          return;
        }

        const response = await axios.post('/products/advanced-search', {
          query: searchQuery,
          is_archived: false,
          enable_fuzzy: true,
          fuzzy_threshold: 60,
          search_fields: ['name', 'sku', 'description', 'category'],
          per_page: 50,
        });

        if (response.data?.success) {
          const products =
            response.data.data?.items ||
            response.data.data?.data?.items ||
            response.data.data ||
            [];

          const results: any[] = [];

          // ✅ OPTIMIZED: Get unique product IDs first to avoid duplicate image fetches
          const uniqueProductIds = [...new Set(products.map((p: any) => p.id))];
          
          // ✅ Pre-fetch images for all unique products in parallel
          const imagePromises = uniqueProductIds.map(async (productId) => {
            const imageUrl = await fetchPrimaryImage(productId);
            return { productId, imageUrl };
          });
          
          const imageResults = await Promise.all(imagePromises);
          const imageMap = new Map(imageResults.map(r => [r.productId, r.imageUrl]));

          for (const prod of products) {
            const productBatches = batches.filter((batch: any) => {
              const batchProductId = batch.product?.id || batch.product_id;
              if (batchProductId !== prod.id) return false;
              if (Number(batch.quantity) <= 0) return false;

              const price = Number(String(batch.sell_price ?? '0').replace(/[^0-9.-]/g, ''));
              return withinPriceRange(price);
            });

            if (productBatches.length > 0) {
              const imageUrl = imageMap.get(prod.id) || '/placeholder-image.jpg';

              for (const batch of productBatches) {
                results.push({
                  id: prod.id,
                  name: prod.name,
                  sku: prod.sku,
                  batchId: batch.id,
                  batchNumber: batch.batch_number,
                  attributes: {
                    Price: Number(String(batch.sell_price ?? '0').replace(/[^0-9.-]/g, '')),
                    mainImage: imageUrl,
                  },
                  available: batch.quantity,
                  expiryDate: batch.expiry_date,
                  daysUntilExpiry: batch.days_until_expiry,
                  relevance_score: prod.relevance_score || 0,
                  search_stage: prod.search_stage || 'api',
                });
              }
            }
          }

          results.sort((a, b) => (b.relevance_score || 0) - (a.relevance_score || 0));
          setSearchResults(results);

          if (results.length === 0 && products.length > 0) {
            showToast('Products found but not available in selected store', 'error');
          }
        } else {
          throw new Error('API search unsuccessful');
        }
      } catch (error: any) {
        console.warn('❌ API search failed, using local search');
        const localResults = await performLocalSearch(searchQuery);
        setSearchResults(localResults);

        if (localResults.length === 0) {
          showToast('No products found', 'error');
        }
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, minPrice, maxPrice, batches, allProducts]);

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
      if (!pathaoCityId || !pathaoZoneId || !pathaoAreaId || !streetAddress) {
        alert('Please select City/Zone/Area and enter Street Address');
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

      const cityObj = pathaoCities.find((c) => String(c.city_id) === String(pathaoCityId));
      const zoneObj = pathaoZones.find((z) => String(z.zone_id) === String(pathaoZoneId));
      const areaObj = pathaoAreas.find((a) => String(a.area_id) === String(pathaoAreaId));

      const formattedCustomerAddress = isInternational
        ? `${deliveryAddress}, ${internationalCity}${state ? ', ' + state : ''}, ${country}${internationalPostalCode ? ' - ' + internationalPostalCode : ''}`
        : `${streetAddress}, ${areaObj?.area_name || ''}, ${zoneObj?.zone_name || ''}, ${cityObj?.city_name || ''}${postalCode ? ' - ' + postalCode : ''}`;

      const deliveryAddressForUi = isInternational
        ? {
            country,
            state: state || '',
            city: internationalCity,
            postalCode: internationalPostalCode || '',
            address: deliveryAddress,
          }
        : {
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
        : {
            name: userName,
            phone: userPhone,
            street: streetAddress,
            area: areaObj?.area_name || '',
            city: cityObj?.city_name || '',
            pathao_city_id: Number(pathaoCityId),
            pathao_zone_id: Number(pathaoZoneId),
            pathao_area_id: Number(pathaoAreaId),
            postal_code: postalCode || undefined,
          };

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
                  {selectedStore && isLoadingData && <p className="mt-1 text-xs text-blue-600">Loading batches...</p>}
                  {selectedStore && !isLoadingData && batches.length > 0 && (
                    <p className="mt-1 text-xs text-green-600">{batches.length} batches available</p>
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
                                {lastOrderInfo ? (
                                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-700/40 dark:bg-amber-900/15">
                                    <p className="text-sm font-extrabold tracking-wide text-amber-900 dark:text-amber-100">
                                      LAST ORDER
                                    </p>
                                    <p className="mt-1 text-[11px] text-gray-700 dark:text-gray-200">
                                      Date:{' '}
                                      <span className="font-bold text-black dark:text-white">
                                        {lastOrderInfo.date ? new Date(lastOrderInfo.date).toLocaleString() : 'N/A'}
                                      </span>
                                    </p>
                                    {lastOrderInfo.summary_text && (
                                      <p className="mt-1 text-[11px] text-gray-700 dark:text-gray-200">
                                        Items:{' '}
                                        <span className="font-bold text-black dark:text-white">
                                          {lastOrderInfo.summary_text}
                                        </span>
                                      </p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="mt-1 text-gray-600 dark:text-gray-300">
                                    No previous orders found for this customer.
                                  </p>
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

                        <div>
                          <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">Street Address*</label>
                          <textarea
                            placeholder="House 12, Road 5, etc."
                            value={streetAddress}
                            onChange={(e) => setStreetAddress(e.target.value)}
                            rows={2}
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
                            : isLoadingData
                            ? 'Loading batches...'
                            : 'Search product name...'
                        }
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        disabled={!selectedStore || isLoadingData}
                        className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-2 sm:flex-shrink-0">
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Min ৳"
                          value={minPrice}
                          onChange={(e) => setMinPrice(e.target.value)}
                          disabled={!selectedStore || isLoadingData}
                          className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                        <input
                          type="number"
                          inputMode="numeric"
                          placeholder="Max ৳"
                          value={maxPrice}
                          onChange={(e) => setMaxPrice(e.target.value)}
                          disabled={!selectedStore || isLoadingData}
                          className="w-full sm:w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>

                      <button
                        disabled={!selectedStore || isLoadingData}
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

                    {selectedStore && isLoadingData && (
                      <div className="text-center py-8 text-sm text-gray-500 dark:text-gray-400">
                        Loading batches for selected store...
                      </div>
                    )}

                    {selectedStore && !isLoadingData && (searchQuery || minPrice || maxPrice) && searchResults.length === 0 && (
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
