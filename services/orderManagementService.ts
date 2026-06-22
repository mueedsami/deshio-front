import axiosInstance from '@/lib/axios';

export interface PendingAssignmentOrder {
  id: number;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: string | number;
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: string | number;
  }>;
  items_summary: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
  }>;
  created_at: string;
  order_date: string;
}

export interface StoreInventoryDetail {
  product_id: number;
  product_name: string;
  product_sku: string;
  required_quantity: number;
  available_quantity: number;
  can_fulfill: boolean;
  batches: Array<{
    batch_id: number;
    batch_number: string;
    quantity: number;
    sell_price: string | number;
    expiry_date: string | null;
  }>;
}

export interface AvailableStore {
  store_id: number;
  store_name: string;
  store_address: string;
  // Optional because some APIs return only one of these keys
  store_type?: 'store' | 'warehouse' | string;
  type?: 'store' | 'warehouse' | string;
  is_warehouse?: boolean;
  inventory_details: StoreInventoryDetail[];
  total_items_available: number;
  total_items_required: number;
  can_fulfill_entire_order: boolean;
  fulfillment_percentage: number;
}

export interface StoreRecommendation {
  store_id: number;
  store_name: string;
  reason: string;
  fulfillment_percentage: number;
  note?: string;
}

export interface AvailableStoresResponse {
  order_id: number;
  order_number: string;
  total_items: number;
  stores: AvailableStore[];
  recommendation: StoreRecommendation | null;
}


export interface BulkAssignmentStoreSummary {
  store_id: number;
  store_name: string;
  store_address?: string;
  store_code?: string;
  store_type?: string;
  is_warehouse?: boolean;
  is_online?: boolean;
  total_items_available: number;
  total_items_required: number;
  total_required_quantity?: number;
  fulfillable_quantity?: number;
  can_fulfill_entire_order: boolean;
  fulfillment_percentage: number;
  inventory_details?: StoreInventoryDetail[];
}

export interface BulkPendingAssignmentOrder extends PendingAssignmentOrder {
  available_stores_summary?: BulkAssignmentStoreSummary[];
  best_fulfillment_store?: StoreRecommendation | null;
}

export interface BulkAssignStorePendingPayload {
  store_id: number;
  order_ids: number[];
  notes?: string;
}

export interface BulkAssignStorePendingResponse {
  success: boolean;
  partial_success?: boolean;
  message: string;
  data?: {
    store?: { id: number; name: string };
    results?: {
      success: Array<{ order_id: number; order_number: string; store_id: number; store_name: string; new_status: string }>;
      failed: Array<{ order_id: number; order_number?: string; reason: string; [key: string]: any }>;
    };
    assigned_count?: number;
    failed_count?: number;
  };
}


