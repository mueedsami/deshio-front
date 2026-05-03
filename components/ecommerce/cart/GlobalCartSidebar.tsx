'use client';

import React from 'react';
import { useCart } from '@/app/e-commerce/CartContext';
import CartSidebar from './CartSidebar';

export default function GlobalCartSidebar() {
  const { isCartOpen, setIsCartOpen } = useCart();

  return (
    <CartSidebar 
      isOpen={isCartOpen} 
      onClose={() => setIsCartOpen(false)} 
    />
  );
}
