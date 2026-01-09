import axiosInstance from '@/lib/axios';

export type ServiceOrderStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type ServiceOrderPaymentStatus = 'unpaid' | 'partially_paid' | 'paid';

export interface ServiceOrderListItem {
  id: number;
  service_order_number: string;
  status: ServiceOrderStatus;
  payment_status: ServiceOrderPaymentStatus;
  store_id: number;
  customer_id?: number | null;
  customer_name: string;
  customer_phone: string;
  customer_email?: string | null;
  total_amount: number;
  paid_amount: number;
  outstanding_amount: number;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  created_at?: string;
}

export interface ServiceOrderItemPayload {
  service_id: number;
  quantity: number;
  unit_price?: number;
  selected_options?: string[];
  customizations?: any;
  special_instructions?: string;
}

const pickArray = (payload: any): any[] => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.data?.data)) return payload.data.data;
  return [];
};

const pickObject = (payload: any): any => {
  if (!payload) return null;
  if (payload?.data && typeof payload.data === 'object') return payload.data;
  return payload;
};

const toNumber = (v: any): number => {
  const n = Number(String(v ?? '').replace(/,/g, '').replace(/[^0-9.\-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

class ServiceOrdersService {
  async list(params: any = {}) {
    const res = await axiosInstance.get('/service-orders', { params });
    return res.data;
  }

  async getById(id: number) {
    const res = await axiosInstance.get(`/service-orders/${id}`);
    return res.data;
  }

  async create(payload: {
    store_id: number;
    customer_id?: number;
    customer_name: string;
    customer_phone: string;
    customer_email?: string;
    customer_address?: string;
    scheduled_date?: string;
    scheduled_time?: string;
    special_instructions?: string;
    items: ServiceOrderItemPayload[];
  }) {
    const res = await axiosInstance.post('/service-orders', payload);
    return res.data;
  }

  async update(id: number, payload: any) {
    const res = await axiosInstance.put(`/service-orders/${id}`, payload);
    return res.data;
  }

  async confirm(id: number) {
    const res = await axiosInstance.patch(`/service-orders/${id}/confirm`);
    return res.data;
  }

  async start(id: number) {
    const res = await axiosInstance.patch(`/service-orders/${id}/start`);
    return res.data;
  }

  async complete(id: number) {
    const res = await axiosInstance.patch(`/service-orders/${id}/complete`);
    return res.data;
  }

  async cancel(id: number, payload: { cancellation_reason?: string } = {}) {
    const res = await axiosInstance.patch(`/service-orders/${id}/cancel`, payload);
    return res.data;
  }

  async addPayment(id: number, payload: {
    amount: number;
    payment_method_id: number;
    payment_date?: string;
    reference_number?: string;
    notes?: string;
  }) {
    const res = await axiosInstance.post(`/service-orders/${id}/payments`, payload);
    return res.data;
  }

  async statistics(params: any = {}) {
    const res = await axiosInstance.get('/service-orders/statistics', { params });
    return res.data;
  }

  async customerHistory(customerId: number) {
    const res = await axiosInstance.get(`/customers/${customerId}/service-orders`);
    return res.data;
  }

  // Convenience: normalize list payload to array of list items
  normalizeList(payload: any): ServiceOrderListItem[] {
    const arr = pickArray(payload);
    return arr.map((o: any) => ({
      id: Number(o?.id) || 0,
      service_order_number: o?.service_order_number || o?.serviceOrderNumber || '',
      status: (o?.status || 'pending') as any,
      payment_status: (o?.payment_status || 'unpaid') as any,
      store_id: Number(o?.store_id) || 0,
      customer_id: o?.customer_id ?? null,
      customer_name: o?.customer_name || o?.customer?.name || '',
      customer_phone: o?.customer_phone || o?.customer?.phone || '',
      customer_email: o?.customer_email || o?.customer?.email || null,
      total_amount: toNumber(o?.total_amount ?? o?.total ?? 0),
      paid_amount: toNumber(o?.paid_amount ?? 0),
      outstanding_amount: toNumber(o?.outstanding_amount ?? 0),
      scheduled_date: o?.scheduled_date || null,
      scheduled_time: o?.scheduled_time || null,
      created_at: o?.created_at,
    })).filter((x) => x.id);
  }

  normalizeSingle(payload: any) {
    const obj = pickObject(payload);
    return obj;
  }
}

const serviceOrdersService = new ServiceOrdersService();
export default serviceOrdersService;
