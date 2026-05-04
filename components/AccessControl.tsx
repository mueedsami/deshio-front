import { useAuth } from '@/contexts/AuthContext';
import { RoleSlug } from '@/types/roles';
import React from 'react';

interface AccessControlProps {
  roles: RoleSlug[];
  children: React.ReactNode;
  fallback?: React.ReactNode; // optional replacement UI; defaults to null (hidden)
}

/**
 * AccessControl component hides or replaces UI elements based on the current user's role.
 * 
 * Usage:
 * <AccessControl roles={['super-admin', 'admin']}>
 *   <AdminOnlyButton />
 * </AccessControl>
 */
export default function AccessControl({ roles, children, fallback = null }: AccessControlProps) {
  const { isRole } = useAuth();
  return isRole(roles) ? <>{children}</> : <>{fallback}</>;
}
