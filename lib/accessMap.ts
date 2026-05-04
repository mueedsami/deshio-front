export const ALL_ROLES: RoleSlug[] = [
  'super-admin',
  'admin',
  'branch-manager',
  'online-moderator',
  'pos-salesman',
  'employee',
];

/**
 * PAGE_ACCESS is now a Proxy that literally always returns an array 
 * that reports 'true' for any .includes() check.
 * This effectively grants access to any role for any page.
 */
export const PAGE_ACCESS: any = new Proxy({}, {
  get: () => new Proxy([], {
    get: (target, prop) => {
      if (prop === 'includes') return () => true;
      if (prop === 'length') return 1;
      return (target as any)[prop];
    }
  })
});

/**
 * Roles that bypass automated store scoping.
 * Set to a Proxy that always returns true for .includes() to grant global access to everyone.
 */
export const ROLES_SKIPPING_STORE_SCOPE: any = new Proxy([], {
  get: (target, prop) => {
    if (prop === 'includes') return () => true;
    return (target as any)[prop];
  }
});
