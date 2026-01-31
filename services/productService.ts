// services/productService.ts (Updated)
import axiosInstance from '@/lib/axios';

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  category_id: number;
  vendor_id: number;
  is_archived: boolean;
  custom_fields?: CustomField[];
  images?: ProductImage[];
  primary_image?: PrimaryImage;
  variants?: any[]; // Product variants
  category?: {
    id: number;
    title: string;
  };
  vendor?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  field_id: number;
  field_title: string;
  field_type?: string;
  value: any;
  raw_value?: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_path?: string;
  image_url?: string;
  url?: string;
  is_primary?: boolean;
  is_active?: boolean;
  sort_order?: number;
  display_order?: number;
}

export interface PrimaryImage {
  id: number;
  url: string;
  alt_text?: string;
  image_url?: string;
  image_path?: string;
}

export interface Field {
  id: number;
  title: string;
  type: string;
  description?: string;
  is_required: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
}

export interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  category_id: number;
  vendor_id: number;
  custom_fields?: {
    field_id: number;
    value: any;
  }[];
}

export interface CreateProductWithVariantsData extends CreateProductData {
  use_variants: boolean;
  variant_attributes?: Record<string, string[]>;
  base_price_adjustment?: number;
}

export type SearchField = 'name' | 'sku' | 'description' | 'category' | 'custom_fields';

export interface ProductSearchHit extends Product {
  search_stage?: string;
  base_score?: number;
  relevance_score?: number;
}

export interface AdvancedSearchParams {
  query: string;
  category_id?: number;
  vendor_id?: number;
  is_archived?: boolean;
  enable_fuzzy?: boolean;
  fuzzy_threshold?: number; // 50-100
  search_fields?: SearchField[];
  per_page?: number;
  page?: number;
}

export interface AdvancedSearchResponse {
  success: boolean;
  query: string;
  search_terms: string[];
  total_results: number;
  items: ProductSearchHit[];
  pagination: {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
    from?: number;
    to?: number;
  } | null;
  raw: any;
}

// ---------- helpers ----------
function normalizeCategory(raw: any): { id: number; title: string } | undefined {
  if (!raw) return undefined;
  const id = raw.id;
  if (typeof id !== 'number') return undefined;
  const title = String(raw.title ?? raw.name ?? raw.full_path ?? '').trim();
  return { id, title: title || 'Uncategorized' };
}

function normalizeVendor(raw: any): { id: number; name: string } | undefined {
  if (!raw) return undefined;
  const id = raw.id;
  if (typeof id !== 'number') return undefined;
  const name = String(raw.name ?? raw.title ?? '').trim();
  return { id, name: name || 'Vendor' };
}

// Normalize API response into our Product interface
function transformProduct(product: any): Product {
  return {
    id: Number(product.id),
    name: String(product.name ?? ''),
    sku: String(product.sku ?? ''),
    description: product.description ?? undefined,
    category_id: Number(product.category_id ?? (product.category?.id ?? 0)),
    vendor_id: Number(product.vendor_id ?? (product.vendor?.id ?? 0)),
    is_archived: Boolean(product.is_archived),
    custom_fields: Array.isArray(product.custom_fields) ? product.custom_fields : undefined,
    images: Array.isArray(product.images) ? product.images : undefined,
    primary_image: (() => {
      const pi = product?.primary_image;
      if (!pi) return undefined;
      const u = pi.url ?? pi.image_url ?? pi.image_path;
      if (!u) return undefined;
      return {
        id: Number(pi.id ?? 0),
        url: String(u),
        alt_text: pi.alt_text ?? product?.name ?? undefined,
        image_url: pi.image_url ?? undefined,
        image_path: pi.image_path ?? undefined,
      } as PrimaryImage;
    })(),
    variants: Array.isArray(product.variants) ? product.variants : undefined,
    category: normalizeCategory(product.category),
    vendor: normalizeVendor(product.vendor),
    created_at: String(product.created_at ?? ''),
    updated_at: String(product.updated_at ?? ''),
  };
}

function extractItemsFromAdvancedSearch(result: any): any[] {
  const root = result?.data ?? result ?? {};
  // Common shapes:
  // - { success, data: { items: [...], pagination: {...} } }
  // - { success, data: { data: { items: [...] } } }
  // - { success, data: [...] }
  // - { success, data: { items: [...] } }
  const dataRoot = root?.data ?? root;

  const candidates = [
    dataRoot?.items,
    dataRoot?.data?.items,
    dataRoot?.data?.data?.items,
    dataRoot?.data,
    dataRoot?.data?.data,
    dataRoot,
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c;
  }
  return [];
}

