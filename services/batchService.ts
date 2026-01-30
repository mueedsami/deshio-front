import axios from '@/lib/axios';

export interface Product {
  id: number;
  name: string;
  sku?: string;
}

export interface Store {
  id: number;
  name: string;
}

export interface Barcode {
  id: number;
  barcode: string;
  type: string;
}

export interface Batch {
  id: number;
  batch_number: string;
  /** Some APIs also include raw FK columns */
  product_id?: number;
  store_id?: number;
  product: Product;
  store: Store;
  quantity: number;
  cost_price: string;
  sell_price: string;
  profit_margin: string;
  total_value: string;
  sell_value: string;
  availability: boolean;
  status: string;
  is_active: boolean;
  manufactured_date: string | null;
  expiry_date: string | null;
  days_until_expiry: number | null;
  barcode: Barcode | null;
  created_at: string;
  notes?: string;
  movement_count?: number;
  last_movement?: string;
}

export interface CreateBatchData {
  product_id: number;
  store_id: number;
  quantity: number;
  cost_price: number;
  sell_price: number;
  manufactured_date?: string;
  expiry_date?: string;
  generate_barcodes?: boolean;
  barcode_type?: 'CODE128' | 'EAN13' | 'QR';
  individual_barcodes?: boolean;
  notes?: string;
}

export interface UpdateBatchData {
  quantity?: number;
  cost_price?: number;
  sell_price?: number;
  availability?: boolean;
  manufactured_date?: string;
  expiry_date?: string;
  is_active?: boolean;
  notes?: string;
}

export interface AdjustStockData {
  adjustment: number;
  reason: string;
}

export interface BatchFilters {
  product_id?: number;
  store_id?: number;
  status?: 'available' | 'expired' | 'low_stock' | 'out_of_stock' | 'inactive';
  barcode?: string;
  expiring_days?: number;
  search?: string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface ListAllOptions {
  /** Safety cap to avoid loading too much into memory */
  max_items?: number;
  /** Override per_page (backend may still cap). Defaults to 200 */
  per_page?: number;
  /** Optional safety cap on number of pages to fetch */
  max_pages?: number;
}

// Laravel Paginated Response Structure
export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    current_page: number;
    data: T[];
    first_page_url: string;
    from: number;
    last_page: number;
    last_page_url: string;
    next_page_url: string | null;
    path: string;
    per_page: number;
    prev_page_url: string | null;
    to: number;
    total: number;
  };
}

// Standard API Response Structure
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

/**
 * Bulk Price Update Response (based on your backend handler)
 */
export interface BulkBatchPriceUpdateData {
  product_id: number;
  sell_price: string; // backend may return string formatted
  updated_batches: number;
  updates: Array<{
    batch_id: number;
    batch_number: string | null;
    store: string;
    old_price: string;
    new_price: string;
  }>;
}

class BatchService {
  /**
   * Fetch ALL batches by paging through the backend.
   * Many environments cap per_page (often 20/50/100), so relying on a single request
   * can silently hide batches.
   */
  async getBatchesAll(filters?: BatchFilters, opts?: ListAllOptions): Promise<Batch[]> {
    const out: Batch[] = [];

    const requestedPerPage = opts?.per_page ?? filters?.per_page ?? 200;
    // Keep it reasonable; backend may still cap.
    const per_page = Math.max(1, Math.min(200, Number(requestedPerPage) || 200));
    const max_items = opts?.max_items ?? 200000;
    const max_pages = opts?.max_pages ?? 5000;

    let page = 1;
    while (page <= max_pages && out.length < max_items) {
      const resp = await this.getBatches({ ...(filters || {}), per_page, page });
      const items = resp?.data?.data ?? [];
      out.push(...items);

      const lastPage = Number(resp?.data?.last_page || page);
      if (page >= lastPage) break;
      if (!items.length) break; // safety: stop if backend returns empty page

      page += 1;
    }

    return out.slice(0, max_items);
  }

  /**
   * Get all batches with filters (returns full paginated response)
   */
  async getBatches(filters?: BatchFilters): Promise<PaginatedResponse<Batch>> {
    const response = await axios.get('/batches', { params: filters });
    return response.data;
  }

  /**
   * Get batches as array (helper method for easier data access)
   * This extracts the array from the paginated response
   */
  async getBatchesArray(filters?: BatchFilters): Promise<Batch[]> {
    const response = await this.getBatches(filters);
    return response.data.data;
  }

