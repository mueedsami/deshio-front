import axios from '@/lib/axios';

export interface Product {
  id: number;
  name: string;
  sku?: string;
  primary_image?: {
    url: string;
  };
  images?: Array<{
    image_url: string;
    is_primary: boolean;
  }>;
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
  product_id?: number | string;
  product_ids?: string | number[];
  min_sell_price?: string | number;
  max_sell_price?: string | number;
  exact_price?: string | number;
  search?: string;
  store_id?: number | string;
  status?: 'available' | 'expired' | 'low_stock' | 'out_of_stock' | 'inactive' | string;
  barcode?: string;
  batch_number?: string;
  expiring_days?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
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
  product_ids?: number[];
  sell_price?: string; // backend may return string formatted
  cost_price?: string;
  new_sell_price?: string | null;
  new_cost_price?: string | null;
  updated_batches?: number;
  batches_updated?: number;
  updates: Array<{
    batch_id: number;
    batch_number: string | null;
    product_name?: string;
    store: string;
    old_price?: string;
    new_price?: string;
    old_sell_price?: string;
    new_sell_price?: string;
    old_cost_price?: string;
    new_cost_price?: string;
  }>;
}



export interface DeletedBatchReportBarcode {
  deleted_record_id: number;
  product_barcode_id: number;
  barcode: string | null;
  current_status: string | null;
  is_active: boolean;
  is_defective: boolean;
  deleted_at: string | null;
}

export interface DeletedBatchReportRow {
  product: { id: number | null; name: string; sku?: string | null };
  deleted_batch: { id: number | null; batch_number?: string | null };
  store: { id: number | null; name?: string | null };
  purchase_order: { id: number | null; number?: string | null };
  deleted_stock: number;
  barcodes_logged: number;
  barcodes_returned: number;
  first_deleted_at: string | null;
  last_deleted_at: string | null;
  barcodes: DeletedBatchReportBarcode[];
}

export interface DeletedBatchReportSummary {
  total_report_groups: number;
  total_products: number;
  total_deleted_batches: number;
  total_deleted_barcodes: number;
  stock_rule?: string;
}

export interface DeletedBatchReportFilters {
  search?: string;
  product_id?: number | string;
  store_id?: number | string;
  date_from?: string;
  date_to?: string;
  page?: number;
  per_page?: number;
  barcode_limit?: number;
}

export interface DeletedBatchReportResponse {
  current_page: number;
  data: DeletedBatchReportRow[];
  from: number | null;
  last_page: number;
  per_page: number;
  to: number | null;
  total: number;
  summary: DeletedBatchReportSummary;
}

export interface BulkDeleteBatchPreviewRequest {
  product_id: number;
  store_id: number;
  quantity: number;
  cost_price: number;
  sell_price: number;
}

export interface BulkDeleteBatchPriceSource {
  source: string;
  source_batch_id: number | null;
  source_batch_number: string | null;
  cost_price: number;
  sell_price: number;
}

export interface BulkDeleteBatchPreviewData {
  product: { id: number; name: string; sku?: string };
  target_store: { id: number; name: string; type?: string };
  new_stock_count: number;
  existing_batches: number;
  existing_units: number;
  barcodes_to_block: number;
  old_batches: Array<{
    id: number;
    batch_number: string;
    store_id: number;
    store_name?: string;
    quantity: number;
    cost_price: number;
    sell_price: number;
    created_at?: string;
  }>;
  new_batch: {
    store_id: number;
    store_name: string;
    quantity: number;
    cost_price: number;
    sell_price: number;
  };
  price_source: BulkDeleteBatchPriceSource;
  warnings: string[];
}

export interface BulkDeleteBatchConfirmData {
  product: { id: number; name: string; sku?: string };
  store: { id: number; name: string };
  deleted_batches: number;
  deleted_units: number;
  blocked_barcodes: number;
  deleted_batch_details: Array<{
    deleted_batch_id: number;
    deleted_batch_number: string;
    store_id: number;
    store_name?: string;
    quantity: number;
    barcodes_logged: number;
  }>;
  created_batch: Batch;
  barcodes_generated: number;
  all_barcodes: Array<{ id: number; barcode: string; type: string; is_primary: boolean }>;
  price_source: BulkDeleteBatchPriceSource;
}

class BatchService {
  /**
   * Get all batches with filters (returns full paginated response)
   */
  async getBatches(filters?: BatchFilters): Promise<PaginatedResponse<Batch>> {
    const response = await axios.get('/batches', { params: filters });
    return response.data;
  }

  /**
   * Get batches as array (helper method for easier data access)
   * This extracts the array from the paginated response.
   * Default per_page set to 2000 to avoid common pagination pitfalls in POS/Social.
   */
  async getBatchesArray(filters?: BatchFilters): Promise<Batch[]> {
    const response = await this.getBatches({ per_page: 2000, ...filters });
    return response.data?.data || (Array.isArray(response.data) ? response.data : []);
  }

  async getBatchesAll(
    filters: BatchFilters = {},
    options: { max_items?: number; max_pages?: number } = {}
  ): Promise<Batch[]> {
    const maxItems = options.max_items ?? 2000;
    const maxPages = options.max_pages ?? 20;
    const all: Batch[] = [];
    let page = Number(filters.page || 1) || 1;
    let pagesRead = 0;

    while (pagesRead < maxPages && all.length < maxItems) {
      const response = await this.getBatches({
        ...filters,
        page,
        per_page: filters.per_page || 100,
      });

      const items = Array.isArray((response as any)?.data?.data) ? (response as any).data.data : [];
      all.push(...items);

      const currentPage = Number((response as any)?.data?.current_page || page);
      const lastPage = Number((response as any)?.data?.last_page || currentPage);

      if (!items.length || currentPage >= lastPage) {
        break;
      }

      page = currentPage + 1;
      pagesRead += 1;
    }

    return all.slice(0, maxItems);
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
    priceData: number | { sell_price?: number; cost_price?: number },
    productIds?: number[]
  ): Promise<ApiResponse<BulkBatchPriceUpdateData>> {
    const payload = typeof priceData === 'number' ? { sell_price: priceData } : { ...priceData };
    if (productIds?.length) {
      (payload as any).product_ids = productIds;
    }
    const response = await axios.post(`/products/${productId}/batches/update-price`, payload);
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
   * Deleted batch report: products, deleted stock counts and preserved old barcodes.
   */
  async getDeletedBatchReport(filters?: DeletedBatchReportFilters): Promise<ApiResponse<DeletedBatchReportResponse>> {
    const response = await axios.get('/batches/deleted-report', { params: filters });
    return response.data;
  }

  /**
   * Preview destructive stock reset for Inventory > Delete Bulk Batch.
   */
  async previewBulkDeleteBatch(data: BulkDeleteBatchPreviewRequest): Promise<ApiResponse<BulkDeleteBatchPreviewData>> {
    const response = await axios.post('/batches/delete-bulk-batch/preview', data);
    return response.data;
  }

  /**
   * Confirm stock reset: delete old batches, block old barcodes, create fresh batch.
   */
  async confirmBulkDeleteBatch(data: BulkDeleteBatchPreviewRequest): Promise<ApiResponse<BulkDeleteBatchConfirmData>> {
    const response = await axios.post('/batches/delete-bulk-batch/confirm', {
      ...data,
      barcode_type: 'CODE128',
    });
    return response.data;
  }

  /**
   * Delete/deactivate batch
   */
  async deleteBatch(id: number): Promise<ApiResponse<{ deleted_batch_id?: number; deleted_batch_number?: string; barcodes_logged?: number }>> {
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
}

export default new BatchService();
