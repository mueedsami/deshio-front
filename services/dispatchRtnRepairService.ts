import axiosInstance from '@/lib/axios';

export interface DispatchRtnRepairFilters {
  days?: number | string;
  product_id?: number | string;
  batch?: string;
}

export interface DispatchRtnRepairRunPayload {
  apply?: boolean;
  product_id?: number | string;
  batch?: string;
  confirm?: string;
}

export interface DispatchRtnRepairSummaryCounts {
  rtn_restore_batch_count: number;
  affected_product_count: number;
  rtn_restore_physical_quantity: number;
  barcodes_still_inside_rtn_batches: number;
  batch_quantity_mismatch_count_shown: number;
  batch_barcode_pointer_mismatch_count_shown?: number;
  fully_received_in_transit_dispatches_shown: number;
  product_detail_count?: number;
  individual_fix_available_count?: number;
}

export interface DispatchRtnBatchRow {
  batch_id: number;
  product_id: number;
  batch_number: string;
  store_id: number;
  quantity: number;
  barcode_count: number;
  is_active: boolean;
  availability: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DispatchRtnBarcodeRow {
  barcode_id: number;
  barcode: string;
  product_id: number;
  batch_id: number;
  batch_number: string;
  batch_store_id?: number | null;
  barcode_store_id?: number | null;
  status?: string | null;
  is_active?: boolean;
  updated_at?: string | null;
}

export interface DispatchRtnMismatchRow {
  batch_id: number;
  product_id: number;
  batch_number: string;
  store_id: number;
  old_quantity: number;
  barcode_quantity: number;
  old_active: boolean;
  new_active: boolean;
  old_barcode_id?: number | null;
  new_barcode_id?: number | null;
  barcode_pointer_mismatch?: boolean;
  type: 'RTN' | 'normal' | string;
}

export interface FullyReceivedDispatchRow {
  dispatch_id: number;
  dispatch_number: string;
  source_store_id: number;
  destination_store_id: number;
  items: number;
  scanned: number;
  received: number;
  status: string;
  updated_at?: string | null;
}


export interface DispatchRtnProductIssueRow {
  type: string;
  severity: 'low' | 'medium' | 'high' | string;
  batch_id?: number | null;
  barcode_id?: number | null;
  message: string;
}

export interface DispatchRtnProductBatchDetail {
  batch_id: number;
  batch_number: string;
  store_id: number;
  store_name?: string | null;
  quantity: number;
  availability: boolean;
  is_active: boolean;
  barcode_id?: number | null;
  cost_price?: number;
  sell_price?: number;
  type: 'RTN' | 'dispatch-chain' | 'normal' | string;
  linked_barcode_count: number;
  sellable_barcode_count_here: number;
  computed_quantity: number;
  computed_availability: boolean;
  computed_is_active: boolean;
  computed_barcode_id?: number | null;
  quantity_mismatch: boolean;
  availability_mismatch: boolean;
  active_mismatch: boolean;
  barcode_pointer_mismatch: boolean;
  stale_pointer_reason?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DispatchRtnProductBarcodeDetail {
  barcode_id: number;
  barcode: string;
  batch_id?: number | null;
  batch_number?: string | null;
  batch_store_id?: number | null;
  current_store_id?: number | null;
  current_store_name?: string | null;
  current_status?: string | null;
  is_active: boolean;
  is_defective: boolean;
  is_replacement: boolean;
  sellable: boolean;
  inside_rtn_batch: boolean;
  store_batch_mismatch: boolean;
  suggested_target_batch_id?: number | null;
  suggested_target_batch_number?: string | null;
  updated_at?: string | null;
}

export interface DispatchRtnProductDetail {
  product_id: number;
  sku?: string | null;
  name?: string | null;
  brand?: string | null;
  is_archived?: boolean;
  batch_count: number;
  barcode_count: number;
  issue_count: number;
  can_fix_individually: boolean;
  recommended_action?: string;
  issues: DispatchRtnProductIssueRow[];
  batches: DispatchRtnProductBatchDetail[];
  barcodes: DispatchRtnProductBarcodeDetail[];
}

export interface DispatchRtnRepairSummaryResponse {
  success: boolean;
  message: string;
  filters: {
    days?: number;
    since?: string | null;
    product_id?: number | null;
    batch?: string | null;
  };
  summary: DispatchRtnRepairSummaryCounts;
  rtn_batches: DispatchRtnBatchRow[];
  barcodes_still_inside_rtn_batches: DispatchRtnBarcodeRow[];
  batch_quantity_mismatches: DispatchRtnMismatchRow[];
  fully_received_in_transit_dispatches: FullyReceivedDispatchRow[];
  product_details?: DispatchRtnProductDetail[];
}

export interface DispatchRtnRepairRunResponse {
  success: boolean;
  message: string;
  applied: boolean;
  exit_code?: number;
  command?: string;
  executed_at?: string;
  output?: string;
}

const cleanParams = (filters: DispatchRtnRepairFilters) => {
  const params: Record<string, any> = {};
  if (filters.days !== undefined && filters.days !== '') params.days = filters.days;
  if (filters.product_id !== undefined && filters.product_id !== '') params.product_id = filters.product_id;
  if (filters.batch && filters.batch.trim()) params.batch = filters.batch.trim();
  return params;
};

class DispatchRtnRepairService {
  private basePath = '/dispatch-rtn-repair';

  async getSummary(filters: DispatchRtnRepairFilters = {}): Promise<DispatchRtnRepairSummaryResponse> {
    const response = await axiosInstance.get(`${this.basePath}/summary`, {
      params: cleanParams(filters),
    });
    return response.data;
  }

  async runRepair(payload: DispatchRtnRepairRunPayload): Promise<DispatchRtnRepairRunResponse> {
    const body: DispatchRtnRepairRunPayload = {
      apply: Boolean(payload.apply),
    };

    if (payload.product_id !== undefined && payload.product_id !== '') body.product_id = payload.product_id;
    if (payload.batch && payload.batch.trim()) body.batch = payload.batch.trim();
    if (payload.confirm && payload.confirm.trim()) body.confirm = payload.confirm.trim();

    const response = await axiosInstance.post(`${this.basePath}/run`, body);
    return response.data;
  }
}

export const dispatchRtnRepairService = new DispatchRtnRepairService();
export default dispatchRtnRepairService;
