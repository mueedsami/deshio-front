import axiosInstance from '@/lib/axios';

export type StoresSummaryPeriod = 'today' | 'week' | 'month' | 'year';

export interface StoresSummaryQuery {
  period?: StoresSummaryPeriod;
  date_from?: string;
  date_to?: string;
}

export interface StoresSummaryResponse {
  success: boolean;
  data: {
    period: {
      type: StoresSummaryPeriod | 'custom';
      start_date: string;
      end_date: string;
    };
    overall_totals: {
      total_sales: number;
      total_orders: number;
      total_inventory_value: number;
      total_profit: number;
      total_returns: number;
    };
    stores: Array<{
      store: {
        id: number;
        name: string;
        store_code: string;
        store_type: string;
        address?: string | null;
      };
      sales: {
        total_sales: number;
        total_orders: number;
        avg_order_value: string;
        paid_amount: number;
        outstanding_amount: number;
        orders_by_status: Record<string, number>;
        orders_by_payment_status: Record<string, number>;
        orders_by_type: Record<string, number>;
      };
      performance: {
        gross_profit: number;
        gross_margin_percentage: string;
        expenses: number;
        net_profit: number;
        net_margin_percentage: string;
        cogs: number;
      };
      inventory: {
        total_value: number;
        total_products: number;
        low_stock_count: number;
        out_of_stock_count: number;
      };
      top_products: Array<{
        product_id: number;
        product_name: string;
        sku: string;
        quantity_sold: number;
        revenue: number;
      }>;
      returns: {
        total_returns: number;
        return_rate: string;
      };
      customers: {
        unique_customers: number;
        repeat_customers: number;
      };
    }>;
    store_count: number;
  };
}

const dashboardService = {
  async getStoresSummary(params: StoresSummaryQuery = {}) {
    const response = await axiosInstance.get('/dashboard/stores-summary', { params });
    return response.data as StoresSummaryResponse;
  },
};

export default dashboardService;
