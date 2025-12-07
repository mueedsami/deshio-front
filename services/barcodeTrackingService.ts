import axiosInstance from '@/lib/axios';

export interface BarcodeLocation {
  id: number;
  barcode: string;
  product: {
    id: number;
    name: string;
    sku: string | null;
  };
  current_store: {
    id: number;
    name: string;
    type: string;
  } | null;
  batch: {
    id: number;
    batch_number: string;
  } | null;
  current_status: string;
  status_label: string;
  is_active: boolean;
  is_defective: boolean;
  is_available_for_sale: boolean;
  location_updated_at: string;
  location_metadata?: any;
  created_at: string;
}

export interface BatchBarcodesResponse {
  success: boolean;
  data: {
    batch: {
      id: number;
      batch_number: string;
      product: {
        id: number;
        name: string;
        sku: string | null;
      };
      original_quantity: number;
    };
    summary: {
      total_units: number;
      active: number;
      available_for_sale: number;
      sold: number;
      defective: number;
    };
    status_breakdown: Array<{
      status: string;
      count: number;
    }>;
    store_distribution: Array<{
      store_id: number | null;
      store_name: string;
      count: number;
    }>;
    filters: {
      status?: string;
      store_id?: number;
      available_only?: boolean;
    };
    barcodes: BarcodeLocation[];
  };
}

export interface ProductBarcodesResponse {
  success: boolean;
  data: {
    product: {
      id: number;
      name: string;
      sku: string | null;
    };
    summary: {
      total_units: number;
      active: number;
      inactive: number;
      available_for_sale: number;
      sold: number;
    };
    status_breakdown: Record<string, number>;
    store_distribution: Array<{
      store_id: number;
      store_name: string;
      count: number;
      available: number;
    }>;
    filters: {
      status?: string;
      store_id?: number;
      available_only?: boolean;
    };
    barcodes: BarcodeLocation[];
    pagination: {
      current_page: number;
      per_page: number;
      total: number;
      last_page: number;
    };
  };
}

export interface BarcodeHistoryResponse {
  success: boolean;
  data: {
    barcode: string;
    product: {
      id: number;
      name: string;
      sku: string | null;
    };
    current_location: any;
    total_movements: number;
    history: any[];
  };
}

class BarcodeTrackingService {
  /**
   * Get all barcodes for a specific batch
   * This is the primary method for fetching batch barcodes
   * Route: GET /barcode-tracking/by-batch/{batchId}
   */
  async getBatchBarcodes(batchId: number): Promise<BatchBarcodesResponse> {
    try {
      const response = await axiosInstance.get<BatchBarcodesResponse>(
        `/barcode-tracking/by-batch/${batchId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching batch barcodes:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch batch barcodes'
      );
    }
  }

  /**
   * Get all barcodes for a specific product
   * Useful for cross-batch barcode viewing
   * Route: GET /barcode-tracking/by-product/{productId}
   */
  async getProductBarcodes(productId: number): Promise<ProductBarcodesResponse> {
    try {
      const response = await axiosInstance.get<ProductBarcodesResponse>(
        `/barcode-tracking/by-product/${productId}`
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching product barcodes:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch product barcodes'
      );
    }
  }

  /**
   * Get location and movement history for a specific barcode
   * Route: GET /barcode-tracking/{barcode}/history
   */
  async getBarcodeHistory(barcode: string): Promise<BarcodeHistoryResponse> {
    try {
      const response = await axiosInstance.get<BarcodeHistoryResponse>(
        `/barcode-tracking/${barcode}/history`
      );

      return response.data;
    } catch (error: any) {
      console.error('Error fetching barcode history:', error);
      throw new Error(
        error.response?.data?.message || 'Failed to fetch barcode history'
      );
    }
  }

  /**
   * Helper method to extract just the barcode strings from batch response
   * Useful for printing components
   */
  async getBatchBarcodeStrings(batchId: number): Promise<string[]> {
    try {
      const response = await this.getBatchBarcodes(batchId);
      return response.data.barcodes.map((b) => b.barcode);
    } catch (error) {
      console.error('Error fetching batch barcode strings:', error);
      return [];
    }
  }

  /**
   * Helper method to get active barcodes only for a batch
   */
  async getActiveBatchBarcodes(batchId: number): Promise<BarcodeLocation[]> {
    try {
      const response = await this.getBatchBarcodes(batchId);
      return response.data.barcodes.filter((b) => b.is_active);
    } catch (error) {
      console.error('Error fetching active batch barcodes:', error);
      return [];
    }
  }

  /**
   * Helper method to get available-for-sale barcodes for a batch
   */
  async getAvailableBatchBarcodes(batchId: number): Promise<BarcodeLocation[]> {
    try {
      const response = await this.getBatchBarcodes(batchId);
      return response.data.barcodes.filter((b) => b.is_available_for_sale);
    } catch (error) {
      console.error('Error fetching available batch barcodes:', error);
      return [];
    }
  }

  /**
   * Get barcode summary for a batch without full details
   */
  async getBatchBarcodeSummary(batchId: number) {
    try {
      const response = await this.getBatchBarcodes(batchId);
      return response.data.summary;
    } catch (error) {
      console.error('Error fetching batch barcode summary:', error);
      return null;
    }
  }
}

// Export singleton instance
export const barcodeTrackingService = new BarcodeTrackingService();
export default barcodeTrackingService;