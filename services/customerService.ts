import axiosInstance from '@/lib/axios';

export interface Customer {
  id: number;
  customer_code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customer_type: 'retail' | 'wholesale' | 'vip';
  status: 'active' | 'inactive' | 'blocked';
  credit_limit?: string;
  outstanding_balance?: string;
  total_orders?: number;
  total_spent?: string;
  average_order_value?: string;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  assigned_employee_id?: number;
  assigned_employee?: {
    id: number;
    name: string;
  };
}

export interface CustomerOrder {
  id: number;
  order_number: string;
  order_date: string;
  order_type: string;
  order_type_label: string;
  total_amount: string;
  paid_amount: string;
  outstanding_amount: string;
  payment_status: string;
  status: string;
  store: {
    id: number;
    name: string;
  };
  items: Array<{
    id: number;
    product_name: string;
    product_sku: string;
    quantity: number;
    unit_price: string;
    discount_amount: string;
    total_amount: string;
  }>;
  shipping_address?: string;
  notes?: string;
}

export interface CustomerAnalytics {
  customer_id: number;
  total_orders: number;
  total_revenue: string;
  total_paid: string;
  total_outstanding: string;
  average_order_value: string;
  first_order_date: string;
  last_order_date: string;
  days_since_last_order: number;
  customer_lifetime_value: string;
  order_frequency: number;
  favorite_products: Array<{
    product_id: number;
    product_name: string;
    product_sku: string;
    times_ordered: number;
    total_quantity: number;
    total_spent: string;
  }>;
  order_trends: {
    by_month: Array<{
      month: string;
      orders: number;
      revenue: string;
    }>;
    by_type: {
      counter: number;
      social_commerce: number;
      ecommerce: number;
    };
  };
  payment_behavior: {
    on_time_payments: number;
    late_payments: number;
    average_days_to_pay: number;
  };
}

export interface CustomerSearchParams {
  search?: string;
  phone?: string;
  email?: string;
  customer_code?: string;
  customer_type?: string;
  status?: string;
  assigned_employee_id?: number;
  created_from?: string;
  created_to?: string;
  has_outstanding?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}

export interface CustomerStatistics {
  total_customers: number;
  active_customers: number;
  inactive_customers: number;
  blocked_customers: number;
  by_type: {
    retail: number;
    wholesale: number;
    vip: number;
  };
  total_outstanding: string;
  customers_with_outstanding: number;
  new_customers_this_month: number;
  new_customers_this_year: number;
}

export interface CreateCustomerPayload {
  name: string;
  phone: string;
  email?: string;
  address?: string;
  customer_type?: 'retail' | 'wholesale' | 'vip';
  credit_limit?: number;
  notes?: string;
  assigned_employee_id?: number;
}

export interface UpdateCustomerPayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type?: 'retail' | 'wholesale' | 'vip';
  credit_limit?: number;
  notes?: string;
  assigned_employee_id?: number;
}

