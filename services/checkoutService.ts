import axiosInstance from '@/lib/axios';

// Types for checkout and orders
export interface Address {
  id?: number;
  name: string;
  phone: string;
  email?: string;
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  landmark?: string;
  delivery_instructions?: string;
  is_default_shipping?: boolean;
  is_default_billing?: boolean;
}

export interface OrderItem {
  product_id: number;
  product_name: string;
  quantity: number;
  price: number;
  total: number;
  product_image?: string;
  sku?: string;
  color?: string;
  size?: string;
}

export interface OrderSummary {
  subtotal: number;
  shipping_charge: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
}

export interface CreateOrderRequest {
  payment_method: 'cash_on_delivery' | 'bkash' | 'nagad' | 'card';
  shipping_address: Address;
  billing_address?: Address;
  notes?: string;
  coupon_code?: string;
  delivery_preference?: 'standard' | 'express';
  items: OrderItem[];
}

export interface Order {
  id: number;
  order_number: string;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  payment_status: 'pending' | 'paid' | 'failed';
  payment_method: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  shipping_charge: number;
  discount_amount: number;
  created_at: string;
  estimated_delivery?: string;
  items: OrderItem[];
  shipping_address: Address;
  billing_address?: Address;
}

export interface PaymentMethod {
  id: string;
  name: string;
  description: string;
  icon?: string;
  fee: number;
  is_online: boolean;
  is_active: boolean;
}

export interface TrackingStep {
  status: string;
  label: string;
  completed: boolean;
  date: string | null;
}

export interface OrderTracking {
  order_number: string;
  status: string;
  tracking_number?: string;
  estimated_delivery?: string;
  steps: TrackingStep[];
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

class CheckoutService {
  /**
   * Get available payment methods
   */
  async getPaymentMethods(): Promise<PaymentMethod[]> {
    try {
      const response = await axiosInstance.get<ApiResponse<{ payment_methods: PaymentMethod[] }>>('/payment-methods', {
        params: {
          customer_type: 'ecommerce'
        }
      });
      return response.data.data.payment_methods;
    } catch (error: any) {
      console.error('Failed to fetch payment methods:', error);
      
      // Return default payment methods if API fails
      // These are common payment methods for Bangladesh e-commerce
      return [
        {
          id: 'cash_on_delivery',
          name: 'Cash on Delivery',
          description: 'Pay with cash when your order is delivered',
          fee: 0,
          is_online: false,
          is_active: true,
        },
        {
          id: 'bkash',
          name: 'bKash',
          description: 'Pay using bKash mobile banking',
          icon: 'bkash',
          fee: 0,
          is_online: true,
          is_active: true,
        },
        {
          id: 'nagad',
          name: 'Nagad',
          description: 'Pay using Nagad mobile banking',
          icon: 'nagad',
          fee: 0,
          is_online: true,
          is_active: true,
        },
        {
          id: 'card',
          name: 'Credit/Debit Card',
          description: 'Pay using your credit or debit card',
          icon: 'card',
          fee: 0,
          is_online: true,
          is_active: true,
        },
      ];
    }
  }

  /**
   * Validate delivery area
   * Returns default values if API fails or requires auth
   */
  async validateDeliveryArea(city: string, postalCode: string): Promise<{
    is_delivery_available: boolean;
    estimated_delivery_days: string;
    delivery_charge: number;
    message: string;
  }> {
    try {
      const response = await axiosInstance.post('/addresses/validate-delivery', {
        city,
        postal_code: postalCode,
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to validate delivery area:', error);
      
      // Return default values based on city
      // For Dhaka, standard delivery
      const isDhaka = city.toLowerCase().includes('dhaka');
      
      return {
        is_delivery_available: true,
        estimated_delivery_days: isDhaka ? '1-2' : '2-3',
        delivery_charge: isDhaka ? 60 : 120,
        message: isDhaka 
          ? 'Delivery available in 1-2 business days (Inside Dhaka)' 
          : 'Delivery available in 2-3 business days (Outside Dhaka)',
      };
    }
  } 
  /**
   * Get order by order number (for tracking)
   */
  async getOrderByNumber(orderNumber: string): Promise<Order> {
    try {
      const response = await axiosInstance.get<ApiResponse<{ order: Order }>>(`/orders/${orderNumber}`);
      return response.data.data.order;
    } catch (error: any) {
      console.error('Failed to fetch order:', error);
      throw error;
    }
  }

  /**
   * Track order
   */
  async trackOrder(orderNumber: string): Promise<{
    order: Order;
    tracking: OrderTracking;
  }> {
    try {
      const response = await axiosInstance.get<ApiResponse<{
        order: Order;
        tracking: OrderTracking;
      }>>(`/orders/${orderNumber}/track`);
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to track order:', error);
      throw error;
    }
  }

  /**
   * Process payment
   */
  async processPayment(orderNumber: string, paymentMethod: string, paymentData?: any): Promise<{
    payment_method: string;
    status: string;
    transaction_id?: string;
    message: string;
    order_status: string;
  }> {
    try {
      const response = await axiosInstance.post('/payments/process', {
        order_number: orderNumber,
        payment_method: paymentMethod,
        payment_data: paymentData,
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to process payment:', error);
      throw error;
    }
  }

  /**
   * Calculate order summary
   */
  calculateOrderSummary(items: OrderItem[], shippingCharge: number = 60, couponDiscount: number = 0): OrderSummary {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const tax_amount = 0; // Can add tax calculation if needed
    const discount_amount = couponDiscount;
    const total_amount = subtotal + shippingCharge + tax_amount - discount_amount;

    return {
      subtotal,
      shipping_charge: shippingCharge,
      tax_amount,
      discount_amount,
      total_amount,
    };
  }
}

const checkoutService = new CheckoutService();
export default checkoutService;