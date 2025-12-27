'use client';

import React from 'react';
import { CustomerAuthProvider } from '@/contexts/CustomerAuthContext';

export default function PaymentLayout({ children }: { children: React.ReactNode }) {
  return <CustomerAuthProvider>{children}</CustomerAuthProvider>;
}
