import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://your-domain.com/api';

export interface SSLCommerzInitResponse {
  success: boolean;
  message: string;
  data: {
    order: {
      id: number;
      order_number: string;
      total_amount: number;
      status: string;
      payment_status: string;
    };
    payment_url: string;
    transaction_id: string;
  };
}

class SSLCommerzService {
  private getAuthToken(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token') || '';
    }
    return '';
  }

  private getAuthHeaders() {
    const token = this.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    };
  }

  /**
   * Initialize SSLCommerz payment
   * This creates an order and returns the payment gateway URL
   */
  async initializePayment(orderData: {
    shipping_address_id: number;
    billing_address_id?: number;
    notes?: string;
    coupon_code?: string;
  }): Promise<SSLCommerzInitResponse> {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/customer/orders/create-from-cart`,
        {
          ...orderData,
          payment_method: 'sslcommerz',
        },
        {
          headers: this.getAuthHeaders(),
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('SSLCommerz initialization failed:', error);
      throw {
        message: error.response?.data?.message || 'Failed to initialize payment',
        errors: error.response?.data?.errors || {},
      };
    }
  }

  /**
   * Redirect to SSLCommerz payment gateway
   * The gateway will handle payment and redirect back to backend callbacks
   * Backend routes handle: /api/sslcommerz/success, /failure, /cancel
   */
  redirectToPaymentGateway(paymentUrl: string): void {
    if (typeof window !== 'undefined') {
      // Store current location to return to after payment
      localStorage.setItem('sslc_return_url', window.location.pathname);
      
      // Redirect to payment gateway
      window.location.href = paymentUrl;
    }
  }

  /**
   * Store payment intent in localStorage before redirecting
   * This helps track the payment flow when user returns
   */
  storePaymentIntent(data: {
    order_id: number;
    order_number: string;
    transaction_id: string;
    amount: number;
    timestamp: number;
  }): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sslc_payment_intent', JSON.stringify(data));
    }
  }

  /**
   * Get stored payment intent
   */
  getPaymentIntent(): {
    order_id: number;
    order_number: string;
    transaction_id: string;
    amount: number;
    timestamp: number;
  } | null {
    if (typeof window !== 'undefined') {
      const data = localStorage.getItem('sslc_payment_intent');
      return data ? JSON.parse(data) : null;
    }
    return null;
  }

  /**
   * Clear payment intent after successful processing
   */
  clearPaymentIntent(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('sslc_payment_intent');
      localStorage.removeItem('sslc_return_url');
    }
  }

  /**
   * Check if currently processing a payment
   */
  isProcessingPayment(): boolean {
    const intent = this.getPaymentIntent();
    if (!intent) return false;

    // Check if payment intent is not older than 30 minutes
    const thirtyMinutes = 30 * 60 * 1000;
    return (Date.now() - intent.timestamp) < thirtyMinutes;
  }

  /**
   * Check payment status after user returns from gateway
   * Use this to verify if payment was completed
   */
  async checkPaymentStatus(orderId: number): Promise<{
    success: boolean;
    order: {
      id: number;
      order_number: string;
      status: string;
      payment_status: string;
      total_amount: number;
    };
  }> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/customer/orders/${orderId}`,
        {
          headers: this.getAuthHeaders(),
        }
      );

      return {
        success: true,
        order: response.data.data.order,
      };
    } catch (error: any) {
      console.error('Failed to check payment status:', error);
      throw {
        message: error.response?.data?.message || 'Failed to verify payment status',
        errors: error.response?.data?.errors || {},
      };
    }
  }

  /**
   * Get return URL after payment
   */
  getReturnUrl(): string {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sslc_return_url') || '/e-commerce/my-account';
    }
    return '/e-commerce/my-account';
  }
}

export default new SSLCommerzService();