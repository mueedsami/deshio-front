'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import campaignService, { PublicPromotion } from '@/services/campaignService';

interface PromotionContextValue {
  /** All currently valid public promotions */
  activePublicPromotions: PublicPromotion[];
  /** true while loading for the first time */
  isLoading: boolean;
  /**
   * Returns the best percentage-type promotion that applies to a given product/category.
   * Fixed-amount promotions are NOT shown per-ProductCard — only at cart level.
   */
  getApplicablePromotion: (productId: number, categoryId?: number | null) => PublicPromotion | null;
  /**
   * Returns the best fixed-amount promotion applicable to the cart as a whole
   * (no product restriction, or any matching product is in the cart).
   */
  getFixedDiscountForCartSubtotal: (subtotal: number) => { amount: number; promotion: PublicPromotion } | null;
  /** Manually trigger a fresh fetch (e.g., when opening cart) */
  refresh: () => void;
}

const PromotionContext = createContext<PromotionContextValue>({
  activePublicPromotions: [],
  isLoading: false,
  getApplicablePromotion: () => null,
  getFixedDiscountForCartSubtotal: () => null,
  refresh: () => {},
});

const REVALIDATION_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export const PromotionProvider = ({ children }: { children: React.ReactNode }) => {
  const [promotions, setPromotions] = useState<PublicPromotion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPromotions = useCallback(async () => {
    try {
      const data = await campaignService.getActivePublicPromotions();
      setPromotions(Array.isArray(data) ? data : []);
    } catch {
      // Silently fail — don't interrupt the storefront experience
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPromotions();
    intervalRef.current = setInterval(fetchPromotions, REVALIDATION_INTERVAL_MS);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPromotions]);

  /**
   * Find the best percentage promotion for a specific product/category.
   * Fixed-amount promos are only shown at cart level.
   */
  const getApplicablePromotion = useCallback(
    (productId: number, categoryId?: number | null): PublicPromotion | null => {
      const percentage = promotions.filter((p) => p.type === 'percentage');
      const matches: PublicPromotion[] = [];

      for (const promo of percentage) {
        const noProductScope = !promo.applicable_products || promo.applicable_products.length === 0;
        const noCategoryScope = !promo.applicable_categories || promo.applicable_categories.length === 0;
        const isSitewide = noProductScope && noCategoryScope;

        if (isSitewide) {
          matches.push(promo);
          continue;
        }
        if (!noProductScope && promo.applicable_products!.includes(productId)) {
          matches.push(promo);
          continue;
        }
        if (!noCategoryScope && categoryId != null && promo.applicable_categories!.includes(categoryId)) {
          matches.push(promo);
        }
      }

      if (matches.length === 0) return null;
      // Return the highest discount_value promotion
      return matches.reduce((best, cur) => (cur.discount_value > best.discount_value ? cur : best));
    },
    [promotions]
  );

  /**
   * Returns the best applicable fixed-amount promotion for the cart total.
   * Checks minimum_purchase threshold and ignores product/category scope (order-level discount).
   */
  const getFixedDiscountForCartSubtotal = useCallback(
    (subtotal: number): { amount: number; promotion: PublicPromotion } | null => {
      const fixed = promotions.filter((p) => p.type === 'fixed');
      let best: { amount: number; promotion: PublicPromotion } | null = null;

      for (const promo of fixed) {
        if (promo.minimum_purchase && subtotal < promo.minimum_purchase) continue;
        let amount = promo.discount_value;
        if (promo.maximum_discount && amount > promo.maximum_discount) amount = promo.maximum_discount;
        amount = Math.min(amount, subtotal); // Cannot exceed cart total
        if (!best || amount > best.amount) {
          best = { amount, promotion: promo };
        }
      }
      return best;
    },
    [promotions]
  );

  return (
    <PromotionContext.Provider
      value={{
        activePublicPromotions: promotions,
        isLoading,
        getApplicablePromotion,
        getFixedDiscountForCartSubtotal,
        refresh: fetchPromotions,
      }}
    >
      {children}
    </PromotionContext.Provider>
  );
};

export const usePromotion = () => useContext(PromotionContext);

export default PromotionContext;
