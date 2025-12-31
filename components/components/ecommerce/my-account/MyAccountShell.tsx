'use client';

import React from 'react';
import Navigation from '@/components/ecommerce/Navigation';
import AccountSidebar from '@/components/ecommerce/my-account/AccountSidebar';
import { useRequireCustomerAuth } from '@/contexts/CustomerAuthContext';

export default function MyAccountShell({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { isLoading } = useRequireCustomerAuth('/e-commerce/login');

  return (
    <div className="bg-white min-h-screen">
      <Navigation />
      <div className="flex max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <AccountSidebar />

        <div className="flex-1 ml-8">
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          {subtitle ? <p className="text-gray-600 mb-6">{subtitle}</p> : null}

          {isLoading ? (
            <div className="text-gray-600">Loading...</div>
          ) : (
            children
          )}
        </div>
      </div>
    </div>
  );
}
