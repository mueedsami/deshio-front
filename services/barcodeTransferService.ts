import axios from '@/lib/axios';

export interface TransferToStorePayload {
  barcode: string;
  store_id: number;
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
    current_status?: string;
    transferred_at?: string;
  };
}

class BarcodeTransferService {
  /**
   * IMPORTANT: Backend doc shows /api/employee/barcodes/transfer-to-store.
   * Per frontend requirement, use /api/barcodes/transfer-to-store (without /employee).
   */
  async transferToStore(payload: TransferToStorePayload): Promise<TransferToStoreResponse> {
    const response = await axios.post('/barcodes/transfer-to-store', payload);
    return response.data;
  }
}

export default new BarcodeTransferService();
