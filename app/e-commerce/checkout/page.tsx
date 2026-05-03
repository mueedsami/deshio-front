import { Suspense } from 'react';
import CheckoutClient from './CheckoutClient';
import Navigation from '@/components/ecommerce/Navigation';

/**
 * Checkout Page
 * 
 * This page wraps the client component in a Suspense boundary because
 * CheckoutClient uses useSearchParams() for capturing potential payment errors
 * and redirection logic.
 */
export default function CheckoutPage() {
  return (
    <div className="ec-root ec-darkify min-h-screen">
      <Suspense
        fallback={
          <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d]">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-[var(--gold)]/20 border-t-[var(--gold)] rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-white/50 font-medium tracking-wide">Initializing secure checkout...</p>
            </div>
          </div>
        }
      >
        <CheckoutClient />
      </Suspense>
    </div>
  );
}
