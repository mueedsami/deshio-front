import axiosInstance from '@/lib/axios';

export type GuestPaymentMethod = 'cod' | 'sslcommerz' | 'cash';

export type GuestCheckoutItem = {
  product_id: number;
  quantity: number;
  variant_options?: Record<string, any>;
};

export type GuestDeliveryAddress = {
  full_name: string;
  phone?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state?: string;
  postal_code: string;
  country?: string;
};

export type GuestCheckoutRequest = {
  phone: string;
  items: GuestCheckoutItem[];
  payment_method: GuestPaymentMethod;
  delivery_address: GuestDeliveryAddress;
  customer_name?: string;
  customer_email?: string;
  notes?: string;
};

export type GuestCheckoutCodSuccess = {
  success: true;
  message: string;
  data: {
    order: {
      order_number: string;
      order_id: number;
      status: string;
      payment_method: string;
      payment_status: string;
      total_amount: number;
    };
    customer?: {
      id: number;
      phone: string;
      name?: string;
      email?: string;
    };
    message_to_customer?: string;
    payment_url?: string;
  };
};

export type GuestCheckoutSslSuccess = {
  success: true;
  message: string;
  data: {
    order_number: string;
    order_id: number;
    customer_id: number;
    customer_phone: string;
    payment_url: string;
    transaction_id: string;
    total_amount: number;
  };
};

export type GuestCheckoutResponse = GuestCheckoutCodSuccess | GuestCheckoutSslSuccess;

export type GuestOrdersByPhoneResponse = {
  success: true;
  data: {
    customer: {
      phone: string;
      name?: string;
    };
    orders: Array<{
      order_number: string;
      order_id: number;
      status: string;
      payment_method: string;
      payment_status: string;
      total_amount: number;
      created_at: string;
      items_count: number;
    }>;
    total_orders: number;
  };
};

type ApiResponse<T> = {
  success: boolean;
  message?: string;
  data: T;
  errors?: any;
};

class GuestCheckoutService {
  async checkout(payload: GuestCheckoutRequest): Promise<GuestCheckoutResponse> {
    const response = await axiosInstance.post<ApiResponse<any>>('/guest-checkout', payload);
    return response.data as any;
  }

  async ordersByPhone(phone: string): Promise<GuestOrdersByPhoneResponse> {
    const response = await axiosInstance.post<ApiResponse<any>>('/guest-orders/by-phone', { phone });
    return response.data as any;
  }
}

const guestCheckoutService = new GuestCheckoutService();
export default guestCheckoutService;
