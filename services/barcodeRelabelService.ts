import axios from '@/lib/axios';

export type RelabelStatus = 'open' | 'used' | 'reconciled' | 'cancelled';

export interface CreateRelabelPayload {
  batch_id: number;
  product_id?: number;
  store_id?: number;
  barcode?: string;
  type?: 'CODE128' | 'EAN13' | 'QR';
  reason?: string;
  notes?: string;
  known_original_barcode_id?: number;
}

export interface ReplacementBarcodeResult {
  id: number;
  barcode: string;
  type: string;
  product_name?: string | null;
  batch_number?: string | null;
  batch_quantity_after_relabel?: number | null;
  status?: string;
  replacement_status?: RelabelStatus;
}

export interface CreateRelabelResponse {
  success: boolean;
  message: string;
  data: {
    relabel: any;
    replacement_barcode: ReplacementBarcodeResult;
    rule: string;
  };
}

export interface RelabelListResponse {
  success: boolean;
  data: {
    items: any[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

class BarcodeRelabelService {
  async createRelabel(payload: CreateRelabelPayload): Promise<CreateRelabelResponse> {
    const response = await axios.post<CreateRelabelResponse>('/barcodes/relabels', payload);
    return response.data;
  }

  async listRelabels(params?: {
    product_id?: number;
    batch_id?: number;
    store_id?: number;
    status?: RelabelStatus | string;
    per_page?: number;
  }): Promise<RelabelListResponse> {
    const response = await axios.get<RelabelListResponse>('/barcodes/relabels', { params });
    return response.data;
  }

  async reconcileBatch(batchId: number): Promise<any> {
    const response = await axios.post('/barcodes/relabels/reconcile-batch', { batch_id: batchId });
    return response.data;
  }
}

export const barcodeRelabelService = new BarcodeRelabelService();
export default barcodeRelabelService;