export interface AssignmentBlockingOrder {
  order_id: number;
  order_number: string;
  status: string;
  order_type?: string;
  payment_status?: string;
  customer_name?: string;
  customer_phone?: string;
  order_item_id: number;
  quantity: number;
  has_locked_barcode: boolean;
  locked_barcode?: string | null;
  product_barcode_id?: number | null;
  product_batch_id?: number | null;
  is_inventory_deducted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AssignmentBlockerProduct extends StoreInventoryDetail {
  physical_quantity?: number;
  batch_physical_quantity?: number;
  sellable_barcode_quantity?: number;
  stock_source?: string;
  assigned_quantity?: number;
  unbarcoded_assigned_quantity?: number;
  assigned_quantity_subtracted?: number;
  free_physical_quantity?: number;
  global_available?: number;
  shortage_quantity?: number;
  issue_type?: string;
  issue_message?: string;
  blocking_order_count?: number;
  blocking_quantity?: number;
  unbarcoded_blocking_quantity?: number;
  barcoded_blocking_quantity?: number;
  related_open_order_count?: number;
  related_open_order_quantity?: number;
  related_unbarcoded_open_quantity?: number;
  related_barcoded_open_quantity?: number;
  blocking_orders?: AssignmentBlockingOrder[];
}

export interface AssignmentBlockerStore extends AvailableStore {
  inventory_details: AssignmentBlockerProduct[];
  blocked_product_count?: number;
  blocking_order_count?: number;
  primary_issue?: string;
}

export interface AssignmentBlockerResponse {
  order: {
    id: number;
    order_number: string;
    status: string;
    order_type?: string;
    store_id?: number | null;
    customer_name?: string;
    customer_phone?: string;
    total_amount?: string | number;
    created_at?: string;
  };
  released_statuses: string[];
  stores: AssignmentBlockerStore[];
  summary: {
    stores_checked: number;
    blocked_products: number;
    blocked_store_products?: number;
    blocking_orders: number;
    can_any_store_fulfill: boolean;
  };
}


export interface ProductAssignmentDiagnosticStore {
  store_id: number;
  store_name: string;
  store_address?: string;
  store_code?: string | null;
  store_type?: string;
  is_warehouse?: boolean;
  is_online?: boolean;
  physical_quantity: number;
  batch_physical_quantity: number;
  sellable_barcode_quantity: number;
  stock_source?: string | null;
  assigned_quantity: number;
  unbarcoded_assigned_quantity: number;
  assigned_quantity_subtracted: number;
  free_physical_quantity: number;
  available_quantity: number;
  can_fulfill_one: boolean;
  open_order_count: number;
  open_order_quantity: number;
  no_barcode_order_count: number;
  no_barcode_quantity: number;
  shipped_without_barcode_count: number;
  shipped_without_barcode_quantity: number;
  assigned_without_barcode_count: number;
  assigned_without_barcode_quantity: number;
  barcoded_open_order_count: number;
  barcoded_open_quantity: number;
  no_barcode_orders: AssignmentBlockingOrder[];
}

export interface ProductAssignmentDiagnosticProduct {
  product: {
    id: number;
    sku?: string | null;
    name: string;
    base_name?: string | null;
    variation_suffix?: string | null;
    selling_price?: string | number | null;
    stock_quantity?: string | number | null;
    online_stock_quantity?: string | number | null;
    offline_stock_quantity?: string | number | null;
    reserved_stock_quantity?: string | number | null;
    is_archived?: boolean;
    created_at?: string;
    updated_at?: string;
  };
  reserved_product: {
    total_inventory: number;
    reserved_inventory: number;
    available_inventory: number;
    updated_at?: string | null;
  };
  order_summary: {
    total_order_count: number;
    total_order_line_count: number;
    total_order_quantity: number;
    open_order_count: number;
    open_order_quantity: number;
    open_no_barcode_order_count: number;
    open_no_barcode_quantity: number;
    shipped_without_barcode_count: number;
    shipped_without_barcode_quantity: number;
    assigned_without_barcode_count: number;
    assigned_without_barcode_quantity: number;
  };
  stores: ProductAssignmentDiagnosticStore[];
}

export interface ProductAssignmentDiagnosticsResponse {
  search: string;
  released_statuses: string[];
  products: ProductAssignmentDiagnosticProduct[];
  summary: {
    product_matches: number;
    stores_checked: number;
    open_no_barcode_orders: number;
    open_no_barcode_quantity: number;
    shipped_without_barcode_orders: number;
  };
}

export interface AssignStorePayload {
  store_id: number;
  notes?: string;
}

class OrderManagementService {
  /**
   * Get bulk assignment page data: pending_assignment orders + store fulfillment matrix
   */
  async getBulkPendingAssignment(params?: { per_page?: number; sort_order?: 'asc' | 'desc' }): Promise<{
    orders: BulkPendingAssignmentOrder[];
    stores: Array<{
      id: number;
      name: string;
      address?: string;
      store_code?: string;
      is_warehouse?: boolean;
      is_online?: boolean;
      is_active?: boolean;
    }>;
    pagination: {
      current_page: number;
      total_pages: number;
      per_page: number;
      total: number;
    };
  }> {
    try {
      const response = await axiosInstance.get('/order-management/bulk-pending-assignment', {
        params: params || { per_page: 100, sort_order: 'asc' },
      });

      const payload = response.data?.data || {};
      return {
        orders: Array.isArray(payload.orders) ? payload.orders : [],
        stores: Array.isArray(payload.stores) ? payload.stores : [],
        pagination: payload.pagination || {
          current_page: 1,
          total_pages: 1,
          per_page: 100,
          total: 0,
        },
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch bulk assignment data:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch bulk assignment data');
    }
  }

  /**
   * Bulk assign selected pending_assignment orders to one store and move them to assigned_to_store
   */
  async bulkAssignOrdersToStorePending(payload: BulkAssignStorePendingPayload): Promise<BulkAssignStorePendingResponse> {
    const normalizedStoreId = Number(payload?.store_id);
    const normalizedOrderIds = Array.from(new Set((payload?.order_ids || []).map((id) => Number(id)).filter(Boolean)));

    if (!normalizedStoreId) {
      throw new Error('Please select a store before assigning orders');
    }
    if (!normalizedOrderIds.length) {
      throw new Error('Please select at least one order');
    }

    try {
      const response = await axiosInstance.post('/order-management/orders/bulk-assign-store-pending', {
        store_id: normalizedStoreId,
        order_ids: normalizedOrderIds,
        notes: payload?.notes,
      });
      return response.data;
    } catch (error: any) {
      // The backend intentionally returns 422 when every selected order is rejected.
      // Surface that structured response instead of losing the per-order failure details.
      if (error.response?.data?.data?.results) {
        return error.response.data;
      }
      console.error('❌ Failed to bulk assign orders:', error);
      throw new Error(error.response?.data?.message || error?.message || 'Failed to bulk assign orders');
    }
  }

  /**
   * Get orders pending store assignment
   */
  async getPendingAssignment(params?: { per_page?: number, status?: string, sort_order?: 'asc' | 'desc' }): Promise<{
    orders: PendingAssignmentOrder[];
    pagination: {
      current_page: number;
      total_pages: number;
      per_page: number;
      total: number;
    };
  }> {
    try {
      console.log('📦 Fetching pending assignment orders...');
      
      const response = await axiosInstance.get('/order-management/pending-assignment', {
        params: params || { per_page: 15, sort_order: 'asc' }
      });

      console.log('✅ Pending assignment orders loaded:', response.data.data);

      return {
        orders: response.data.data.orders || [],
        pagination: response.data.data.pagination || {
          current_page: 1,
          total_pages: 1,
          per_page: 15,
          total: 0
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch pending assignment orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch pending assignment orders');
    }
  }

  /**
   * Get available stores for an order based on inventory
   */
  async getAvailableStores(orderId: number): Promise<AvailableStoresResponse> {
    try {
      console.log('🏪 Fetching available stores for order:', orderId);
      
      const response = await axiosInstance.get(`/order-management/orders/${orderId}/available-stores`);

      console.log('✅ Available stores loaded:', response.data.data);

      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch available stores:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch available stores');
    }
  }


  /**
   * Assignment blocker diagnostics: explains why an order cannot be assigned.
   * Accepts an order id or order number like ORD-S-7474.
   */
  async getAssignmentBlockers(order: string | number, storeId?: number | null): Promise<AssignmentBlockerResponse> {
    const orderValue = String(order || '').trim();
    if (!orderValue) {
      throw new Error('Please enter an order number or order ID');
    }

    try {
      const response = await axiosInstance.get('/order-management/assignment-blockers', {
        params: {
          order: orderValue,
          ...(storeId ? { store_id: storeId } : {}),
        },
      });

      return response.data?.data;
    } catch (error: any) {
      console.error('❌ Failed to load assignment blockers:', error?.response?.data || error);
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error?.message ||
          'Failed to load assignment blocker diagnostics'
      );
    }
  }

  /**
   * Product-level assignment diagnostics.
   * Search by product ID, SKU, or product name and show reserved rows plus
   * open orders without barcode scan/lock.
   */
  async getProductAssignmentDiagnostics(product: string | number, storeId?: number | null): Promise<ProductAssignmentDiagnosticsResponse> {
    const productValue = String(product || '').trim();
    if (!productValue) {
      throw new Error('Please enter a product ID, SKU, or product name');
    }

    try {
      const response = await axiosInstance.get('/order-management/assignment-blockers/product', {
        params: {
          product: productValue,
          ...(storeId ? { store_id: storeId } : {}),
        },
      });

      return response.data?.data;
    } catch (error: any) {
      console.error('❌ Failed to load product assignment diagnostics:', error?.response?.data || error);
      throw new Error(
        error.response?.data?.message ||
          error.response?.data?.error ||
          error?.message ||
          'Failed to load product assignment diagnostics'
      );
    }
  }

  /**
   * Assign order to a specific store
   */
  async assignOrderToStore(orderId: number, payload: AssignStorePayload): Promise<any> {
    const normalizedOrderId = Number(orderId);
    const normalizedStoreId = Number(payload?.store_id);

    if (!normalizedOrderId || !normalizedStoreId) {
      throw new Error('Invalid order/store selection');
    }

    try {
      const body = { store_id: normalizedStoreId, notes: payload?.notes };
      console.log('📍 Assigning order to store:', { orderId: normalizedOrderId, body });

      const response = await axiosInstance.post(
        `/order-management/orders/${normalizedOrderId}/assign-store`,
        body
      );

      console.log('✅ Order assigned successfully:', response.data?.data || response.data);
      return response.data?.data?.order || response.data?.data || response.data;
    } catch (error: any) {
      const serverMessage = error?.response?.data?.message;
      console.error('❌ Assign attempt failed:', {
        status: error?.response?.status,
        serverMessage,
        responseData: error?.response?.data,
      });

      if (error.response?.data?.data) {
        const { product, required, available, actually_free } = error.response.data.data;
        const availableQty = available ?? actually_free;
        if (product && required != null && availableQty != null) {
          throw new Error(
            `Insufficient inventory for ${product}: Required ${required}, Available ${availableQty}`
          );
        }
      }

      throw new Error(serverMessage || error?.message || 'Failed to assign order to store');
    }
  }

  /**
   * Revert order assignment back to pending_assignment
   */
  async revertAssignment(orderId: number): Promise<any> {
    try {
      console.log('🔄 Reverting order assignment for:', orderId);
      const response = await axiosInstance.post(`/order-management/orders/${orderId}/revert-assignment`);
      console.log('✅ Order assignment reverted successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to revert order assignment:', error);
      throw new Error(error.response?.data?.message || 'Failed to revert order assignment');
    }
  }

  /**
   * Move a mistakenly plain pending online order back to pending_assignment.
   */
  async markAsPendingAssignment(orderId: number): Promise<any> {
    try {
      console.log('🔁 Moving order to pending_assignment:', orderId);
      const response = await axiosInstance.post(`/order-management/orders/${orderId}/mark-pending-assignment`);
      console.log('✅ Order moved to pending_assignment successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to move order to pending_assignment:', error);
      throw new Error(error.response?.data?.message || 'Failed to move order to pending_assignment');
    }
  }

  /**
   * Mark order as delivered manually
   */
  async markAsDelivered(orderId: number): Promise<any> {
    try {
      console.log('📦 Marking order as delivered:', orderId);
      const response = await axiosInstance.post(`/order-management/orders/${orderId}/mark-as-delivered`);
      console.log('✅ Order marked as delivered successfully');
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to mark order as delivered:', error);
      throw new Error(error.response?.data?.message || 'Failed to mark order as delivered');
    }
  }

  /**
   * Mark multiple orders as delivered in bulk
   */
  async bulkMarkAsDelivered(orderIds: number[]): Promise<any> {
    try {
      console.log('📦 Bulk marking orders as delivered:', orderIds);
      const response = await axiosInstance.post('/order-management/orders/bulk-mark-as-delivered', {
        order_ids: orderIds
      });
      console.log('✅ Bulk delivery request completed:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Failed to process bulk delivery:', error);
      throw new Error(error.response?.data?.message || 'Failed to process bulk delivery');
    }
  }
}


export default new OrderManagementService();