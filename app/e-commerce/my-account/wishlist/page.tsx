'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function MyAccountWishlistRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/e-commerce/wishlist');
  }, [router]);

  return null;
}
