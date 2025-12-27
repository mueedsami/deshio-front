import axiosInstance from '@/lib/axios';

export interface RebalancingRequest {
  id: number;
  product_id: number;
  source_batch_id: number;
  source_store_id: number;
  destination_store_id: number;
  quantity: number;
  reason?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'completed';
  requested_by: number;
  approved_by?: number;
  approved_at?: string;
  completed_at?: string;
  dispatch_id?: number;
  created_at: string;
  updated_at: string;
  product?: any;
  sourceBatch?: any;
  sourceStore?: any;
  destinationStore?: any;
  requestedBy?: any;
  approvedBy?: any;
  dispatch?: any;
}

export interface RebalancingSuggestion {
  product_id: number;
  product_name: string;
  sku: string;
  from_store_id: number;
  from_store_name: string;
  from_store_quantity: number;
  to_store_id: number;
  to_store_name: string;
  to_store_quantity: number;
  to_store_reorder_level: number;
  suggested_quantity: number;
  reason: string;
}

export interface RebalancingStatistics {
  total: number;
  by_status: {
    pending: number;
    approved: number;
    completed: number;
    rejected: number;
    cancelled: number;
  };
  recent_activity: RebalancingRequest[];
}

export interface RebalancingFilters {
  status?: string;
  store_id?: number;
  product_id?: number;
  per_page?: number;
  page?: number;
}

export interface CreateRebalancingData {
  product_id: number;
  source_store_id: number;
  source_batch_id?: number;
  destination_store_id: number;
  quantity: number;
  reason?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface RejectRebalancingData {
  rejection_reason: string;
}

class InventoryRebalancingService {
  private basePath = '/inventory-rebalancing';

  /**
   * Get all rebalancing requests with optional filters
   */
  async getRebalancingRequests(filters?: RebalancingFilters) {
    const response = await axiosInstance.get(this.basePath, {
      params: filters,
    });
    return response.data;
  }

  /**
   * Get statistics for rebalancing operations
   */
  async getStatistics() {
    const response = await axiosInstance.get(`${this.basePath}/statistics`);
    return response.data;
  }

  /**
   * Get rebalancing suggestions based on stock levels
   */
  async getSuggestions() {
    const response = await axiosInstance.get(`${this.basePath}/suggestions`);
    return response.data;
  }

  /**
   * Create a new rebalancing request
   */
  async createRebalancingRequest(data: CreateRebalancingData) {
    const response = await axiosInstance.post(this.basePath, data);
    return response.data;
  }

  /**
   * Approve and execute a rebalancing request
   */
  async approveRebalancing(id: number) {
    const response = await axiosInstance.post(`${this.basePath}/${id}/approve`);
    return response.data;
  }

  /**
   * Reject a rebalancing request
   */
  async rejectRebalancing(id: number, data: RejectRebalancingData) {
    const response = await axiosInstance.post(`${this.basePath}/${id}/reject`, data);
    return response.data;
  }

  /**
   * Cancel a rebalancing request
   */
  async cancelRebalancing(id: number) {
    const response = await axiosInstance.post(`${this.basePath}/${id}/cancel`);
    return response.data;
  }

  /**
   * Mark rebalancing as completed
   */
  async completeRebalancing(id: number) {
    const response = await axiosInstance.post(`${this.basePath}/${id}/complete`);
    return response.data;
  }
}

export const inventoryRebalancingService = new InventoryRebalancingService();
export default inventoryRebalancingService;