function extractPaginationFromAdvancedSearch(result: any): AdvancedSearchResponse['pagination'] {
  const root = result?.data ?? result ?? {};
  const dataRoot = root?.data ?? root;

  const pg =
    dataRoot?.pagination ??
    dataRoot?.data?.pagination ??
    dataRoot?.data?.data?.pagination ??
    null;

  if (!pg) return null;

  const total = Number(pg.total ?? pg?.pagination?.total ?? 0);
  const per_page = Number(pg.per_page ?? pg.limit ?? 0);
  const current_page = Number(pg.current_page ?? pg.page ?? 1);
  const last_page = Number(pg.last_page ?? pg.total_pages ?? 1);

  return {
    total: Number.isFinite(total) ? total : 0,
    per_page: Number.isFinite(per_page) ? per_page : 0,
    current_page: Number.isFinite(current_page) ? current_page : 1,
    last_page: Number.isFinite(last_page) ? last_page : 1,
    from: pg.from ?? undefined,
    to: pg.to ?? undefined,
  };
}

export const productService = {
  /** Get all products (with optional filters and pagination) */
  async getAll(params?: {
    page?: number;
    per_page?: number;
    category_id?: number;
    vendor_id?: number;
    search?: string;
    is_archived?: boolean;
  }): Promise<{ data: Product[]; total: number; current_page: number; last_page: number }> {
    try {
      const response = await axiosInstance.get('/products', { params });
      const result = response.data;

      if (!result?.success) {
        return { data: [], total: 0, current_page: 1, last_page: 1 };
      }

      // ✅ Support multiple backend response shapes:
      // 1) { success, data: { products: [...], pagination: {...} } }
      // 2) { success, data: { data: [...], total, current_page, last_page } } (Laravel paginator)
      // 3) { success, data: [...] }
      const dataRoot = result.data ?? {};

      const rawList: any[] = Array.isArray(dataRoot.products)
        ? dataRoot.products
        : Array.isArray(dataRoot.data)
          ? dataRoot.data
          : Array.isArray(dataRoot)
            ? dataRoot
            : [];

      const products = rawList.map(transformProduct);

      // Pagination (new shape)
      const pagination = dataRoot.pagination;
      if (pagination) {
        return {
          data: products,
          total: pagination.total ?? products.length,
          current_page: pagination.current_page ?? 1,
          last_page: pagination.total_pages ?? pagination.last_page ?? 1,
        };
      }

      // Pagination (Laravel-like)
      return {
        data: products,
        total: dataRoot.total ?? products.length,
        current_page: dataRoot.current_page ?? 1,
        last_page: dataRoot.last_page ?? 1,
      };
    } catch (error: any) {
      console.error('Get products error:', error);
      return { data: [], total: 0, current_page: 1, last_page: 1 };
    }
  },

  /**
   * Get ALL products by paging through /products.
   * Fixes environments where backend caps per_page (common cause of “missing products”).
   */
  async getAllAll(
    params?: {
      category_id?: number;
      vendor_id?: number;
      is_archived?: boolean;
      search?: string;
      per_page?: number;
    },
    opts?: { max_items?: number; max_pages?: number }
  ): Promise<Product[]> {
    const per_page = Math.min(Math.max(Number(params?.per_page ?? 200), 1), 200);
    const max_items = Number(opts?.max_items ?? 100000);
    const max_pages = Number(opts?.max_pages ?? 500);

    const out: Product[] = [];
    let page = 1;

    while (page <= max_pages && out.length < max_items) {
      const res = await this.getAll({ ...(params ?? {}), page, per_page });
      out.push(...(res.data ?? []));

      const last = Number(res.last_page ?? 1);
      const total = Number(res.total ?? out.length);

      if (page >= last) break;
      if (out.length >= total) break;

      page += 1;
    }

    // De-dup by id (defensive)
    const seen = new Set<number>();
    return out.filter((p) => {
      if (!p?.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  },

  /** Advanced multi-language search (Bangla + Roman + English + fuzzy) */
  async advancedSearch(params: AdvancedSearchParams): Promise<AdvancedSearchResponse> {
    // Backend validation: per_page must be <= 100
    const per_page = Math.min(Math.max(Number(params.per_page ?? 50), 1), 100);
    const page = Math.max(1, Number(params.page ?? 1) || 1);
    const payload: any = {
      query: params.query,
      category_id: params.category_id,
      vendor_id: params.vendor_id,
      is_archived: params.is_archived ?? false,
      enable_fuzzy: params.enable_fuzzy ?? true,
      fuzzy_threshold: params.fuzzy_threshold ?? 60,
      search_fields: params.search_fields ?? ['name', 'sku', 'description', 'category', 'custom_fields'],
      per_page,
      page,
    };

    try {
      const response = await axiosInstance.post('/products/advanced-search', payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      const result = response.data ?? {};
      const itemsRaw = extractItemsFromAdvancedSearch(result);
      const items: ProductSearchHit[] = itemsRaw.map((p: any) => ({
        ...transformProduct(p),
        search_stage: p.search_stage ?? p.searchStage ?? undefined,
        base_score: p.base_score ?? undefined,
        relevance_score: p.relevance_score ?? p.relevanceScore ?? undefined,
      }));

      const search_terms: string[] =
        (result.search_terms || result.data?.search_terms || result.data?.data?.search_terms || []) ?? [];

      const total_results =
        Number(result.total_results ?? result.data?.total_results ?? result.data?.data?.total_results ?? items.length);

      const pagination = extractPaginationFromAdvancedSearch(result);

      return {
        success: Boolean(result.success ?? true),
        query: String(result.query ?? params.query),
        search_terms: Array.isArray(search_terms) ? search_terms : [],
        total_results: Number.isFinite(total_results) ? total_results : items.length,
        items,
        pagination,
        raw: result,
      };
    } catch (error: any) {
      console.error('Advanced search error:', error);
      return {
        success: false,
        query: params.query,
        search_terms: [params.query],
        total_results: 0,
        items: [],
        pagination: null,
        raw: error?.response?.data ?? null,
      };
    }
  },

  /**
   * Advanced search but return more complete coverage by paging.
   * Use max_items to cap the returned list for UI safety.
   */
  async advancedSearchAll(
    params: Omit<AdvancedSearchParams, 'page' | 'per_page'> & { per_page?: number },
    opts?: { max_items?: number; max_pages?: number }
  ): Promise<ProductSearchHit[]> {
    // Backend validation: per_page must be <= 100
    const per_page = Math.min(Math.max(Number(params.per_page ?? 100), 1), 100);
    const max_items = Number(opts?.max_items ?? 2000);
    const max_pages = Number(opts?.max_pages ?? 50);

    const out: ProductSearchHit[] = [];
    let page = 1;

    while (page <= max_pages && out.length < max_items) {
      const res = await this.advancedSearch({ ...(params as any), page, per_page });
      out.push(...(res.items ?? []));

      const last = Number(res.pagination?.last_page ?? 1);
      const total = Number(res.pagination?.total ?? res.total_results ?? out.length);

      if (page >= last) break;
      if (out.length >= total) break;

      page += 1;
    }

    // de-dup by id
    const seen = new Set<number>();
    return out.filter((p) => {
      if (!p?.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  },

  /** Quick Search (autocomplete) */
  async quickSearch(q: string, limit = 10): Promise<ProductSearchHit[]> {
    try {
      const response = await axiosInstance.get('/products/quick-search', { params: { q, limit } });
      const result = response.data;
      const list = Array.isArray(result?.data) ? result.data : Array.isArray(result?.data?.data) ? result.data.data : [];
      return list.map((p: any) => ({ ...transformProduct(p) }));
    } catch (error) {
      console.error('Quick search error:', error);
      return [];
    }
  },

  /** Search Suggestions */
  async searchSuggestions(q: string, limit = 5): Promise<any[]> {
    try {
      const response = await axiosInstance.get('/products/search-suggestions', { params: { q, limit } });
      const result = response.data;
      return Array.isArray(result?.data) ? result.data : [];
    } catch (error) {
      console.error('Search suggestions error:', error);
      return [];
    }
  },

  /** Search Statistics */
  async getSearchStats(): Promise<any> {
    try {
      const response = await axiosInstance.get('/products/search-stats');
      const result = response.data;
      return result?.data ?? {};
    } catch (error) {
      console.error('Search stats error:', error);
      return {};
    }
  },

  /** Get single product by ID */
  async getById(id: number | string): Promise<Product> {
    try {
      const response = await axiosInstance.get(`/products/${id}`);
      const result = response.data;
      const product = result.data || result;
      return transformProduct(product);
    } catch (error: any) {
      console.error('Get product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch product');
    }
  },

  /** Create product (simple or with variants) */
  async create(data: CreateProductData | CreateProductWithVariantsData): Promise<Product> {
    try {
      const response = await axiosInstance.post('/products', data, {
        headers: { 'Content-Type': 'application/json' },
      });
      const result = response.data;
      return transformProduct(result.data || result);
    } catch (error: any) {
      console.error('Create product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create product');
    }
  },

  /** Create product with variant matrix */
  async createWithVariants(
    productData: CreateProductData,
    variantAttributes: Record<string, string[]>,
    options?: {
      base_price_adjustment?: number;
      image_url?: string;
    }
  ): Promise<{ product: Product; variants: any[] }> {
    try {
      // Step 1: Create base product
      const product = await this.create(productData);

      // Step 2: Generate variant matrix
      const variantService = await import('./productVariantService');
      const variants = await variantService.default.generateMatrix(product.id, {
        attributes: variantAttributes,
        base_price_adjustment: options?.base_price_adjustment,
      });

      return { product, variants };
    } catch (error: any) {
      console.error('Create product with variants error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create product with variants');
    }
  },

  /** Update product by ID */
  async update(id: number | string, data: Partial<CreateProductData>): Promise<Product> {
    try {
      const response = await axiosInstance.put(`/products/${id}`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
      const result = response.data;
      return transformProduct(result.data || result);
    } catch (error: any) {
      console.error('Update product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update product');
    }
  },

  /** Delete product */
  async delete(id: number | string): Promise<void> {
    try {
      await axiosInstance.delete(`/products/${id}`);
    } catch (error: any) {
      console.error('Delete product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete product');
    }
  },

  /** Archive product */
  async archive(id: number | string): Promise<void> {
    try {
      await axiosInstance.patch(`/products/${id}/archive`);
    } catch (error: any) {
      console.error('Archive product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to archive product');
    }
  },

  /** Restore archived product */
  async restore(id: number | string): Promise<void> {
    try {
      await axiosInstance.patch(`/products/${id}/restore`);
    } catch (error: any) {
      console.error('Restore product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to restore product');
    }
  },

  /** Fetch available product fields */
  async getAvailableFields(): Promise<Field[]> {
    try {
      const response = await axiosInstance.get('/products/available-fields');
      const result = response.data;
      return result.data || [];
    } catch (error: any) {
      console.error('Get fields error:', error);
      return [];
    }
  },

  /** Upload single image and return URL */
  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;
      return result.url || result.path || '';
    } catch (error: any) {
      console.error('Upload image error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  },

  /** Add image to product */
  async addProductImage(
    productId: number,
    imageData: { image_path: string; is_primary: boolean; order: number }
  ): Promise<void> {
    try {
      await axiosInstance.post(`/products/${productId}/images`, imageData);
    } catch (error: any) {
      console.error('Add product image error:', error);
      throw new Error(error.response?.data?.message || 'Failed to add product image');
    }
  },

  /** Bulk update products */
  async bulkUpdate(data: {
    product_ids: number[];
    action: 'archive' | 'restore' | 'update_category' | 'update_vendor';
    category_id?: number;
    vendor_id?: number;
  }): Promise<{ message: string }> {
    try {
      const response = await axiosInstance.post('/products/bulk-update', data);
      const result = response.data;
      return { message: result.message || 'Bulk update successful' };
    } catch (error: any) {
      console.error('Bulk update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to bulk update products');
    }
  },

  /** Get product statistics */
  async getStatistics(params?: { from_date?: string; to_date?: string }): Promise<any> {
    try {
      const response = await axiosInstance.get('/products/statistics', { params });
      const result = response.data;
      return result.data || {};
    } catch (error: any) {
      console.error('Get statistics error:', error);
      return {};
    }
  },

  /** Search products by custom field */
  async searchByCustomField(params: {
    field_id: number;
    value: any;
    operator?: '=' | 'like' | '>' | '<' | '>=' | '<=';
    per_page?: number;
  }): Promise<{ data: Product[]; total: number }> {
    try {
      const response = await axiosInstance.get('/products/search-by-field', { params });
      const result = response.data;

      if (result.success) {
        const products = (result.data.data || result.data || []).map(transformProduct);
        return {
          data: products,
          total: result.data.total || products.length,
        };
      }

      return { data: [], total: 0 };
    } catch (error: any) {
      console.error('Search by custom field error:', error);
      return { data: [], total: 0 };
    }
  },
};

export default productService;
