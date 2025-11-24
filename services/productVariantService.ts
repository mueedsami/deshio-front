// services/productVariantService.ts
import axiosInstance from '@/lib/axios';

export interface ProductVariant {
  id: number;
  product_id: number;
  sku: string;
  barcode?: string;
  attributes: Record<string, string>; // e.g., { color: "Red", size: "M" }
  price_adjustment?: number;
  cost_price?: number;
  stock_quantity?: number;
  reserved_quantity?: number;
  reorder_point?: number;
  image_url?: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  product?: {
    id: number;
    name: string;
    sku: string;
  };
}

export interface VariantOption {
  id: number;
  name: string; // e.g., "Color", "Size"
  value: string; // e.g., "Red", "M"
  type: 'text' | 'color' | 'image';
  display_value?: string;
  sort_order: number;
  is_active: boolean;
}

export interface VariantStatistics {
  total_variants: number;
  active_variants: number;
  low_stock_variants: number;
  total_stock: number;
  total_reserved: number;
  available_stock: number;
}

export interface CreateVariantData {
  attributes: Record<string, string>;
  sku: string;
  barcode?: string;
  price_adjustment?: number;
  cost_price?: number;
  stock_quantity?: number;
  reorder_point?: number;
  image_url?: string;
  is_default?: boolean;
}

export interface GenerateMatrixData {
  attributes: Record<string, string[]>; // e.g., { Color: ["Red", "Blue"], Size: ["S", "M", "L"] }
  base_price_adjustment?: number;
}

class ProductVariantService {
  private baseUrl = '/products';

  // ===== VARIANT OPTIONS MANAGEMENT =====

  /**
   * Get all variant options (grouped by name)
   */
  async getVariantOptions(params?: {
    name?: string;
    type?: 'text' | 'color' | 'image';
    is_active?: boolean;
  }): Promise<Record<string, VariantOption[]>> {
    try {
      const response = await axiosInstance.get('/variant-options', { params });
      const result = response.data;
      return result.data || {};
    } catch (error: any) {
      console.error('Get variant options error:', error);
      return {};
    }
  }

  /**
   * Create a new variant option
   */
  async createVariantOption(data: {
    name: string;
    value: string;
    type: 'text' | 'color' | 'image';
    display_value?: string;
    sort_order?: number;
  }): Promise<VariantOption> {
    try {
      const response = await axiosInstance.post('/variant-options', data);
      const result = response.data;
      return result.data;
    } catch (error: any) {
      console.error('Create variant option error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create variant option');
    }
  }

  // ===== PRODUCT VARIANTS MANAGEMENT =====

  /**
   * Get all variants for a product
   */
  async getProductVariants(
    productId: number,
    params?: { is_active?: boolean }
  ): Promise<ProductVariant[]> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${productId}/variants`, { params });
      const result = response.data;
      return result.data || [];
    } catch (error: any) {
      // Silently handle 404 - product may not have variants feature enabled
      if (error.response?.status === 404) {
        return [];
      }
      // Only log non-404 errors
      if (error.response?.status !== 404) {
        console.debug('Product variants not available:', error.response?.status || error.message);
      }
      return [];
    }
  }

  /**
   * Get single variant
   */
  async getVariant(productId: number, variantId: number): Promise<ProductVariant> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${productId}/variants/${variantId}`);
      const result = response.data;
      return result.data;
    } catch (error: any) {
      console.error('Get variant error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch variant');
    }
  }

  /**
   * Create a single variant
   */
  async createVariant(productId: number, data: CreateVariantData): Promise<ProductVariant> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/${productId}/variants`, data);
      const result = response.data;
      return result.data;
    } catch (error: any) {
      console.error('Create variant error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create variant');
    }
  }

  /**
   * Update variant
   */
  async updateVariant(
    productId: number,
    variantId: number,
    data: Partial<CreateVariantData>
  ): Promise<ProductVariant> {
    try {
      const response = await axiosInstance.put(
        `${this.baseUrl}/${productId}/variants/${variantId}`,
        data
      );
      const result = response.data;
      return result.data;
    } catch (error: any) {
      console.error('Update variant error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update variant');
    }
  }

  /**
   * Delete variant
   */
  async deleteVariant(productId: number, variantId: number): Promise<void> {
    try {
      await axiosInstance.delete(`${this.baseUrl}/${productId}/variants/${variantId}`);
    } catch (error: any) {
      console.error('Delete variant error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete variant');
    }
  }

  /**
   * Generate variant matrix (creates all combinations)
   */
  async generateMatrix(productId: number, data: GenerateMatrixData): Promise<ProductVariant[]> {
    try {
      const response = await axiosInstance.post(
        `${this.baseUrl}/${productId}/variants/generate-matrix`,
        data
      );
      const result = response.data;
      return result.data || [];
    } catch (error: any) {
      console.error('Generate matrix error:', error);
      throw new Error(error.response?.data?.message || 'Failed to generate variant matrix');
    }
  }

  /**
   * Get variant statistics for a product
   */
  async getStatistics(productId: number): Promise<VariantStatistics> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${productId}/variants/statistics`);
      const result = response.data;
      return result.data;
    } catch (error: any) {
      console.error('Get variant statistics error:', error);
      return {
        total_variants: 0,
        active_variants: 0,
        low_stock_variants: 0,
        total_stock: 0,
        total_reserved: 0,
        available_stock: 0,
      };
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Format attributes for display
   */
  formatAttributes(attributes: Record<string, string>): string {
    return Object.entries(attributes)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
  }

  /**
   * Parse attribute string back to object
   */
  parseAttributes(attributeString: string): Record<string, string> {
    const result: Record<string, string> = {};
    attributeString.split(',').forEach((pair) => {
      const [key, value] = pair.split(':').map((s) => s.trim());
      if (key && value) {
        result[key] = value;
      }
    });
    return result;
  }

  /**
   * Generate SKU suffix from attributes
   */
  generateSkuSuffix(attributes: Record<string, string>): string {
    return Object.values(attributes)
      .map((val) => val.substring(0, 2).toUpperCase())
      .join('-');
  }

  /**
   * Calculate final price with adjustment
   */
  calculatePrice(basePrice: number, priceAdjustment?: number): number {
    return basePrice + (priceAdjustment || 0);
  }

  /**
   * Check if variant is low stock
   */
  isLowStock(variant: ProductVariant): boolean {
    if (!variant.stock_quantity || !variant.reorder_point) return false;
    return variant.stock_quantity <= variant.reorder_point;
  }

  /**
   * Get available stock (total - reserved)
   */
  getAvailableStock(variant: ProductVariant): number {
    const total = variant.stock_quantity || 0;
    const reserved = variant.reserved_quantity || 0;
    return Math.max(0, total - reserved);
  }
}

// Export singleton instance
const productVariantService = new ProductVariantService();
export default productVariantService;