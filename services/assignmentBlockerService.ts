import axios from '@/lib/axios';

export interface AssignmentBlockerOrderItem {
  order_id: number;
  order_number: string;
  status: string;
  order_type?: string;
  payment_status?: string;
  store_id?: number;
  customer_name?: string;
  customer_phone?: string;
  order_item_id: number;
  quantity: number;
  ordered_quantity?: number;
  returned_quantity?: number;
  effective_hold_quantity?: number;
  fully_returned?: boolean;
  return_refs?: any[];
  has_locked_barcode: boolean;
  locked_barcode?: string | null;
  product_barcode_id?: number | null;
  product_batch_id?: number | null;
  is_inventory_deducted?: boolean;
  stock_hold_released?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface AssignmentBlockerInventoryDetail {
  product_id: number;
  product_name: string;
  product_sku?: string;
  required_quantity?: number;
  physical_quantity: number;
  batch_physical_quantity?: number;
  sellable_barcode_quantity?: number;
  stock_source?: string;
  assigned_quantity?: number;
  unbarcoded_assigned_quantity?: number;
  assigned_quantity_subtracted?: number;
  free_physical_quantity?: number;
  available_quantity: number;
  can_fulfill?: boolean;
  issue_type?: string;
  issue_message?: string;
  blocking_order_count?: number;
  blocking_quantity?: number;
  blocking_orders?: AssignmentBlockerOrderItem[];
  no_barcode_orders?: AssignmentBlockerOrderItem[];
}

export interface AssignmentBlockerStoreRow {
  store_id: number;
  store_name: string;
  store_code?: string | null;
  store_type?: string;
  inventory_details: AssignmentBlockerInventoryDetail[];
  can_fulfill_entire_order?: boolean;
  fulfillment_percentage?: number;
  blocked_product_count?: number;
  blocking_order_count?: number;
  primary_issue?: string;
}

export interface AssignmentBlockersResponse {
  success: boolean;
  message?: string;
  data?: {
    order?: {
      id: number;
      order_number: string;
      status: string;
      order_type?: string;
      store_id?: number | null;
      customer_name?: string;
      customer_phone?: string;
      total_amount?: string;
      created_at?: string;
    };
    stores: AssignmentBlockerStoreRow[];
    summary?: Record<string, any>;
  };
}

export interface ProductAssignmentDiagnosticsResponse {
  success: boolean;
  message?: string;
  data?: {
    products: Array<{
      product: { id: number; sku?: string; name: string };
      reserved_product?: Record<string, any>;
      order_summary?: Record<string, any>;
      stores: Array<AssignmentBlockerStoreRow & {
        no_barcode_orders?: AssignmentBlockerOrderItem[];
        no_barcode_quantity?: number;
        open_order_count?: number;
        open_order_quantity?: number;
        shipped_without_barcode_count?: number;
        shipped_without_barcode_quantity?: number;
      }>;
    }>;
    summary?: Record<string, any>;
  };
}

export interface ReleaseAssignmentBlockerResponse {
  success: boolean;
  message?: string;
  data?: {
    order_item?: AssignmentBlockerOrderItem & {
      product_id?: number;
      product_name?: string;
      product_sku?: string;
      batch_number?: string;
    };
    safe_to_release?: boolean;
    will_change?: boolean;
    reason?: string;
    released_at?: string;
  };
}

class AssignmentBlockerService {
  async getOrderBlockers(params: { order: string; store_id?: number | string }): Promise<AssignmentBlockersResponse> {
    const response = await axios.get('/order-management/assignment-blockers', { params });
    return response.data;
  }

  async getProductDiagnostics(params: { product: string; store_id?: number | string; max_orders?: number }): Promise<ProductAssignmentDiagnosticsResponse> {
    const response = await axios.get('/order-management/assignment-blockers/product', { params });
    return response.data;
  }

  async releaseItem(payload: { order_item_id: number; apply?: boolean; reason?: string }): Promise<ReleaseAssignmentBlockerResponse> {
    const response = await axios.post('/order-management/assignment-blockers/release-item', payload);
    return response.data;
  }
}

export default new AssignmentBlockerService();
