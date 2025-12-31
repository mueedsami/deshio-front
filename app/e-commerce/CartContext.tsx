'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import cartService from '@/services/cartService';

export type CartSidebarItem = {
  id: number; // cart item id
  productId: number;
  name: string;
  price: number;
  image?: string;
  quantity: number;
  maxQuantity?: number;
  sku?: string;
  color?: string;
  size?: string;
};

type CartContextType = {
  cart: CartSidebarItem[];
  isLoading: boolean;
  getTotalPrice: () => number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  addToCart: (productId: number, quantity?: number, variantOptions?: Record<string, any>) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  refreshCart: () => Promise<void>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function pickImage(product: any): string | undefined {
  const images = product?.images || [];
  const primary = images.find((i: any) => i?.is_primary) || images[0];
  return primary?.image_url;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart] = useState<CartSidebarItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = async () => {
    try {
      setIsLoading(true);
      const data = await cartService.getCart();
      const mapped: CartSidebarItem[] = (data.cart_items || []).map((ci) => ({
        id: ci.id,
        productId: ci.product_id,
        name: ci.product?.name || 'Product',
        price: Number(ci.unit_price || 0),
        image: pickImage(ci.product),
        quantity: Number(ci.quantity || 0),
        maxQuantity: typeof ci.product?.stock_quantity === 'number' ? ci.product.stock_quantity : undefined,
        sku: ci.product?.sku,
        color: (ci as any)?.variant_options?.color,
        size: (ci as any)?.variant_options?.size,
      }));
      setCart(mapped);
    } catch (e) {
      // If anything goes wrong, keep UI usable.
      setCart([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshCart();

    const handleCartUpdated = () => {
      refreshCart();
    };
    window.addEventListener('cart-updated', handleCartUpdated);
    return () => window.removeEventListener('cart-updated', handleCartUpdated);
  }, []);

  const addToCart = async (productId: number, quantity = 1, variantOptions?: Record<string, any>) => {
    await cartService.addToCart({
      product_id: productId,
      quantity: Math.max(1, Number(quantity || 1)),
      variant_options: variantOptions as any,
    });
    await refreshCart();
    setIsCartOpen(true);
  };

  const removeFromCart = async (cartItemId: number) => {
    await cartService.removeFromCart(cartItemId);
    await refreshCart();
  };

  const updateQuantity = async (cartItemId: number, quantity: number) => {
    await cartService.updateQuantity(cartItemId, { quantity: Math.max(0, Number(quantity || 0)) });
    await refreshCart();
  };

  const clearCart = async () => {
    await cartService.clearCart();
    await refreshCart();
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 0), 0);
  };

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      isLoading,
      getTotalPrice,
      isCartOpen,
      setIsCartOpen,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      refreshCart,
    }),
    [cart, isCartOpen, isLoading]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
}
