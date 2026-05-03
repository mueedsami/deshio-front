'use client';

import RouteGuard from '@/components/RouteGuard';
import { PAGE_ACCESS } from '@/lib/accessMap';

export default function SocialCommerceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RouteGuard allowedRoles={['super-admin', 'admin', 'online-moderator', 'branch-manager', 'pos-salesman']}>
      {children}
    </RouteGuard>
  );
}
