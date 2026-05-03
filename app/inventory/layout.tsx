'use client';

import RouteGuard from '@/components/RouteGuard';
import { PAGE_ACCESS } from '@/lib/accessMap';

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Use root inventory access list
  return (
    <RouteGuard allowedRoles={PAGE_ACCESS['/inventory']}>
      {children}
    </RouteGuard>
  );
}
