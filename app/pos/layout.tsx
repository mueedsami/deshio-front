'use client';

import RouteGuard from '@/components/RouteGuard';
import { PAGE_ACCESS } from '@/lib/accessMap';

export default function POSLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={PAGE_ACCESS['/pos']}>
      {children}
    </RouteGuard>
  );
}
