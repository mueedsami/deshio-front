'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import cartService from '@/services/cartService';
import { toAbsoluteAssetUrl } from '@/lib/assetUrl';
import { usePromotion } from '@/contexts/PromotionContext';

export type CartSidebarItem = {
  id: number; // cart item id
  productId: number;
  categoryId?: number;
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
  validateCart: () => Promise<any>;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

function pickImage(product: any): string | undefined {
  const images = Array.isArray(product?.images) ? product.images : [];
  const primary = images.find((i: any) => i?.is_primary || i?.primary || i?.isPrimary) || images[0];
  const raw = primary?.image_url || primary?.url || primary?.thumbnail_url || primary?.image || primary?.path;
  const abs = toAbsoluteAssetUrl(raw);
  return abs || undefined;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { getApplicablePromotion } = usePromotion();
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
        categoryId: typeof ci.product?.category === 'object' && ci.product?.category != null ? (ci.product.category as any).id : (typeof ci.product?.category_id === 'number' ? ci.product.category_id : undefined),
        name: ci.product?.name || 'Product',
        price: Number(ci.unit_price || 0),
        image: pickImage(ci.product),
        quantity: Number(ci.quantity || 0),
        maxQuantity: typeof ci.product?.available_inventory === 'number' ? ci.product.available_inventory : undefined,
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

  const validateCart = async () => {
    return await cartService.validateCart();
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => {
      const promo = getApplicablePromotion(item.productId, item.categoryId ?? null);
      const originalPrice = Number(item.price) || 0;
      const discount = promo?.discount_value ?? 0;
      const activePrice = discount > 0 ? Math.max(0, originalPrice - (originalPrice * discount / 100)) : originalPrice;
      return sum + activePrice * (Number(item.quantity) || 0);
    }, 0);
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
      validateCart,
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
