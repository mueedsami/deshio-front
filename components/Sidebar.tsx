'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Store,
  FolderTree,
  Package,
  ClipboardList,
  CreditCard,
  ShoppingCart,
  Image,
  X,
  AlertTriangle,
  Truck,
} from 'lucide-react';
import { useState } from 'react';
// ──────────────────────────────
// Perfect discriminated union
// ──────────────────────────────
type MenuItem =
  | {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      href: string;
    }
  | {
      icon: React.ComponentType<{ className?: string }>;
      label: string;
      subMenu: { label: string; href: string }[];
    };

// ──────────────────────────────
// Props
// ──────────────────────────────
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function Sidebar({ isOpen, setIsOpen }: SidebarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleSubMenu = (label: string) => {
    setOpenMenu((prev) => (prev === label ? null : label));
  };

  const menuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
    { icon: Store, label: 'Store', href: '/store' },
    { icon: FolderTree, label: 'Category', href: '/category' },
    { icon: Truck,
       label: 'Vendor Management',
       subMenu:[
        { label: 'Vendor Payment', href: '/vendor' },
        { label: 'Purchase Order', href: '/purchase-order' },
       ]
    },
    { icon: Image, label: 'Gallery', href: '/gallery' },
    {
      icon: Package,
      label: 'Product',
      subMenu: [
        { label: 'Field', href: '/product/field' },
        { label: 'Product List', href: '/product/list' },
        { label: 'Batch', href: '/product/batch' },
      ],
    },
    {
      icon: ClipboardList,
      label: 'Inventory',
      subMenu: [
        { label: 'Manage Stock', href: '/inventory/manage_stock' },
        { label: 'View Inventory', href: '/inventory/view' },
      ],
    },
    { icon: ShoppingCart, label: 'Store Assingment', href: '/store-assingment' },
    { icon: ShoppingCart, label: 'Packing', href: '/store-fulfillment' },
    { icon: ShoppingCart, label: 'POS', href: '/pos' },
    { icon: ShoppingCart,
       label: 'Social Commerce',
       subMenu:[
        { label: 'Take Orders', href: '/social-commerce' },
        { label: 'Pack Orders', href: '/social-commerce/package' },
       ]
    },
    {icon: Package, label: 'Orders', href: '/orders' },
    { icon: ClipboardList, label: 'Purchase History', href: '/purchase-history' },
    { icon: AlertTriangle, label: 'Defect Panel', href: '/defects' },
    { icon: CreditCard, label: 'Transaction', href: '/transaction' },
    { icon: CreditCard, label: 'Accounting', href: '/accounting' },
    
    { icon: CreditCard, label: 'Employee Management', href: '/employees' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 h-16">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-black dark:bg-white rounded-lg flex items-center justify-center">
              <span className="text-white dark:text-black font-bold text-xl">E</span>
            </div>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">ERP Admin</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">Management Panel</p>
            </div>
          </div>

          {/* Close button (mobile only) */}
          <button
            onClick={() => setIsOpen(false)}
            className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Menu */}
        <nav className="flex-1 overflow-y-auto py-4 px-3">
          <p className="px-3 mb-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Main Menu
          </p>

          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const hasSubMenu = 'subMenu' in item;

              const isActive = hasSubMenu
                ? item.subMenu.some((sub) => sub.href === pathname)
                : 'href' in item && item.href === pathname;

              const isSubMenuOpen = openMenu === item.label;

              return (
                <li key={item.label}>
                  {/* Main Item */}
                  {hasSubMenu ? (
                    <button
                      onClick={() => toggleSubMenu(item.label)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left
                        ${isActive
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span>{item.label}</span>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${isSubMenuOpen ? 'rotate-90' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <Link
                      href={(item as { href: string }).href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all
                        ${isActive
                          ? 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span>{item.label}</span>
                    </Link>
                  )}

                  {/* Submenu */}
                  {hasSubMenu && isSubMenuOpen && (
                    <ul className="mt-2 ml-8 space-y-1">
                      {item.subMenu.map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href}
                            className={`block px-4 py-2 text-sm rounded-lg transition-all
                              ${pathname === sub.href
                                ? 'text-blue-600 dark:text-blue-400 font-medium bg-blue-50 dark:bg-blue-900/20'
                                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
}