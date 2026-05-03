'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../CartContext';

/**
 * @deprecated The cart page has been deprecated in favor of the Global Cart Sidebar and consolidated checkout flow.
 * Users are now redirected to the checkout page after preparing the selected items list.
 */
export default function CartPage() {
  const router = useRouter();
  const { cart, isLoading } = useCart();

  useEffect(() => {
    if (!isLoading) {
      // Redirect to e-commerce checkout. We ensure the checkout-selected-items logic is maintained.
      if (cart.length > 0) {
        localStorage.setItem('checkout-selected-items', JSON.stringify(cart.map(i => i.id)));
      }
      router.replace('/e-commerce/checkout');
    }
  }, [router, cart, isLoading]);

  return (
    <div className="min-h-screen bg-[#ffffff] flex items-center justify-center">
      <div className="animate-pulse text-[#999999] font-medium tracking-widest text-xs uppercase">
        Redirecting to Checkout...
      </div>
    </div>
  );
}