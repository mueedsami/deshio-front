import axios from '@/lib/axios';

export interface TransferToStorePayload {
  barcode: string;
  store_id: number;
  status?: 'available' | 'in_warehouse' | 'in_shop' | 'on_display';
}

export interface ReviveOrderLockPayload extends TransferToStorePayload {
  restore_stock?: boolean;
}

export interface TransferToStoreResponse {
  success: boolean;
  message: string;
  data?: {
    barcode: string;
    product?: { id: number; name: string; sku?: string };
    from_store?: { id: number; name: string };
    to_store?: { id: number; name: string };
    batch?: { id: number; batch_number?: string; quantity?: number; sell_price?: string };
    from_status?: string;
    current_status?: string;
    released_cancelled_dispatch_links?: number;
    released_order_links_count?: number;
    released_order_links?: Array<{
      order_item_id: number;
      order_id?: number;
      order_number?: string;
      order_status?: string;
      stock_restored?: boolean;
    }>;
    stock_restored?: boolean;
    transferred_at?: string;
    revived_at?: string;
  };
}

export interface BarcodeOrderLock {
  id: number;
  barcode: string;
  current_status?: string;
  is_active?: boolean;
  is_defective?: boolean;
  product?: { id: number; name: string; sku?: string };
  batch?: {
    id: number;
    batch_number?: string;
    quantity?: number;
    store?: { id: number; name: string };
  };
  current_store?: { id: number; name: string };
  locks_count: number;
  locks: Array<{
    order_item_id: number;
    order_id?: number;
    order_number?: string;
    order_status?: string;
    order_type?: string;
    customer_name?: string;
    customer_phone?: string;
    quantity?: number;
    is_inventory_deducted?: boolean;
  }>;
  updated_at?: string;
}

export interface BarcodeOrderLocksResponse {
  success: boolean;
  data?: {
    items: BarcodeOrderLock[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

class BarcodeTransferService {
  /**
   * Revive/transfer a stuck dispatch barcode back into a selected store.
   * Backend route: POST /api/barcodes/transfer-to-store
   */
  async transferToStore(payload: TransferToStorePayload): Promise<TransferToStoreResponse> {
    const response = await axios.post('/barcodes/transfer-to-store', payload);
    return response.data;
  }

  /**
   * Revive a barcode blocked by stale order_item.product_barcode_id links.
   * Backend route: POST /api/barcodes/revive-order-lock
   */
  async reviveOrderLock(payload: ReviveOrderLockPayload): Promise<TransferToStoreResponse> {
    const response = await axios.post('/barcodes/revive-order-lock', payload);
    return response.data;
  }

  /**
   * List barcodes currently blocked by open order links.
   * Backend route: GET /api/barcodes/order-locks
   */
  async getOrderLocks(params?: { search?: string; per_page?: number; page?: number }): Promise<BarcodeOrderLocksResponse> {
    const response = await axios.get('/barcodes/order-locks', { params });
    return response.data;
  }
}

export default new BarcodeTransferService();
