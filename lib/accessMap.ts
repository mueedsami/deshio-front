import { RoleSlug } from '@/types/roles';

export const ALL_ROLES: RoleSlug[] = [
  'super-admin',
  'admin',
  'branch-manager',
  'online-moderator',
  'pos-salesman',
  'employee',
];

/**
 * PAGE_ACCESS is the single source of truth for route-level authorization.
 * 
 * Roles in scope:
 * - super-admin, admin: Full access to everything.
 * - branch-manager: Access to branch-level administrative tools.
 * - online-moderator: Focused on social-commerce, order management, and global inventory view.
 * - pos-salesman: Focused on branch POS and fulfillment.
 * - employee: General access for common tasks.
 */
const _PAGE_ACCESS: Record<string, RoleSlug[]> = {
  // Dashboard
  '/dashboard': ALL_ROLES,
  '/dashboard/stores-summary': ALL_ROLES,

  // Vendor Management
  '/vendor': ALL_ROLES,
  '/purchase-order': ALL_ROLES,

  // Basic Setup
  '/store': ALL_ROLES,
  '/store-assingment': ALL_ROLES,
  '/category': ALL_ROLES,
  '/gallery': ALL_ROLES,

  // Products
  '/product/field': ALL_ROLES,
  '/product/list': ALL_ROLES,
  '/product/archived': ALL_ROLES,
  '/product/batch': ALL_ROLES,
  '/product/add': ALL_ROLES,

  // Inventory 
  '/inventory': ALL_ROLES,
  '/inventory/manage_stock': ALL_ROLES,
  '/inventory/view': ALL_ROLES,
  '/inventory/batch-price-update': ALL_ROLES,
  '/inventory/outlet-stock': ALL_ROLES,
  '/inventory/reports': ALL_ROLES,
  '/inventory/intelligence': ALL_ROLES,

  // Sales & Orders
  '/pos': ALL_ROLES,
  '/purchase-history': ALL_ROLES,
  '/social-commerce': ALL_ROLES,
  '/social-commerce/package': ALL_ROLES,
  '/social-commerce/amount-details': ALL_ROLES,
  '/social-commerce/text-import': ALL_ROLES,
  '/orders': ALL_ROLES,
  '/preorders': ALL_ROLES,
  '/returns': ALL_ROLES,

  // Services
  '/services-management': ALL_ROLES,
  '/service-orders': ALL_ROLES,

  // Marketing
  '/campaigns': ALL_ROLES,

  // System & Utilities
  '/extra': ALL_ROLES,
  '/lookup': ALL_ROLES,
  '/activity-logs': ALL_ROLES,
  '/transaction': ALL_ROLES,
  '/accounting': ALL_ROLES,
  '/employees': ALL_ROLES,
  '/settings': ALL_ROLES,
  '/hrm/my': ALL_ROLES,
  '/hrm/branch': ALL_ROLES,
  '/hrm/attendance': ALL_ROLES,
  '/hrm/sales-targets': ALL_ROLES,
  '/hrm/rewards-fines': ALL_ROLES,
  '/cash-sheet': ALL_ROLES,
};

/**
 * For now, allow any role to access any page.
 * We use a Proxy to return ALL_ROLES for any requested path.
 */
export const PAGE_ACCESS: Record<string, RoleSlug[]> = new Proxy(_PAGE_ACCESS, {
  get: (target, prop) => {
    // If the property is a string (a route), always return ALL_ROLES
    if (typeof prop === 'string') {
      return ALL_ROLES;
    }
    return (target as any)[prop];
  }
});

/**
 * Roles that bypass automated store scoping (skipStoreScope: true).
 * These roles have a global view across all locations.
 */
export const ROLES_SKIPPING_STORE_SCOPE: RoleSlug[] = ALL_ROLES;
