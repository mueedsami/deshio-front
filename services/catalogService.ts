import axiosInstance from '@/lib/axios';

// Types matching the actual backend response
export interface ProductImage {
  id: number;
  url: string;
  alt_text?: string;
  is_primary: boolean;
  display_order?: number;
}

export interface ProductCategory {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  sku: string;
  description: string;
  short_description?: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  in_stock: boolean;
  images: ProductImage[];
  category: ProductCategory | null;
  created_at: string;
}

// Simplified product for featured/new arrivals/search results
export interface SimpleProduct {
  id: number;
  name: string;
  sku: string;
  selling_price: number;
  images: ProductImage[];
  category?: string | ProductCategory | null;
  in_stock?: boolean;
  added_days_ago?: number; // Only for new arrivals
}

export interface CatalogCategory {
  id: number;
  name: string;
  description?: string;
  image?: string;
  image_url?: string;
  color?: string;
  icon?: string;
  product_count: number;
  children?: CatalogCategory[];
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface ProductsResponse {
  products: Product[];
  pagination: PaginationMeta;
  filters_applied: {
    category?: string;
    min_price?: number;
    max_price?: number;
    search?: string;
    in_stock: boolean;
    sort_by: string;
    sort_order: string;
  };
}

export interface ProductDetailResponse {
  product: Product;
  related_products: SimpleProduct[]; // Backend returns simplified products
}

export interface GetProductsParams {
  per_page?: number;
  page?: number;
  category?: string;
  min_price?: number;
  max_price?: number;
  sort_by?: 'created_at' | 'name';
  sort_order?: 'asc' | 'desc';
  search?: string;
  in_stock?: boolean;
}

export interface SearchParams {
  q: string;
  per_page?: number;
  page?: number;
}

export interface SearchResponse {
  products: SimpleProduct[]; // Backend returns simplified products
  suggestions: string[];
  search_query: string;
  pagination: PaginationMeta;
}

export interface PriceRange {
  min_price: number;
  max_price: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

class CatalogService {
  private baseUrl = '/catalog';

  // Helper to build query string
  private buildQueryString(params: Record<string, any>): string {
    const pairs: string[] = [];
    
    for (const key in params) {
      if (params[key] !== undefined && params[key] !== null) {
        const value = encodeURIComponent(String(params[key]));
        pairs.push(key + '=' + value);
      }
    }
    
    return pairs.length > 0 ? '?' + pairs.join('&') : '';
  }

  // Normalize image URLs
  private normalizeImageUrl(url: string): string {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:8000';
    return baseUrl + url;
  }

  // Normalize product images (for full Product objects)
  private normalizeProduct(product: any): Product {
    // Handle both arrays and Laravel collection objects
    if (product.images) {
      // Convert to array if it's a collection object
      const imagesArray = Array.isArray(product.images) 
        ? product.images 
        : Object.values(product.images);
      
      product.images = imagesArray.map((img: any) => {
        // Handle nested image object structure
        const imageUrl = img.url || img.image_url || '';
        return {
          ...img,
          url: this.normalizeImageUrl(imageUrl)
        };
      });
    } else {
      product.images = [];
    }
    return product;
  }

  // Normalize simple product images (for SimpleProduct objects)
  private normalizeSimpleProduct(product: any): SimpleProduct {
    // Handle both arrays and Laravel collection objects
    if (product.images) {
      // Convert to array if it's a collection object
      const imagesArray = Array.isArray(product.images) 
        ? product.images 
        : Object.values(product.images);
      
      product.images = imagesArray.map((img: any) => {
        // Handle nested image object structure
        const imageUrl = img.url || img.image_url || '';
        return {
          ...img,
          url: this.normalizeImageUrl(imageUrl)
        };
      });
    } else {
      product.images = [];
    }
    return product;
  }

  // Normalize category images
  private normalizeCategory(category: any): CatalogCategory {
    if (category.image_url) {
      category.image_url = this.normalizeImageUrl(category.image_url);
    }
    if (category.children && Array.isArray(category.children)) {
      category.children = category.children.map((child: any) => this.normalizeCategory(child));
    }
    return category;
  }

