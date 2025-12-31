import axiosInstance from '@/lib/axios';

export type CustomerProfile = {
  id: number;
  name: string;
  email: string;
  phone: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;

  total_orders?: number;
  total_purchases?: number;
  first_purchase_at?: string;
  last_purchase_at?: string;
};

type ApiResponse<T> = { success: boolean; message?: string; data: T; errors?: any };

const customerProfileService = {
  async getProfile(): Promise<CustomerProfile> {
    const res = await axiosInstance.get<ApiResponse<{ customer: CustomerProfile }>>('/profile');
    if (!res.data.success) throw new Error(res.data.message || 'Failed to load profile');
    return res.data.data.customer;
  },

  async updateProfile(payload: Partial<CustomerProfile>): Promise<CustomerProfile> {
    const res = await axiosInstance.put<ApiResponse<{ customer: CustomerProfile }>>('/profile/update', payload);
    if (!res.data.success) throw new Error(res.data.message || 'Failed to update profile');
    return res.data.data.customer;
  },

  async getStats(): Promise<any> {
    const res = await axiosInstance.get<ApiResponse<any>>('/profile/stats');
    if (!res.data.success) throw new Error(res.data.message || 'Failed to load stats');
    return res.data.data;
  },
};

export default customerProfileService;
