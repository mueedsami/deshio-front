// services/cartService.ts

import axiosInstance from '@/lib/axios';

export interface CartProduct {
  id: number;
  name: string;
  selling_price: string | number;
  images: Array<{
    id: number;
    image_url: string;
    is_primary: boolean;
  }>;
  category?: string;
  stock_quantity: number;
  in_stock: boolean;
  sku?: string;
}

export interface VariantOptions {
  color?: string;
  size?: string;
}

export interface CartItem {
  id: number; // cart_item_id from backend
  product_id: number;
  product: CartProduct;
  variant_options?: VariantOptions | null;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  notes?: string;
  added_at: string;
  updated_at: string;
}

export interface CartSummary {
  total_items: number;
  total_amount: string | number;
  currency: string;
  has_items?: boolean;
}

export interface Cart {
  cart_items: CartItem[];
  summary: CartSummary;
}

export interface SavedItem {
  id: number;
  product_id: number;
  product: CartProduct & {
    price_changed: boolean;
  };
  quantity: number;
  original_price: string | number;
  current_price: string | number;
  notes?: string;
  saved_at: string;
}

export interface CartValidationIssue {
  item_id: number;
  product_name: string;
  issue: string;
  available_quantity?: number;
  old_price?: string | number;
  new_price?: string | number;
}

export interface CartValidation {
  is_valid: boolean;
  valid_items_count: number;
  total_items_count: number;
  issues: CartValidationIssue[];
  total_amount: string | number;
}

export interface AddToCartRequest {
  product_id: number;
  quantity: number;
  notes?: string;
  variant_options?: VariantOptions;
}

export interface UpdateQuantityRequest {
  quantity: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: any;
}

class CartService {
  /**
   * Get customer's cart
   */
  async getCart(): Promise<Cart> {
    try {
      const response = await axiosInstance.get<ApiResponse<Cart>>('/cart');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get cart');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Get cart error:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to get cart';
      throw new Error(errorMessage);
    }
  }

