import axios from '@/lib/axios';

// Minimal Lookup API wrapper (extendable)
export type LookupApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: any;
};

export type LookupOrder = any; // Keep flexible; backend may evolve.

export type LookupProductData = {
  product?: any;
  barcode?: any;
  current_location?: any;
  batch?: any;
  purchase_order_origin?: {
    po_number?: string | null;
    received_date?: string | null;
    source?: string | null;
  } | null;
  purchase_order?: any | null;
  vendor?: any | null;
  lifecycle?: any[];
  activity_history?: any[];
  summary?: {
    total_dispatches?: number;
    total_sales?: number;
    total_returns?: number;
    is_currently_defective?: boolean;
    is_active?: boolean;
    current_status?: string;
    has_purchase_order?: boolean;
    has_vendor_info?: boolean;
    [key: string]: any;
  };
  [key: string]: any;
};

const lookupService = {
  async getOrder(orderId: number): Promise<LookupApiResponse<LookupOrder>> {
    const res = await axios.get(`/lookup/order/${orderId}`);
    return res.data;
  },

  async getProductByBarcode(barcode: string): Promise<LookupApiResponse<LookupProductData>> {
    const res = await axios.get(`/lookup/product`, {
      params: { barcode },
    });
    return res.data;
  },
};

export default lookupService;
