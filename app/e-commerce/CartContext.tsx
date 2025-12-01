'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import axiosInstance from '@/lib/axios';

interface CartItem {
  id: number;
  product_id: number;
  product_name: string;
  price: string;
  quantity: number;
  subtotal: number;
  product_image: string;
  sku?: string;
  color?: string;
  size?: string;
}

interface CartSummary {
  total_items: number;
  subtotal: number;
  estimated_tax: number;
  estimated_total: number;
}

interface CartContextType {
  cartItems: CartItem[];
  cartSummary: CartSummary | null;
  isLoading: boolean;
  addToCart: (product: any, quantity?: number) => Promise<void>;
  removeFromCart: (cartItemId: number) => Promise<void>;
  updateQuantity: (cartItemId: number, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getCartTotal: () => number;
  getCartCount: () => number;
  fetchCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | null>(null);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within CartProvider');
  }
  return context;
};

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication status
  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    setIsAuthenticated(!!token);
  }, []);

  // Fetch cart from backend
  const fetchCart = async () => {
    if (!isAuthenticated) {
      // Load from localStorage for guest users
      loadLocalCart();
      return;
    }

    try {
      setIsLoading(true);
      const response = await axiosInstance.get('/cart');
      
      if (response.data.success) {
        setCartItems(response.data.data.cart_items || []);
        setCartSummary(response.data.data.summary || null);
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      // Fallback to localStorage on error
      loadLocalCart();
    } finally {
      setIsLoading(false);
    }
  };

  // Load cart from localStorage (for guest users)
  const loadLocalCart = () => {
    try {
      const savedCart = localStorage.getItem('shopping-cart');
      if (savedCart) {
        const parsed = JSON.parse(savedCart);
        setCartItems(parsed);
        calculateLocalSummary(parsed);
      }
    } catch (error) {
      console.error('Error loading local cart:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate summary for local cart
  const calculateLocalSummary = (items: CartItem[]) => {
    const subtotal = items.reduce((total, item) => {
      const price = parseFloat(item.price || '0');
      return total + (price * item.quantity);
    }, 0);

    const estimated_tax = subtotal * 0.05; // 5% tax
    const estimated_total = subtotal + estimated_tax;

    setCartSummary({
      total_items: items.reduce((count, item) => count + item.quantity, 0),
      subtotal,
      estimated_tax,
      estimated_total,
    });
  };

  // Save to localStorage (for guest users)
  const saveLocalCart = (items: CartItem[]) => {
    try {
      localStorage.setItem('shopping-cart', JSON.stringify(items));
      calculateLocalSummary(items);
    } catch (error) {
      console.error('Error saving cart:', error);
    }
  };

  // Load cart on mount
  useEffect(() => {
    fetchCart();
  }, [isAuthenticated]);

  // Add to cart
  const addToCart = async (product: any, quantity: number = 1) => {
    if (!isAuthenticated) {
      // Local cart for guest users
      setCartItems((prevItems) => {
        const existingItem = prevItems.find(item => item.product_id === product.id);
        
        let newItems;
        if (existingItem) {
          newItems = prevItems.map(item =>
            item.product_id === product.id
              ? { ...item, quantity: item.quantity + quantity }
              : item
          );
        } else {
          const newItem: CartItem = {
            id: Date.now(), // Temporary ID for local cart
            product_id: product.id,
            product_name: product.name,
            price: product.price,
            quantity,
            subtotal: parseFloat(product.price) * quantity,
            product_image: product.image,
            sku: product.sku,
            color: product.color,
            size: product.size,
          };
          newItems = [...prevItems, newItem];
        }
        
        saveLocalCart(newItems);
        return newItems;
      });
      return;
    }

    // Backend cart for authenticated users
    try {
      const response = await axiosInstance.post('/cart/add', {
        product_id: product.id,
        quantity,
        variant_options: {
          color: product.color,
          size: product.size,
        }
      });

      if (response.data.success) {
        await fetchCart(); // Refresh cart after adding
      }
    } catch (error: any) {
      console.error('Error adding to cart:', error);
      throw error;
    }
  };

  // Remove from cart
  const removeFromCart = async (cartItemId: number) => {
    if (!isAuthenticated) {
      // Local cart for guest users
      const newItems = cartItems.filter(item => item.id !== cartItemId);
      setCartItems(newItems);
      saveLocalCart(newItems);
      return;
    }

    // Backend cart for authenticated users
    try {
      const response = await axiosInstance.delete(`/cart/remove/${cartItemId}`);
      
      if (response.data.success) {
        await fetchCart(); // Refresh cart after removing
      }
    } catch (error: any) {
      console.error('Error removing from cart:', error);
      throw error;
    }
  };

  // Update quantity
  const updateQuantity = async (cartItemId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(cartItemId);
      return;
    }

    if (!isAuthenticated) {
      // Local cart for guest users
      const newItems = cartItems.map(item =>
        item.id === cartItemId ? { ...item, quantity } : item
      );
      setCartItems(newItems);
      saveLocalCart(newItems);
      return;
    }

    // Backend cart for authenticated users
    try {
      const response = await axiosInstance.put(`/cart/update/${cartItemId}`, {
        quantity
      });
      
      if (response.data.success) {
        await fetchCart(); // Refresh cart after updating
      }
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      throw error;
    }
  };

  // Clear cart
  const clearCart = async () => {
    if (!isAuthenticated) {
      // Local cart for guest users
      setCartItems([]);
      localStorage.removeItem('shopping-cart');
      setCartSummary(null);
      return;
    }

    // Backend cart for authenticated users
    try {
      const response = await axiosInstance.delete('/cart/clear');
      
      if (response.data.success) {
        setCartItems([]);
        setCartSummary(null);
      }
    } catch (error: any) {
      console.error('Error clearing cart:', error);
      throw error;
    }
  };

  // Get cart total
  const getCartTotal = () => {
    if (cartSummary) {
      return cartSummary.subtotal;
    }
    return cartItems.reduce((total, item) => {
      const price = parseFloat(item.price || '0');
      return total + (price * item.quantity);
    }, 0);
  };

  // Get cart count
  const getCartCount = () => {
    if (cartSummary) {
      return cartSummary.total_items;
    }
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  };

  return (
    <CartContext.Provider
      value={{
        cartItems,
        cartSummary,
        isLoading,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartCount,
        fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}