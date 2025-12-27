'use client';

import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';
import { CartProvider } from '@/app/e-commerce/CartContext';
import Footer from '@/components/ecommerce/Footer';

export default function EcommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CustomerAuthProvider>
      <CartProvider>
        {children}
        <Footer />
      </CartProvider>
    </CustomerAuthProvider>
  );
}