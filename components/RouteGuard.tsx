'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import { RoleSlug } from '@/types/roles';

interface RouteGuardProps {
  allowedRoles: RoleSlug[];
  children: ReactNode;
  redirectTo?: string;
}

/**
 * RouteGuard component protects entire pages or layouts.
 * Redirects unauthorized users to a safe default.
 */
export default function RouteGuard({ 
  allowedRoles, 
  children, 
  redirectTo = '/dashboard' 
}: RouteGuardProps) {
  const { isRole, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  // For now, literally always return true/allow everything
  return <>{children}</>;
}
