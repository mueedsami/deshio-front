'use client';

import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

function forceTop() {
  if (typeof window === 'undefined') return;
  window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

export default function ScrollToTopOnRouteChange() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previousRouteRef = useRef<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.history.scrollRestoration = 'manual';
    }

    const query = searchParams?.toString() || '';
    const currentRoute = `${pathname}?${query}`;

    if (previousRouteRef.current !== currentRoute) {
      if ((window as any).__Deshio_SKIP_SCROLL__) {
        (window as any).__Deshio_SKIP_SCROLL__ = false;
      } else {
        forceTop();
        requestAnimationFrame(() => {
          forceTop();
          setTimeout(forceTop, 0);
        });
      }
    }

    previousRouteRef.current = currentRoute;
  }, [pathname, searchParams]);

  return null;
}
