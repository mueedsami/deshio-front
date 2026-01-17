import axiosInstance from '@/lib/axios';

export type PathaoLookupData = {
  order_number: string;
  order_id: number | null;
  is_sent_via_pathao: boolean;
  pathao_consignment_id: string | null;
  pathao_status: string | null;
  shipment_status: string | null;
};

export type PathaoSingleLookupResponse = {
  success: boolean;
  data: PathaoLookupData;
  message?: string;
};

export type PathaoBulkLookupItem = PathaoLookupData & {
  found: boolean;
  error?: string;
};

export type PathaoBulkLookupResponse = {
  success: boolean;
  total_requested: number;
  total_found: number;
  data: PathaoBulkLookupItem[];
  message?: string;
};

const pathaoOrderLookupService = {
  async lookupSingle(orderNumber: string): Promise<PathaoLookupData> {
    const safe = encodeURIComponent(String(orderNumber || '').trim());
    const res = await axiosInstance.get<PathaoSingleLookupResponse>(`/pathao/orders/lookup/${safe}`);
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Failed to lookup Pathao order');
    }
    return res.data.data;
  },

  async lookupBulk(orderNumbers: string[]): Promise<PathaoBulkLookupResponse> {
    const payload = {
      order_numbers: (orderNumbers || []).map((x) => String(x).trim()).filter(Boolean),
    };
    const res = await axiosInstance.post<PathaoBulkLookupResponse>(`/pathao/orders/lookup/bulk`, payload);
    if (!res.data?.success) {
      throw new Error(res.data?.message || 'Failed to bulk lookup Pathao orders');
    }
    return res.data;
  },
};

export default pathaoOrderLookupService;
