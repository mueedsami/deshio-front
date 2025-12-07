// services/productService.ts (Updated)
import axiosInstance from '@/lib/axios';

export interface Product {
  id: number;
  name: string;
  sku: string;
  description?: string;
  category_id: number;
  vendor_id: number;
  is_archived: boolean;
  custom_fields?: CustomField[];
  images?: ProductImage[];
  variants?: any[]; // Product variants
  category?: {
    id: number;
    title: string;
  };
  vendor?: {
    id: number;
    name: string;
  };
  created_at: string;
  updated_at: string;
}

export interface CustomField {
  field_id: number;
  field_title: string;
  field_type: string;
  value: any;
  raw_value: string;
}

export interface ProductImage {
  id: number;
  product_id: number;
  image_path: string;
  is_primary: boolean;
  is_active: boolean;
  sort_order: number;
}

export interface Field {
  id: number;
  title: string;
  type: string;
  description?: string;
  is_required: boolean;
  options?: string[];
  placeholder?: string;
  order: number;
}

export interface CreateProductData {
  name: string;
  sku: string;
  description?: string;
  category_id: number;
  vendor_id: number;
  custom_fields?: {
    field_id: number;
    value: any;
  }[];
}

export interface CreateProductWithVariantsData extends CreateProductData {
  use_variants: boolean;
  variant_attributes?: Record<string, string[]>; // e.g., { Color: ["Red", "Blue"], Size: ["S", "M"] }
  base_price_adjustment?: number;
}

// Helper to normalize API response
function transformProduct(product: any): Product {
  return {
    id: product.id,
    name: product.name,
    sku: product.sku,
    description: product.description,
    category_id: product.category_id,
    vendor_id: product.vendor_id,
    is_archived: product.is_archived,
    custom_fields: product.custom_fields,
    images: product.images,
    variants: product.variants,
    category: product.category,
    vendor: product.vendor,
    created_at: product.created_at,
    updated_at: product.updated_at,
  };
}

