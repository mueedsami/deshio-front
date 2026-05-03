'use client';

import RouteGuard from '@/components/RouteGuard';
import { PAGE_ACCESS } from '@/lib/accessMap';

export default function AccountingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={PAGE_ACCESS['/accounting']}>
      {children}
    </RouteGuard>
  );
}
