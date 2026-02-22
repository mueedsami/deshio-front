import axiosInstance from '@/lib/axios';

export interface Campaign {
  id: number;
  name: string;
  description?: string;
  code: string;
  type: 'percentage' | 'fixed';
  discount_value: number;
  maximum_discount?: number;
  start_date: string;
  end_date: string | null;
  applicable_products: number[] | null;
  applicable_categories: number[] | null;
  is_active: boolean;
  is_automatic: boolean;
  is_public: boolean;
  created_by?: number;
  created_at?: string;
}

export interface CampaignFormData {
  name: string;
  description?: string;
  type: 'percentage' | 'fixed';
  discount_value: number;
  maximum_discount?: number;
  applicable_products?: number[];
  applicable_categories?: number[];
  start_date: string;
  end_date?: string;
  is_active: boolean;
  is_automatic: boolean;
  is_public: boolean;
}

export interface ActiveCampaign {
  id: number;
  name: string;
  description?: string;
  code: string;
  type: 'percentage' | 'fixed';
  discount_value: number;
  start_date: string;
  end_date: string | null;
  applicable_products: number[];
  applicable_categories: number[];
}

export interface DiscountCalculationItem {
  product_id: number;
  quantity: number;
  unit_price: number;
}

export interface DiscountResult {
  product_id: number;
  quantity: number;
  unit_price: number;
  original_price: number;
  discounted_price: number;
  discount_amount_per_unit: number;
  discount_amount_total: number;
  discount_percentage: number;
  active_campaign: ActiveCampaign | null;
}

export interface DiscountCalculationResponse {
  total_discount: number;
  items: DiscountResult[];
  campaigns_applied: ActiveCampaign[];
}

const campaignService = {
  // CRUD
  async getCampaigns(params?: {
    is_automatic?: boolean;
    is_active?: boolean;
    valid_only?: boolean;
  }) {
    const response = await axiosInstance.get('/promotions', { params });
    return response.data;
  },

  async getCampaign(id: number) {
    const response = await axiosInstance.get(`/promotions/${id}`);
    return response.data;
  },

  async createCampaign(data: CampaignFormData) {
    const response = await axiosInstance.post('/promotions', data);
    return response.data;
  },

  async updateCampaign(id: number, data: Partial<CampaignFormData>) {
    const response = await axiosInstance.put(`/promotions/${id}`, data);
    return response.data;
  },

  async deleteCampaign(id: number) {
    const response = await axiosInstance.delete(`/promotions/${id}`);
    return response.data;
  },

  async toggleCampaign(id: number, isActive: boolean) {
    const response = await axiosInstance.patch(`/promotions/${id}`, {
      is_active: isActive,
    });
    return response.data;
  },

  // Public endpoints
  async getActiveCampaigns(params?: {
    product_ids?: number[];
    category_ids?: number[];
  }) {
    const response = await axiosInstance.get('/campaigns/active', { params });
    return response.data;
  },

  async calculateDiscount(items: DiscountCalculationItem[]): Promise<DiscountCalculationResponse> {
    const response = await axiosInstance.post('/campaigns/calculate-discount', { items });
    return response.data.data;
  },

  async getProductDiscounts(productIds: number[]) {
    const response = await axiosInstance.get('/campaigns/product-discounts', {
      params: { product_ids: productIds },
    });
    return response.data;
  },
};

export default campaignService;
