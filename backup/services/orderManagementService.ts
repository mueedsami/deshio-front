import axiosInstance from '@/lib/axios';

export interface PendingAssignmentOrder {
  id: number;
  order_number: string;
  order_type: string;
  status: string;
  total_amount: string | number;
  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  };
  items: Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: string | number;
  }>;
  items_summary: Array<{
    product_id: number;
    product_name: string;
    quantity: number;
  }>;
  created_at: string;
  order_date: string;
}

export interface StoreInventoryDetail {
  product_id: number;
  product_name: string;
  product_sku: string;
  required_quantity: number;
  available_quantity: number;
  can_fulfill: boolean;
  batches: Array<{
    batch_id: number;
    batch_number: string;
    quantity: number;
    sell_price: string | number;
    expiry_date: string | null;
  }>;
}

export interface AvailableStore {
  store_id: number;
  store_name: string;
  store_address: string;
  inventory_details: StoreInventoryDetail[];
  total_items_available: number;
  total_items_required: number;
  can_fulfill_entire_order: boolean;
  fulfillment_percentage: number;
}

export interface StoreRecommendation {
  store_id: number;
  store_name: string;
  reason: string;
  fulfillment_percentage: number;
  note?: string;
}

export interface AvailableStoresResponse {
  order_id: number;
  order_number: string;
  total_items: number;
  stores: AvailableStore[];
  recommendation: StoreRecommendation | null;
}

export interface AssignStorePayload {
  store_id: number;
  notes?: string;
}

class OrderManagementService {
  /**
   * Get orders pending store assignment
   */
  async getPendingAssignment(params?: { per_page?: number }): Promise<{
    orders: PendingAssignmentOrder[];
    pagination: {
      current_page: number;
      total_pages: number;
      per_page: number;
      total: number;
    };
  }> {
    try {
      console.log('📦 Fetching pending assignment orders...');
      
      const response = await axiosInstance.get('/order-management/pending-assignment', {
        params: params || { per_page: 15 }
      });

      console.log('✅ Pending assignment orders loaded:', response.data.data);

      return {
        orders: response.data.data.orders || [],
        pagination: response.data.data.pagination || {
          current_page: 1,
          total_pages: 1,
          per_page: 15,
          total: 0
        }
      };
    } catch (error: any) {
      console.error('❌ Failed to fetch pending assignment orders:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch pending assignment orders');
    }
  }

  /**
   * Get available stores for an order based on inventory
   */
  async getAvailableStores(orderId: number): Promise<AvailableStoresResponse> {
    try {
      console.log('🏪 Fetching available stores for order:', orderId);
      
      const response = await axiosInstance.get(`/order-management/orders/${orderId}/available-stores`);

      console.log('✅ Available stores loaded:', response.data.data);

      return response.data.data;
    } catch (error: any) {
      console.error('❌ Failed to fetch available stores:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch available stores');
    }
  }

  /**
   * Assign order to a specific store
   */
  async assignOrderToStore(orderId: number, payload: AssignStorePayload): Promise<any> {
    try {
      console.log('📍 Assigning order to store:', { orderId, ...payload });
      
      const response = await axiosInstance.post(
        `/order-management/orders/${orderId}/assign-store`,
        payload
      );

      console.log('✅ Order assigned successfully:', response.data.data);

      return response.data.data.order;
    } catch (error: any) {
      console.error('❌ Failed to assign order:', error);
      
      // Handle specific error cases
      if (error.response?.status === 400) {
        throw new Error(error.response.data.message || 'Order cannot be assigned');
      }
      
      if (error.response?.data?.data) {
        // Insufficient inventory error
        const { product, required, available } = error.response.data.data;
        throw new Error(
          `Insufficient inventory for ${product}: Required ${required}, Available ${available}`
        );
      }
      
      throw new Error(error.response?.data?.message || 'Failed to assign order to store');
    }
  }
}

export default new OrderManagementService();