const customerService = {
  /** Search customers by phone, email, name, or customer code */
  async search(params: CustomerSearchParams): Promise<{
    data: Customer[];
    total: number;
    current_page: number;
    last_page: number;
  }> {
    try {
      // If phone is provided, format it
      if (params.phone) {
        params.phone = params.phone.replace(/\D/g, ''); // Remove non-digits
      }

      console.log('Customer search params:', params);

      const response = await axiosInstance.get('/customers/search', { params });
      const result = response.data;

      console.log('Customer search response:', result);

      if (result.success) {
        // Handle both nested and flat data structures
        const data = result.data?.data || result.data || [];
        const total = result.data?.total || result.total || 0;
        const current_page = result.data?.current_page || result.current_page || 1;
        const last_page = result.data?.last_page || result.last_page || 1;

        return {
          data: Array.isArray(data) ? data : [],
          total,
          current_page,
          last_page,
        };
      }

      return { data: [], total: 0, current_page: 1, last_page: 1 };
    } catch (error: any) {
      console.error('Search customers error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to search customers');
    }
  },

  /** Get customer by phone number (exact match) */
  async getByPhone(phone: string): Promise<Customer | null> {
    try {
      const formattedPhone = phone.replace(/\D/g, ''); // Remove non-digits
      const response = await axiosInstance.get('/customers/search', {
        params: { phone: formattedPhone, per_page: 1 }
      });
      const result = response.data;

      if (result.success && result.data && result.data.length > 0) {
        return result.data[0];
      }

      return null;
    } catch (error: any) {
      console.error('Get customer by phone error:', error);
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.message || 'Failed to fetch customer');
    }
  },

  /** Get all customers with filters */
  async getAll(params?: CustomerSearchParams): Promise<{
    data: Customer[];
    total: number;
    current_page: number;
    last_page: number;
  }> {
    try {
      const response = await axiosInstance.get('/customers', { params });
      const result = response.data;

      if (result.success) {
        return {
          data: result.data.data || [],
          total: result.data.total || 0,
          current_page: result.data.current_page || 1,
          last_page: result.data.last_page || 1,
        };
      }

      return { data: [], total: 0, current_page: 1, last_page: 1 };
    } catch (error: any) {
      console.error('Get customers error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch customers');
    }
  },

  /** Get single customer by ID */
  async getById(id: number): Promise<Customer> {
    try {
      const response = await axiosInstance.get(`/customers/${id}`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch customer');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Get customer error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch customer');
    }
  },

  /** Create new customer */
  async create(payload: CreateCustomerPayload): Promise<Customer> {
    try {
      const response = await axiosInstance.post('/customers', payload);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create customer');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Create customer error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create customer');
    }
  },

  /** Update customer */
  async update(id: number, payload: UpdateCustomerPayload): Promise<Customer> {
    try {
      const response = await axiosInstance.put(`/customers/${id}`, payload);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update customer');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Update customer error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update customer');
    }
  },

  /** Delete customer */
  async delete(id: number): Promise<void> {
    try {
      const response = await axiosInstance.delete(`/customers/${id}`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete customer');
      }
    } catch (error: any) {
      console.error('Delete customer error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete customer');
    }
  },

  /** Activate customer */
  async activate(id: number): Promise<Customer> {
    try {
      const response = await axiosInstance.patch(`/customers/${id}/activate`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to activate customer');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Activate customer error:', error);
      throw new Error(error.response?.data?.message || 'Failed to activate customer');
    }
  },

  /** Deactivate customer */
  async deactivate(id: number): Promise<Customer> {
    try {
      const response = await axiosInstance.patch(`/customers/${id}/deactivate`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to deactivate customer');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Deactivate customer error:', error);
      throw new Error(error.response?.data?.message || 'Failed to deactivate customer');
    }
  },

  /** Block customer */
  async block(id: number): Promise<Customer> {
    try {
      const response = await axiosInstance.patch(`/customers/${id}/block`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to block customer');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Block customer error:', error);
      throw new Error(error.response?.data?.message || 'Failed to block customer');
    }
  },

  /** Get customer order history */
  async getOrderHistory(customerId: number, params?: {
    order_type?: string;
    payment_status?: string;
    date_from?: string;
    date_to?: string;
    per_page?: number;
    page?: number;
  }): Promise<{
    data: CustomerOrder[];
    total: number;
    current_page: number;
    last_page: number;
  }> {
    try {
      console.log('Fetching orders for customer:', customerId, 'with params:', params);

      const response = await axiosInstance.get(`/customers/${customerId}/orders`, { params });
      const result = response.data;

      console.log('Order history response:', result);

      if (result.success) {
        // Handle both nested and flat data structures
        const data = result.data?.data || result.data || [];
        const total = result.data?.total || result.total || 0;
        const current_page = result.data?.current_page || result.current_page || 1;
        const last_page = result.data?.last_page || result.last_page || 1;

        return {
          data: Array.isArray(data) ? data : [],
          total,
          current_page,
          last_page,
        };
      }

      return { data: [], total: 0, current_page: 1, last_page: 1 };
    } catch (error: any) {
      console.error('Get customer orders error:', error);
      console.error('Error response:', error.response?.data);
      throw new Error(error.response?.data?.message || 'Failed to fetch customer orders');
    }
  },

  /** Get customer analytics */
  async getAnalytics(customerId: number, params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<CustomerAnalytics> {
    try {
      const response = await axiosInstance.get(`/customers/${customerId}/analytics`, { params });
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch analytics');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Get customer analytics error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch customer analytics');
    }
  },

  /** Get customer statistics */
  async getStatistics(params?: {
    date_from?: string;
    date_to?: string;
  }): Promise<CustomerStatistics> {
    try {
      const response = await axiosInstance.get('/customers/statistics', { params });
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch statistics');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Get customer statistics error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch customer statistics');
    }
  },

  /** Add note to customer */
  async addNote(customerId: number, note: string): Promise<void> {
    try {
      const response = await axiosInstance.post(`/customers/${customerId}/notes`, { note });
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to add note');
      }
    } catch (error: any) {
      console.error('Add customer note error:', error);
      throw new Error(error.response?.data?.message || 'Failed to add note');
    }
  },

  /** Assign employee to customer */
  async assignEmployee(customerId: number, employeeId: number): Promise<Customer> {
    try {
      const response = await axiosInstance.post(`/customers/${customerId}/assign-employee`, {
        employee_id: employeeId
      });
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to assign employee');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Assign employee error:', error);
      throw new Error(error.response?.data?.message || 'Failed to assign employee');
    }
  },

  /** Get customer segments */
  async getSegments(): Promise<Array<{
    segment: string;
    count: number;
    total_revenue: string;
    description: string;
  }>> {
    try {
      const response = await axiosInstance.get('/customers/segments');
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch segments');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Get customer segments error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch customer segments');
    }
  },

  /** Bulk update customer status */
  async bulkUpdateStatus(customerIds: number[], status: 'active' | 'inactive' | 'blocked'): Promise<{
    success_count: number;
    failed_count: number;
    errors: Array<{ id: number; message: string }>;
  }> {
    try {
      const response = await axiosInstance.patch('/customers/bulk/status', {
        customer_ids: customerIds,
        status
      });
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update customers');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Bulk update customer status error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update customers');
    }
  }
};

export default customerService;