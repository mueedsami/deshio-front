'use client';
import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Download, 
  MapPin, 
  User, 
  Heart, 
  LogOut,
  ShoppingCart
} from 'lucide-react';

export default function AccountSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { logout } = useAuth();

  const menuItems = [
    { 
      id: 'dashboard', 
      label: 'Dashboard', 
      icon: LayoutDashboard, 
      path: '/e-commerce/my-account' 
    },
    { 
      id: 'shop', 
      label: 'Shop', 
      icon: ShoppingCart, 
      path: '/e-commerce/' 
    },
    { 
      id: 'orders', 
      label: 'Orders', 
      icon: ShoppingBag, 
      path: '/e-commerce/my-account/orders' 
    },
    { 
      id: 'downloads', 
      label: 'Downloads', 
      icon: Download, 
      path: '/e-commerce/my-account/downloads' 
    },
    { 
      id: 'addresses', 
      label: 'Addresses', 
      icon: MapPin, 
      path: '/e-commerce/my-account/addresses' 
    },
    { 
      id: 'account-details', 
      label: 'Account details', 
      icon: User, 
      path: '/e-commerce/my-account/account-details' 
    },
    { 
      id: 'wishlist', 
      label: 'Wishlist', 
      icon: Heart, 
      path: '/e-commerce/my-account/wishlist' 
    },
  ];

  const handleLogout = () => {
    logout();
  };

  const isActive = (path: string) => {
    // For shop, check if we're on homepage or category pages
    if (path === '/e-commerce/') {
      return pathname === '/e-commerce' || 
             pathname === '/e-commerce/' || 
             (pathname.startsWith('/e-commerce/') && !pathname.startsWith('/e-commerce/my-account'));
    }
    return pathname === path;
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">MY ACCOUNT</h2>
      </div>
      
      <nav className="p-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.id}
              onClick={() => router.push(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                active
                  ? 'bg-gray-100 text-gray-900 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} className={active ? 'text-red-700' : 'text-gray-500'} />
              <span>{item.label}</span>
            </button>
          );
        })}
        
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-gray-700 hover:bg-gray-50 transition-colors mt-2"
        >
          <LogOut size={20} className="text-gray-500" />
          <span>Logout</span>
        </button>
      </nav>
    </div>
  );
}