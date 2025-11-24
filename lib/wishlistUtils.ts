// Location: @/lib/wishlistUtils.ts

export interface WishlistItem {
  id: string | number;
  name: string;
  image: string;
  price: number;
  sku?: string;
}

const WISHLIST_KEY = 'temp_wishlist';

export const wishlistUtils = {
  getAll: (): WishlistItem[] => {
    if (typeof window === 'undefined') return [];
    const stored = sessionStorage.getItem(WISHLIST_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  add: (item: WishlistItem): void => {
    const current = wishlistUtils.getAll();
    if (!current.some(i => i.id === item.id)) {
      sessionStorage.setItem(WISHLIST_KEY, JSON.stringify([...current, item]));
      window.dispatchEvent(new Event('wishlist-updated'));
    }
  },

  remove: (id: string | number): void => {
    const current = wishlistUtils.getAll();
    sessionStorage.setItem(WISHLIST_KEY, JSON.stringify(current.filter(i => i.id !== id)));
    window.dispatchEvent(new Event('wishlist-updated'));
  },

  isInWishlist: (id: string | number): boolean => {
    return wishlistUtils.getAll().some(i => i.id === id);
  },

  getCount: (): number => {
    return wishlistUtils.getAll().length;
  },

  clear: (): void => {
    sessionStorage.removeItem(WISHLIST_KEY);
    window.dispatchEvent(new Event('wishlist-updated'));
  }
};