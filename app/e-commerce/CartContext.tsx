'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import cartService from '@/services/cartService';

interface CartItem {
  id: number; // cart_item_id
  product_id: number;
  name: string;
  images: Array<{ id: number; image_url: string; is_primary: boolean }>;
  sku?: string;
  quantity: number;
  unit_price: string | number;
  total_price: string | number;
  variant_options?: {
    color?: string;
    size?: string;
  };
  notes?: string;
  added_at?: string;
  updated_at?: string;
}

interface CartContextType {
  cart: CartItem[];
  cartItems: CartItem[];
  isLoading: boolean;
  addToCart: (item: CartItem, quantity: number) => void;
  removeFromCart: (id: number) => void;
  updateQuantity: (id: number, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
  getCartTotal: () => number;
  refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const isAuthenticated = () => {
    const token = localStorage.getItem('auth_token');
    return !!token;
  };

  useEffect(() => {
    if (isAuthenticated()) {
      loadCartFromBackend();
    }
  }, []);

  const loadCartFromBackend = async () => {
    if (!isAuthenticated()) return;

    try {
      setIsLoading(true);
      const cartData = await cartService.getCart();
      
      console.log('📦 Cart data from backend:', cartData);
      
      // ✅ PRESERVE BACKEND STRUCTURE - Don't transform!
      const transformedCart: CartItem[] = cartData.cart_items.map(item => ({
        id: item.id,                    // cart_item_id
        product_id: item.product_id,
        name: item.product.name,
        images: item.product.images || [], // ✅ Preserve array structure
        sku: item.product.sku ?? '',
        quantity: item.quantity,
        unit_price: item.unit_price,    // ✅ Keep original name
        total_price: item.total_price,  // ✅ Include total_price
        variant_options: item.variant_options,
        notes: item.notes,
        added_at: item.added_at,
        updated_at: item.updated_at,
      }));

      console.log('✅ Transformed cart:', transformedCart);
      setCart(transformedCart);
    } catch (error) {
      console.error('❌ Error loading cart from backend:', error);
      if (error instanceof Error && 
          (error.message.includes('401') || error.message.includes('Unauthenticated'))) {
        setCart([]);
        localStorage.removeItem('auth_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCart = async () => {
    await loadCartFromBackend();
  };

  const addToCart = (item: CartItem, quantity: number) => {
    setCart((prevCart) => {
      const existingItem = prevCart.find((cartItem) => cartItem.product_id === item.product_id);
      
      if (existingItem) {
        return prevCart.map((cartItem) =>
          cartItem.product_id === item.product_id
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      
      return [...prevCart, { ...item, quantity }];
    });
  };

  const removeFromCart = (cartItemId: number) => {
    setCart((prevCart) => prevCart.filter((item) => item.id !== cartItemId));
  };

  const updateQuantity = (cartItemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }
    
    setCart((prevCart) =>
      prevCart.map((item) =>
        item.id === cartItemId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const getTotalItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((total, item) => {
      const totalPrice = typeof item.total_price === 'string' 
        ? parseFloat(item.total_price) 
        : item.total_price;
      return total + totalPrice;
    }, 0);
  };

  const getCartTotal = () => {
    return getTotalPrice();
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems: cart,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalItems,
        getTotalPrice,
        getCartTotal,
        refreshCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};