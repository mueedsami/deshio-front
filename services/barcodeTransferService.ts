import axios from '@/lib/axios';

export interface TransferToStorePayload {
  barcode: string;
  store_id: number;
  status?: 'available' | 'in_warehouse' | 'in_shop' | 'on_display';
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
    transferred_at?: string;
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
}

export default new BarcodeTransferService();
