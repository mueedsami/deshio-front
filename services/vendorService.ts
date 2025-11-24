// services/vendorService.ts
import axiosInstance from '@/lib/axios';

export interface Vendor {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contact_person?: string;
  website?: string;
  type: 'manufacturer' | 'distributor';
  credit_limit?: number;
  payment_terms?: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface VendorWithStats extends Vendor {
  total_outstanding: number;
  total_paid: number;
  total_purchases: number;
}

export interface VendorAnalytics {
  vendor_info: {
    id: number;
    name: string;
    type: string;
    credit_limit: number;
    payment_terms: string;
    is_active: boolean;
  };
  purchase_orders: {
    total_orders: number;
    total_value: number;
    by_status: Record<string, { count: number; total_value: number }>;
    average_order_value: number;
    largest_order: number;
    smallest_order: number;
  };
  payments: {
    total_paid: number;
    total_transactions: number;
    by_payment_type: Record<string, { count: number; total_amount: number }>;
    average_payment: number;
    largest_payment: number;
  };
  outstanding: {
    total_outstanding: number;
    total_paid: number;
    payment_completion_rate: number;
    credit_utilization: number;
    exceeded_credit_limit: boolean;
  };
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export const vendorService = {
  /**
   * Get all vendors with optional filters
   */
  async getAll(params?: {
    type?: string;
    is_active?: boolean;
    search?: string;
    sort_by?: string;
    sort_direction?: 'asc' | 'desc';
    per_page?: number;
  }): Promise<Vendor[]> {
    try {
      const response = await axiosInstance.get<ApiResponse<PaginatedResponse<Vendor>>>('/vendors', {
        params
      });
      
      const result = response.data;
      
      // Handle paginated response
      if (result.success && result.data && Array.isArray(result.data.data)) {
        return result.data.data;
      }
      
      // Fallback for non-paginated response
      if (result.success && Array.isArray(result.data)) {
        return result.data;
      }
      
      console.warn('Unexpected vendors response format:', result);
      return [];
    } catch (error: any) {
      console.error('Get vendors error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch vendors');
    }
  },

  /**
   * Get single vendor by ID
   */
  async getById(id: number): Promise<Vendor> {
    try {
      const response = await axiosInstance.get<ApiResponse<Vendor>>(`/vendors/${id}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Get vendor error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch vendor');
    }
  },

  /**
   * Create a new vendor
   */
  async create(data: Omit<Vendor, 'id' | 'created_at' | 'updated_at' | 'is_active'>): Promise<Vendor> {
    try {
      const response = await axiosInstance.post<ApiResponse<Vendor>>('/vendors', data);
      return response.data.data;
    } catch (error: any) {
      console.error('Create vendor error:', error);
      const message = error.response?.data?.message || 'Failed to create vendor';
      const errors = error.response?.data?.errors;
      if (errors) {
        const errorMessages = Object.values(errors).flat().join(', ');
        throw new Error(errorMessages);
      }
      throw new Error(message);
    }
  },

  /**
   * Update existing vendor
   */
  async update(id: number, data: Partial<Omit<Vendor, 'id' | 'created_at' | 'updated_at'>>): Promise<Vendor> {
    try {
      const response = await axiosInstance.put<ApiResponse<Vendor>>(`/vendors/${id}`, data);
      return response.data.data;
    } catch (error: any) {
      console.error('Update vendor error:', error);
      const message = error.response?.data?.message || 'Failed to update vendor';
      const errors = error.response?.data?.errors;
      if (errors) {
        const errorMessages = Object.values(errors).flat().join(', ');
        throw new Error(errorMessages);
      }
      throw new Error(message);
    }
  },

  /**
   * Delete (soft delete) vendor
   */
  async delete(id: number): Promise<void> {
    try {
      await axiosInstance.delete<ApiResponse<null>>(`/vendors/${id}`);
    } catch (error: any) {
      console.error('Delete vendor error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete vendor');
    }
  },

  /**
   * Activate vendor
   */
  async activate(id: number): Promise<Vendor> {
    try {
      const response = await axiosInstance.patch<ApiResponse<Vendor>>(`/vendors/${id}/activate`);
      return response.data.data;
    } catch (error: any) {
      console.error('Activate vendor error:', error);
      throw new Error(error.response?.data?.message || 'Failed to activate vendor');
    }
  },

  /**
   * Deactivate vendor
   */
  async deactivate(id: number): Promise<Vendor> {
    try {
      const response = await axiosInstance.patch<ApiResponse<Vendor>>(`/vendors/${id}/deactivate`);
      return response.data.data;
    } catch (error: any) {
      console.error('Deactivate vendor error:', error);
      throw new Error(error.response?.data?.message || 'Failed to deactivate vendor');
    }
  },

  /**
   * Get vendors by type (manufacturer or distributor)
   */
  async getByType(type: 'manufacturer' | 'distributor'): Promise<Vendor[]> {
    try {
      const response = await axiosInstance.get<ApiResponse<Vendor[]>>(`/vendors/by-type/${type}`);
      return response.data.data;
    } catch (error: any) {
      console.error('Get vendors by type error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch vendors by type');
    }
  },

  /**
   * Get vendor statistics
   */
  async getStats(): Promise<any> {
    try {
      const response = await axiosInstance.get<ApiResponse<any>>('/vendors/stats');
      return response.data.data;
    } catch (error: any) {
      console.error('Get vendor stats error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch vendor stats');
    }
  },

  /**
   * Get comprehensive vendor analytics
   */
  async getAnalytics(id: number, params?: {
    from_date?: string;
    to_date?: string;
  }): Promise<VendorAnalytics> {
    try {
      const response = await axiosInstance.get<ApiResponse<VendorAnalytics>>(
        `/vendors/${id}/analytics`,
        { params }
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Get vendor analytics error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch vendor analytics');
    }
  },

  /**
   * Get all vendors analytics (comparison)
   */
  async getAllAnalytics(params?: {
    is_active?: boolean;
  }): Promise<any> {
    try {
      const response = await axiosInstance.get<ApiResponse<any>>('/vendors/all-analytics', {
        params
      });
      return response.data.data;
    } catch (error: any) {
      console.error('Get all vendors analytics error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch vendors analytics');
    }
  },

  /**
   * Get vendor purchase history
   */
  async getPurchaseHistory(id: number, params?: {
    from_date?: string;
    to_date?: string;
    status?: string;
    per_page?: number;
  }): Promise<PaginatedResponse<any>> {
    try {
      const response = await axiosInstance.get<ApiResponse<PaginatedResponse<any>>>(
        `/vendors/${id}/purchase-history`,
        { params }
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Get vendor purchase history error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch purchase history');
    }
  },

  /**
   * Get vendor payment history
   */
  async getPaymentHistory(id: number, params?: {
    from_date?: string;
    to_date?: string;
    status?: string;
    per_page?: number;
  }): Promise<PaginatedResponse<any>> {
    try {
      const response = await axiosInstance.get<ApiResponse<PaginatedResponse<any>>>(
        `/vendors/${id}/payment-history`,
        { params }
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Get vendor payment history error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch payment history');
    }
  },

  /**
   * Bulk update vendor status
   */
  async bulkUpdateStatus(vendorIds: number[], isActive: boolean): Promise<{ count: number }> {
    try {
      const response = await axiosInstance.post<ApiResponse<{ count: number }>>(
        '/vendors/bulk-update-status',
        {
          vendor_ids: vendorIds,
          is_active: isActive
        }
      );
      return response.data.data;
    } catch (error: any) {
      console.error('Bulk update vendor status error:', error);
      throw new Error(error.response?.data?.message || 'Failed to bulk update vendors');
    }
  },
};