export const productService = {
  /** Get all products (with optional filters and pagination) */
  async getAll(params?: {
    page?: number;
    per_page?: number;
    category_id?: number;
    vendor_id?: number;
    search?: string;
    is_archived?: boolean;
  }): Promise<{ data: Product[]; total: number; current_page: number; last_page: number }> {
    try {
      const response = await axiosInstance.get('/products', { params });
      const result = response.data;

      if (result.success) {
        const products = (result.data.data || result.data || []).map(transformProduct);
        return {
          data: products,
          total: result.data.total || products.length,
          current_page: result.data.current_page || 1,
          last_page: result.data.last_page || 1,
        };
      }

      return { data: [], total: 0, current_page: 1, last_page: 1 };
    } catch (error: any) {
      console.error('Get products error:', error);
      return { data: [], total: 0, current_page: 1, last_page: 1 };
    }
  },

  /** Get single product by ID */
  async getById(id: number | string): Promise<Product> {
    try {
      const response = await axiosInstance.get(`/products/${id}`);
      const result = response.data;
      const product = result.data || result;
      return transformProduct(product);
    } catch (error: any) {
      console.error('Get product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch product');
    }
  },

  /** Create product (simple or with variants) */
  async create(data: CreateProductData | CreateProductWithVariantsData): Promise<Product> {
    try {
      const response = await axiosInstance.post('/products', data, {
        headers: { 'Content-Type': 'application/json' },
      });
      const result = response.data;
      return transformProduct(result.data || result);
    } catch (error: any) {
      console.error('Create product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create product');
    }
  },

  /** Create product with variant matrix */
  async createWithVariants(
    productData: CreateProductData,
    variantAttributes: Record<string, string[]>,
    options?: {
      base_price_adjustment?: number;
      image_url?: string;
    }
  ): Promise<{ product: Product; variants: any[] }> {
    try {
      // Step 1: Create base product
      const product = await this.create(productData);

      // Step 2: Generate variant matrix
      const variantService = await import('./productVariantService');
      const variants = await variantService.default.generateMatrix(product.id, {
        attributes: variantAttributes,
        base_price_adjustment: options?.base_price_adjustment,
      });

      return { product, variants };
    } catch (error: any) {
      console.error('Create product with variants error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create product with variants');
    }
  },

  /** Update product by ID */
  async update(id: number | string, data: Partial<CreateProductData>): Promise<Product> {
    try {
      const response = await axiosInstance.put(`/products/${id}`, data, {
        headers: { 'Content-Type': 'application/json' },
      });
      const result = response.data;
      return transformProduct(result.data || result);
    } catch (error: any) {
      console.error('Update product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update product');
    }
  },

  /** Delete product */
  async delete(id: number | string): Promise<void> {
    try {
      await axiosInstance.delete(`/products/${id}`);
    } catch (error: any) {
      console.error('Delete product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete product');
    }
  },

  /** Archive product */
  async archive(id: number | string): Promise<void> {
    try {
      await axiosInstance.patch(`/products/${id}/archive`);
    } catch (error: any) {
      console.error('Archive product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to archive product');
    }
  },

  /** Restore archived product */
  async restore(id: number | string): Promise<void> {
    try {
      await axiosInstance.patch(`/products/${id}/restore`);
    } catch (error: any) {
      console.error('Restore product error:', error);
      throw new Error(error.response?.data?.message || 'Failed to restore product');
    }
  },

  /** Fetch available product fields */
  async getAvailableFields(): Promise<Field[]> {
    try {
      const response = await axiosInstance.get('/products/available-fields');
      const result = response.data;
      return result.data || [];
    } catch (error: any) {
      console.error('Get fields error:', error);
      return [];
    }
  },

  /** Upload single image and return URL */
  async uploadImage(file: File): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosInstance.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const result = response.data;
      return result.url || result.path || '';
    } catch (error: any) {
      console.error('Upload image error:', error);
      throw new Error(error.response?.data?.message || 'Failed to upload image');
    }
  },

  /** Add image to product */
  async addProductImage(
    productId: number,
    imageData: { image_path: string; is_primary: boolean; order: number }
  ): Promise<void> {
    try {
      await axiosInstance.post(`/products/${productId}/images`, imageData);
    } catch (error: any) {
      console.error('Add product image error:', error);
      throw new Error(error.response?.data?.message || 'Failed to add product image');
    }
  },

  /** Bulk update products */
  async bulkUpdate(data: {
    product_ids: number[];
    action: 'archive' | 'restore' | 'update_category' | 'update_vendor';
    category_id?: number;
    vendor_id?: number;
  }): Promise<{ message: string }> {
    try {
      const response = await axiosInstance.post('/products/bulk-update', data);
      const result = response.data;
      return { message: result.message || 'Bulk update successful' };
    } catch (error: any) {
      console.error('Bulk update error:', error);
      throw new Error(error.response?.data?.message || 'Failed to bulk update products');
    }
  },

  /** Get product statistics */
  async getStatistics(params?: { from_date?: string; to_date?: string }): Promise<any> {
    try {
      const response = await axiosInstance.get('/products/statistics', { params });
      const result = response.data;
      return result.data || {};
    } catch (error: any) {
      console.error('Get statistics error:', error);
      return {};
    }
  },

  /** Search products by custom field */
  async searchByCustomField(params: {
    field_id: number;
    value: any;
    operator?: '=' | 'like' | '>' | '<' | '>=' | '<=';
    per_page?: number;
  }): Promise<{ data: Product[]; total: number }> {
    try {
      const response = await axiosInstance.get('/products/search-by-field', { params });
      const result = response.data;
      
      if (result.success) {
        const products = (result.data.data || result.data || []).map(transformProduct);
        return {
          data: products,
          total: result.data.total || products.length,
        };
      }

      return { data: [], total: 0 };
    } catch (error: any) {
      console.error('Search by custom field error:', error);
      return { data: [], total: 0 };
    }
  },
};

export default productService;