  /**
   * Add product to cart
   * Now supports variant_options (color, size)
   */
  async addToCart(payload: AddToCartRequest): Promise<{
    cart_item: CartItem;
  }> {
    try {
      console.log('🛒 Adding to cart:', payload);
      
      const response = await axiosInstance.post<ApiResponse<{ cart_item: CartItem }>>(
        '/cart/add',
        payload
      );
      
      console.log('✅ Add to cart response:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to add to cart');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Add to cart error:', error);
      console.error('Error details:', error.response?.data);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        throw new Error(Array.isArray(firstError) ? firstError[0] : String(firstError));
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to add to cart';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Update cart item quantity
   * @param cartItemId - The cart item ID (NOT product ID)
   * @param payload - Object containing the new quantity
   */
  async updateQuantity(
    cartItemId: number,
    payload: UpdateQuantityRequest
  ): Promise<{
    cart_item: {
      id: number;
      quantity: number;
      unit_price: string | number;
      total_price: string | number;
    };
  }> {
    try {
      console.log(`🔄 Updating cart item ${cartItemId}:`, payload);
      
      const response = await axiosInstance.put<ApiResponse<{
        cart_item: {
          id: number;
          quantity: number;
          unit_price: string | number;
          total_price: string | number;
        };
      }>>(
        `/cart/update/${cartItemId}`,
        payload
      );
      
      console.log('✅ Update response:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update cart');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Update cart error:', error);
      console.error('Error details:', error.response?.data);
      
      // Handle validation errors
      if (error.response?.data?.errors) {
        const errors = error.response.data.errors;
        const firstError = Object.values(errors)[0];
        throw new Error(Array.isArray(firstError) ? firstError[0] : String(firstError));
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to update cart';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Remove item from cart
   * @param cartItemId - The cart item ID (NOT product ID)
   */
  async removeFromCart(cartItemId: number): Promise<void> {
    try {
      console.log(`🗑️ Removing cart item ${cartItemId}`);
      
      const response = await axiosInstance.delete<ApiResponse<any>>(
        `/cart/remove/${cartItemId}`
      );
      
      console.log('✅ Remove response:', response.data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to remove from cart');
      }
    } catch (error: any) {
      console.error('❌ Remove from cart error:', error);
      console.error('Error details:', error.response?.data);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to remove from cart';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Clear entire cart
   */
  async clearCart(): Promise<void> {
    try {
      const response = await axiosInstance.delete<ApiResponse<any>>('/cart/clear');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to clear cart');
      }
    } catch (error: any) {
      console.error('Clear cart error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to clear cart';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Save item for later
   * @param cartItemId - The cart item ID (NOT product ID)
   */
  async saveForLater(cartItemId: number): Promise<void> {
    try {
      const response = await axiosInstance.post<ApiResponse<any>>(
        `/cart/save-for-later/${cartItemId}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to save item');
      }
    } catch (error: any) {
      console.error('Save for later error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to save item';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Move saved item back to cart
   * @param cartItemId - The cart item ID (NOT product ID)
   */
  async moveToCart(cartItemId: number): Promise<void> {
    try {
      const response = await axiosInstance.post<ApiResponse<any>>(
        `/cart/move-to-cart/${cartItemId}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to move item to cart');
      }
    } catch (error: any) {
      console.error('Move to cart error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to move item to cart';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get saved items
   */
  async getSavedItems(): Promise<{
    saved_items: SavedItem[];
    total_saved_items: number;
  }> {
    try {
      const response = await axiosInstance.get<ApiResponse<{
        saved_items: SavedItem[];
        total_saved_items: number;
      }>>('/cart/saved-items');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get saved items');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Get saved items error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to get saved items';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Get cart summary
   */
  async getCartSummary(): Promise<CartSummary> {
    try {
      const response = await axiosInstance.get<ApiResponse<CartSummary>>('/cart/summary');
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to get cart summary');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Get cart summary error:', error);
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to get cart summary';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Validate cart before checkout
   */
  async validateCart(): Promise<CartValidation> {
    try {
      const response = await axiosInstance.post<ApiResponse<CartValidation>>('/cart/validate');
      
      // Note: Backend may return success: false when there are issues
      // but we still want to return the validation data
      return response.data.data;
    } catch (error: any) {
      console.error('Validate cart error:', error);
      
      // If it's a 400 with validation data, return that
      if (error.response?.status === 400 && error.response?.data?.data) {
        return error.response.data.data;
      }
      
      const errorMessage = error.response?.data?.message || 
                          error.message || 
                          'Failed to validate cart';
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Calculate cart totals for local display
   */
  calculateTotals(cartItems: CartItem[]): {
    subtotal: number;
    total_items: number;
  } {
    const subtotal = cartItems.reduce((sum, item) => {
      const total = typeof item.total_price === 'string' 
        ? parseFloat(item.total_price) 
        : item.total_price;
      return sum + total;
    }, 0);

    const total_items = cartItems.reduce((sum, item) => {
      return sum + item.quantity;
    }, 0);

    return {
      subtotal,
      total_items,
    };
  }

  /**
   * Format price for display
   */
  formatPrice(price: string | number): string {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return numPrice.toLocaleString('en-BD', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  /**
   * Check if cart has items
   */
  hasItems(cart: Cart): boolean {
    return cart.cart_items.length > 0;
  }

  /**
   * Get total quantity in cart
   */
  getTotalQuantity(cart: Cart): number {
    return cart.cart_items.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Get total amount in cart
   */
  getTotalAmount(cart: Cart): number {
    const amount = cart.summary.total_amount;
    return typeof amount === 'string' ? parseFloat(amount) : amount;
  }

  /**
   * Find cart item by product ID and variant options
   */
  findItemByProductId(
    cart: Cart, 
    productId: number, 
    variantOptions?: VariantOptions
  ): CartItem | undefined {
    return cart.cart_items.find(item => {
      if (item.product_id !== productId) return false;
      
      // If no variant options specified, match items without variants
      if (!variantOptions) {
        return !item.variant_options || Object.keys(item.variant_options).length === 0;
      }
      
      // Match variant options
      if (!item.variant_options) return false;
      
      return item.variant_options.color === variantOptions.color &&
             item.variant_options.size === variantOptions.size;
    });
  }

  /**
   * Check if product is in cart (considering variants)
   */
  isProductInCart(
    cart: Cart, 
    productId: number, 
    variantOptions?: VariantOptions
  ): boolean {
    return !!this.findItemByProductId(cart, productId, variantOptions);
  }

  /**
   * Get product quantity in cart (considering variants)
   */
  getProductQuantityInCart(
    cart: Cart, 
    productId: number, 
    variantOptions?: VariantOptions
  ): number {
    const item = this.findItemByProductId(cart, productId, variantOptions);
    return item ? item.quantity : 0;
  }

  /**
   * Get all cart items for a specific product (all variants)
   */
  getProductItems(cart: Cart, productId: number): CartItem[] {
    return cart.cart_items.filter(item => item.product_id === productId);
  }

  /**
   * Get total quantity for a product across all variants
   */
  getTotalProductQuantity(cart: Cart, productId: number): number {
    const items = this.getProductItems(cart, productId);
    return items.reduce((sum, item) => sum + item.quantity, 0);
  }
}

const cartService = new CartService();
export default cartService;