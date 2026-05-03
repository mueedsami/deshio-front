import axiosInstance from '@/lib/axios';

export interface DailyBranchRow {
  date: string;
  branch: string;
  pos_sales: number;
  online_sales: number;
  social_commerce_sales: number;
  total_sales: number;
  cash_in: number;
  card_in: number;
  mfs_in: number;
  bank_in: number;
  total_money_in: number;
  daily_expenses: number;
  net_cash_position: number;
}

export interface DailyBranchReportResponse {
  success: boolean;
  data: DailyBranchRow[];
  meta: {
    date_from: string;
    date_to: string;
    store_id: number | null;
    generated_at: string;
  };
}

export interface DailyReportParams {
  date?: string;
  from?: string;
  to?: string;
  store_id?: number | null;
}

const dailyBranchReportService = {
  async getReport(params: DailyReportParams): Promise<DailyBranchReportResponse> {
    const query: Record<string, string> = {};
    if (params.date)     query.date     = params.date;
    if (params.from)     query.from     = params.from;
    if (params.to)       query.to       = params.to;
    if (params.store_id) query.store_id = String(params.store_id);

    const response = await axiosInstance.get('/reports/daily-branch-json', { params: query });
    return response.data;
  },

  async downloadCsv(params: DailyReportParams & { combined?: boolean }): Promise<void> {
    const query: Record<string, string> = {};
    if (params.date)     query.date     = params.date;
    if (params.from)     query.from     = params.from;
    if (params.to)       query.to       = params.to;
    if (params.store_id) query.store_id = String(params.store_id);
    if (params.combined) query.combined = '1';

    // Fetch through axios so the Authorization header is attached automatically
    const response = await axiosInstance.get('/reports/daily-branch', {
      params: query,
      responseType: 'blob',
    });

    // Derive filename from Content-Disposition header, or fall back to a sensible default
    const disposition = response.headers['content-disposition'] ?? '';
    const match = disposition.match(/filename="?([^";\n]+)"?/);
    const filename = match?.[1] ?? `daily_branch_report_${params.from ?? params.date ?? 'export'}.csv`;

    // Create a temporary object URL and trigger the browser download
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const a   = document.createElement('a');
    a.href    = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(url);
  },
};

export default dailyBranchReportService;
