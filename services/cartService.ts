// services/cartService.ts

import axiosInstance from '@/lib/axios';

export interface CartProduct {
  id: number;
  name: string;
  selling_price: string;
  images: Array<{
    id: number;
    image_url: string;
    is_primary: boolean;
  }>;
  category?: string;
  stock_quantity: number;
  in_stock: boolean;
}

export interface CartItem {
  id: number;
  product_id: number;
  product: CartProduct;
  quantity: number;
  unit_price: string;
  total_price: string;
  notes?: string;
  added_at: string;
  updated_at: string;
}

export interface CartSummary {
  total_items: number;
  total_amount: string;
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
  original_price: string;
  current_price: string;
  notes?: string;
  saved_at: string;
}

export interface CartValidationIssue {
  item_id: number;
  product_name: string;
  issue: string;
  available_quantity?: number;
  old_price?: string;
  new_price?: string;
}

export interface CartValidation {
  is_valid: boolean;
  valid_items_count: number;
  total_items_count: number;
  issues: CartValidationIssue[];
  total_amount: string;
}

export interface AddToCartRequest {
  product_id: number;
  quantity: number;
  notes?: string;
}

export interface UpdateQuantityRequest {
  quantity: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
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
      throw new Error(error.response?.data?.message || 'Failed to get cart');
    }
  }

  /**
   * Add product to cart
   */
  async addToCart(payload: AddToCartRequest): Promise<{
    cart_item: CartItem;
  }> {
    try {
      const response = await axiosInstance.post<ApiResponse<{ cart_item: CartItem }>>(
        '/cart/add',
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to add to cart');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Add to cart error:', error);
      throw new Error(error.response?.data?.message || 'Failed to add to cart');
    }
  }

  /**
   * Update cart item quantity
   */
  async updateQuantity(
    cartItemId: number,
    payload: UpdateQuantityRequest
  ): Promise<{
    cart_item: {
      id: number;
      quantity: number;
      unit_price: string;
      total_price: string;
    };
  }> {
    try {
      const response = await axiosInstance.put<ApiResponse<{
        cart_item: {
          id: number;
          quantity: number;
          unit_price: string;
          total_price: string;
        };
      }>>(
        `/cart/update/${cartItemId}`,
        payload
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to update cart');
      }
      
      return response.data.data;
    } catch (error: any) {
      console.error('Update cart error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update cart');
    }
  }

  /**
   * Remove item from cart
   */
  async removeFromCart(cartItemId: number): Promise<void> {
    try {
      const response = await axiosInstance.delete<ApiResponse<any>>(
        `/cart/remove/${cartItemId}`
      );
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to remove from cart');
      }
    } catch (error: any) {
      console.error('Remove from cart error:', error);
      throw new Error(error.response?.data?.message || 'Failed to remove from cart');
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
      throw new Error(error.response?.data?.message || 'Failed to clear cart');
    }
  }

  /**
   * Save item for later
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
      throw new Error(error.response?.data?.message || 'Failed to save item');
    }
  }

  /**
   * Move saved item back to cart
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
      throw new Error(error.response?.data?.message || 'Failed to move item to cart');
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
      throw new Error(error.response?.data?.message || 'Failed to get saved items');
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
      throw new Error(error.response?.data?.message || 'Failed to get cart summary');
    }
  }

  /**
   * Validate cart before checkout
   */
  async validateCart(): Promise<CartValidation> {
    try {
      const response = await axiosInstance.post<ApiResponse<CartValidation>>('/cart/validate');
      
      return response.data.data;
    } catch (error: any) {
      console.error('Validate cart error:', error);
      throw new Error(error.response?.data?.message || 'Failed to validate cart');
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
      return sum + parseFloat(item.total_price);
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
   * Format cart item for order creation
   */
  formatCartItemForOrder(item: CartItem): {
    product_id: number;
    batch_id: number;
    quantity: number;
    unit_price: number;
    discount_amount?: number;
    tax_amount?: number;
  } {
    return {
      product_id: item.product_id,
      batch_id: 1, // TODO: Get actual batch_id from your system
      quantity: item.quantity,
      unit_price: parseFloat(item.unit_price),
      discount_amount: 0, // Calculate if you have discounts
      tax_amount: 0, // Calculate if you have taxes
    };
  }

  /**
   * Get cart items formatted for checkout
   */
  async getCartForCheckout(): Promise<{
    items: Array<{
      product_id: number;
      batch_id: number;
      quantity: number;
      unit_price: number;
      discount_amount: number;
      tax_amount: number;
    }>;
    summary: {
      subtotal: number;
      tax: number;
      discount: number;
      total: number;
    };
  }> {
    try {
      const cart = await this.getCart();
      
      const items = cart.cart_items.map(item => this.formatCartItemForOrder(item));
      
      const subtotal = parseFloat(cart.summary.total_amount);
      const tax = 0; // Calculate based on your tax rules
      const discount = 0; // Calculate based on coupons/discounts
      const total = subtotal + tax - discount;

      return {
        items,
        summary: {
          subtotal,
          tax,
          discount,
          total,
        },
      };
    } catch (error: any) {
      console.error('Get cart for checkout error:', error);
      throw error;
    }
  }
}

const cartService = new CartService();
export default cartService;