/**
 * Enhanced Catalog Service with Product Grouping
 * 
 * This service wraps the existing catalogService and adds product grouping
 * functionality to group variations into single products.
 */

import catalogService, { 
  Product, 
  SimpleProduct, 
  GetProductsParams,
  ProductsResponse 
} from './catalogService';
import { groupProductsByBaseName, GroupedProduct } from '@/lib/productGrouping';

export interface GroupedProductsResponse {
  products: GroupedProduct[];
  pagination: ProductsResponse['pagination'];
  filters_applied: ProductsResponse['filters_applied'];
}

class EnhancedCatalogService {
  /**
   * Get products with automatic grouping by base name
   * This groups variations into a single product with variants
   */
  async getGroupedProducts(params: GetProductsParams = {}): Promise<GroupedProductsResponse> {
    // Fetch all products from the API
    const response = await catalogService.getProducts(params);
    
    // Group products by base name
    const groupedProducts = groupProductsByBaseName(response.products as any);
    
    return {
      products: groupedProducts,
      pagination: response.pagination,
      filters_applied: response.filters_applied
    };
  }

  /**
   * Get a single product with all its variations
   */
  async getProductWithVariations(productId: number): Promise<{
    product: GroupedProduct;
    related_products: GroupedProduct[];
  }> {
    // Fetch the product details
    const response = await catalogService.getProduct(productId);
    const product = response.product;
    
    // Get all products with the same base name to find all variations
    const baseName = this.getBaseName(product.name);
    
    // Search for all products with this base name
    const allVariants = await catalogService.getProducts({
      search: baseName,
      per_page: 100 // Get all possible variants
    });
    
    // Filter to exact matches only
    const exactMatches = allVariants.products.filter(p => 
      this.getBaseName(p.name) === baseName
    );
    
    // Group to get the complete product with all variants
    const grouped = groupProductsByBaseName(exactMatches as any);
    const groupedProduct = grouped[0] || this.convertToGroupedProduct(product);
    
    // Group related products
    const groupedRelated = groupProductsByBaseName(response.related_products as any);
    
    return {
      product: groupedProduct,
      related_products: groupedRelated
    };
  }

  /**
   * Helper to get base name from product name
   */
  private getBaseName(name: string): string {
    const parts = name.split(' - ');
    if (parts.length <= 1) return name;
    
    // Remove last part (size) and optionally second-to-last (color)
    const last = parts[parts.length - 1];
    const isSize = /^(XS|S|M|L|XL|XXL|XXXL|\d{2,3})$/i.test(last);
    
    if (isSize && parts.length >= 3) {
      return parts.slice(0, -2).join(' - ');
    }
    
    return parts.slice(0, -1).join(' - ');
  }

  /**
   * Convert a single product to grouped format
   */
  private convertToGroupedProduct(product: Product): GroupedProduct {
    const baseName = this.getBaseName(product.name);
    const color = this.getColorLabel(product.name);
    const size = this.getSizeLabel(product.name);
    
    return {
      id: product.id,
      name: baseName,
      sku: product.sku,
      description: product.description,
      short_description: product.short_description,
      category: product.category,
      images: product.images,
      variants: [{
        id: product.id,
        sku: product.sku,
        color,
        size,
        selling_price: product.selling_price,
        cost_price: product.cost_price,
        stock_quantity: product.stock_quantity,
        in_stock: product.in_stock,
        images: product.images
      }],
      min_price: product.selling_price,
      max_price: product.selling_price,
      in_stock: product.in_stock,
      created_at: product.created_at
    };
  }

  private getColorLabel(name: string): string | undefined {
    const parts = name.split(' - ');
    if (parts.length <= 1) return undefined;
    
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];
    const isSize = /^(XS|S|M|L|XL|XXL|XXXL|\d{2,3})$/i.test(last);
    
    if (isSize && secondLast) {
      return secondLast;
    }
    
    if (!isSize) {
      return last;
    }
    
    return undefined;
  }

  private getSizeLabel(name: string): string | undefined {
    const parts = name.split(' - ');
    if (parts.length <= 1) return undefined;
    
    const last = parts[parts.length - 1];
    const isSize = /^(XS|S|M|L|XL|XXL|XXXL|\d{2,3})$/i.test(last);
    
    return isSize ? last : undefined;
  }

  /**
   * Get featured products (grouped by base name)
   */
  async getGroupedFeaturedProducts(limit: number = 8): Promise<{
    featured_products: GroupedProduct[];
    total_featured: number;
  }> {
    const response = await catalogService.getFeaturedProducts(limit);
    const grouped = groupProductsByBaseName(response.featured_products as any);
    
    return {
      featured_products: grouped,
      total_featured: grouped.length
    };
  }

  /**
   * Get new arrivals (grouped by base name)
   */
  async getGroupedNewArrivals(limit: number = 8, days: number = 30): Promise<{
    new_arrivals: GroupedProduct[];
    total_new_arrivals: number;
    days_range: number;
  }> {
    const response = await catalogService.getNewArrivals(limit, days);
    const grouped = groupProductsByBaseName(response.new_arrivals as any);
    
    return {
      new_arrivals: grouped,
      total_new_arrivals: grouped.length,
      days_range: response.days_range
    };
  }

  /**
   * Search products (grouped by base name)
   */
  async searchGroupedProducts(params: { q: string; per_page?: number; page?: number }): Promise<{
    products: GroupedProduct[];
    suggestions: string[];
    search_query: string;
    pagination: any;
  }> {
    const response = await catalogService.searchProducts(params);
    const grouped = groupProductsByBaseName(response.products as any);
    
    return {
      products: grouped,
      suggestions: response.suggestions,
      search_query: response.search_query,
      pagination: response.pagination
    };
  }

  // Proxy other methods from catalogService
  getCategories = catalogService.getCategories.bind(catalogService);
  getPriceRange = catalogService.getPriceRange.bind(catalogService);
}

// Export singleton instance
const enhancedCatalogService = new EnhancedCatalogService();
export default enhancedCatalogService;