  /**
   * Get single batch by ID
   */
  async getBatch(id: number): Promise<ApiResponse<Batch>> {
    const response = await axios.get(`/batches/${id}`);
    return response.data;
  }

  /**
   * Create new batch
   */
  async createBatch(data: CreateBatchData): Promise<ApiResponse<{
    batch: Batch;
    barcodes_generated: number;
    primary_barcode: Barcode | null;
  }>> {
    const response = await axios.post('/batches', data);
    return response.data;
  }

  /**
   * Update batch
   */
  async updateBatch(id: number, data: UpdateBatchData): Promise<ApiResponse<Batch>> {
    const response = await axios.put(`/batches/${id}`, data);
    return response.data;
  }

  /**
   * Adjust stock (add or remove)
   */
  async adjustStock(id: number, data: AdjustStockData): Promise<ApiResponse<{
    batch: Batch;
    old_quantity: number;
    new_quantity: number;
    adjustment: number;
  }>> {
    const response = await axios.post(`/batches/${id}/adjust-stock`, data);
    return response.data;
  }

  /**
   * ✅ Bulk update selling price for ALL batches of a product
   * Endpoint: POST /products/{product_id}/batches/update-price
   * Body: { sell_price: number }
   */
  async updateAllBatchPrices(
    productId: number,
    sellPrice: number
  ): Promise<ApiResponse<BulkBatchPriceUpdateData>> {
    const response = await axios.post(`/products/${productId}/batches/update-price`, {
      sell_price: sellPrice,
    });
    return response.data;
  }

  /**
   * Get low stock batches
   */
  async getLowStock(threshold: number = 10, storeId?: number): Promise<ApiResponse<{
    threshold: number;
    count: number;
    batches: Batch[];
  }>> {
    const response = await axios.get('/batches/low-stock', {
      params: { threshold, store_id: storeId }
    });
    return response.data;
  }

  /**
   * Get expiring soon batches
   */
  async getExpiringSoon(days: number = 30, storeId?: number): Promise<ApiResponse<{
    days: number;
    count: number;
    batches: Batch[];
  }>> {
    const response = await axios.get('/batches/expiring-soon', {
      params: { days, store_id: storeId }
    });
    return response.data;
  }

  /**
   * Get expired batches
   */
  async getExpired(storeId?: number): Promise<ApiResponse<{
    count: number;
    batches: Batch[];
  }>> {
    const response = await axios.get('/batches/expired', {
      params: { store_id: storeId }
    });
    return response.data;
  }

  /**
   * Get batch statistics
   */
  async getStatistics(storeId?: number): Promise<ApiResponse<{
    total_batches: number;
    active_batches: number;
    available_batches: number;
    low_stock_batches: number;
    out_of_stock_batches: number;
    expiring_soon_batches: number;
    expired_batches: number;
    total_inventory_value: number;
    total_sell_value: number;
    total_units: number;
    by_store?: Array<{
      store_id: number;
      store_name: string;
      batch_count: number;
      total_units: number;
      inventory_value: string;
    }>;
  }>> {
    const response = await axios.get('/batches/statistics', {
      params: { store_id: storeId }
    });
    return response.data;
  }

  /**
   * Delete/deactivate batch
   */
  async deleteBatch(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await axios.delete(`/batches/${id}`);
    return response.data;
  }

  /**
   * Get batches by product (returns array)
   */
  async getBatchesByProduct(productId: number): Promise<Batch[]> {
    return this.getBatchesArray({ product_id: productId });
  }

  /**
   * Get batches by store (returns array)
   */
  async getBatchesByStore(storeId: number): Promise<Batch[]> {
    return this.getBatchesArray({ store_id: storeId });
  }

  /**
   * Get available batches (returns array)
   */
  async getAvailableBatches(storeId?: number): Promise<Batch[]> {
    return this.getBatchesArray({
      status: 'available',
      store_id: storeId
    });
  }

  /**
   * Get ALL available batches by store (paged)
   */
  async getAvailableBatchesAll(storeId?: number, opts?: ListAllOptions): Promise<Batch[]> {
    return this.getBatchesAll(
      {
        status: 'available',
        store_id: storeId,
      },
      opts
    );
  }
}

export default new BatchService();