  /**
   * GET PRODUCTS (with filters, pagination, sorting)
   */
  async getProducts(params: GetProductsParams = {}): Promise<ProductsResponse> {
    try {
      const queryString = this.buildQueryString(params);
      const url = this.baseUrl + '/products' + queryString;
      
      const response = await axiosInstance.get<ApiResponse<ProductsResponse>>(url);
      const data = response.data.data;
      
      // Normalize image URLs
      data.products = data.products.map(product => this.normalizeProduct(product));
      
      return data;
    } catch (error: any) {
      console.error('❌ Failed to fetch products:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * GET SINGLE PRODUCT (by ID)
   */
  async getProduct(identifier: number): Promise<ProductDetailResponse> {
    try {
      const url = this.baseUrl + '/products/' + identifier;
      
      const response = await axiosInstance.get<ApiResponse<ProductDetailResponse>>(url);
      const data = response.data.data;
      
      // Normalize image URLs
      data.product = this.normalizeProduct(data.product);
      data.related_products = data.related_products.map(product => this.normalizeSimpleProduct(product));
      
      return data;
    } catch (error: any) {
      console.error('Failed to fetch product:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * GET CATEGORIES (with product counts and children)
   */
  async getCategories(): Promise<CatalogCategory[]> {
    try {
      const url = this.baseUrl + '/categories';
      
      const response = await axiosInstance.get<ApiResponse<{ categories: CatalogCategory[] }>>(url);
      const categories = response.data.data.categories;
      
      // Normalize category image URLs
      return categories.map(category => this.normalizeCategory(category));
    } catch (error: any) {
      console.warn('Categories endpoint failed:', error.response?.data?.message || error.message);
      return [];
    }
  }

  /**
   * GET FEATURED PRODUCTS
   * Returns simplified product objects
   */
  async getFeaturedProducts(limit: number = 8): Promise<{
    featured_products: SimpleProduct[];
    total_featured: number;
  }> {
    try {
      const queryString = this.buildQueryString({ limit });
      const url = this.baseUrl + '/featured-products' + queryString;
      
      const response = await axiosInstance.get<ApiResponse<{
        featured_products: SimpleProduct[];
        total_featured: number;
      }>>(url);
      const data = response.data.data;
      
      // Normalize image URLs for simplified products
      data.featured_products = data.featured_products.map(product => this.normalizeSimpleProduct(product));
      
      return data;
    } catch (error: any) {
      console.error('Failed to fetch featured products:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * GET NEW ARRIVALS
   * Returns simplified product objects with added_days_ago field
   */
  async getNewArrivals(limit: number = 8, days: number = 30): Promise<{
    new_arrivals: SimpleProduct[];
    total_new_arrivals: number;
    days_range: number;
  }> {
    try {
      const queryString = this.buildQueryString({ limit, days });
      const url = this.baseUrl + '/new-arrivals' + queryString;
      
      const response = await axiosInstance.get<ApiResponse<{
        new_arrivals: SimpleProduct[];
        total_new_arrivals: number;
        days_range: number;
      }>>(url);
      const data = response.data.data;
      
      // Normalize image URLs for simplified products
      data.new_arrivals = data.new_arrivals.map(product => this.normalizeSimpleProduct(product));
      
      return data;
    } catch (error: any) {
      console.error('Failed to fetch new arrivals:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * SEARCH PRODUCTS (with suggestions)
   * Returns simplified product objects
   */
  async searchProducts(params: SearchParams): Promise<SearchResponse> {
    try {
      const queryString = this.buildQueryString(params);
      const url = this.baseUrl + '/search' + queryString;
      
      const response = await axiosInstance.get<ApiResponse<SearchResponse>>(url);
      const data = response.data.data;
      
      // Normalize image URLs for simplified products
      data.products = data.products.map(product => this.normalizeSimpleProduct(product));
      
      return data;
    } catch (error: any) {
      console.error('Failed to search products:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * GET PRICE RANGE (for filtering)
   */
  async getPriceRange(): Promise<PriceRange> {
    try {
      const url = this.baseUrl + '/price-range';
      
      const response = await axiosInstance.get<ApiResponse<PriceRange>>(url);
      return response.data.data;
    } catch (error: any) {
      console.error('Failed to fetch price range:', error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * ✅ GET SUGGESTED PRODUCTS (top-selling products)
   * Backend returns best-selling products based on order history
   * Returns simplified product objects
   */
  async getSuggestedProducts(limit: number = 5): Promise<{
    suggested_products: SimpleProduct[];
    total_suggested: number;
  }> {
    try {
      const queryString = this.buildQueryString({ limit });
      const url = this.baseUrl + '/suggested-products' + queryString;
      
      console.log('🔍 Fetching suggested products from:', url);
      
      const response = await axiosInstance.get<ApiResponse<{
        suggested_products: SimpleProduct[];
        total_suggested: number;
      }>>(url);
      
      console.log('📦 Raw API response:', response.data);
      
      const data = response.data.data;
      
      // Normalize image URLs for simplified products
      data.suggested_products = data.suggested_products.map(product => this.normalizeSimpleProduct(product));
      
      console.log('✅ Normalized suggested products:', data.suggested_products.length);
      
      return data;
    } catch (error: any) {
      console.error('❌ Failed to fetch suggested products:', error.response?.data?.message || error.message);
      console.error('Error details:', error.response?.data);
      
      // Return empty array on error instead of throwing
      return {
        suggested_products: [],
        total_suggested: 0,
      };
    }
  }
}

// Export a singleton instance
const catalogService = new CatalogService();
export default catalogService;