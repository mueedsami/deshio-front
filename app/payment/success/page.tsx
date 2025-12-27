import React, { Suspense } from 'react';
import SuccessClient from './SuccessClient';

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <SuccessClient />
    </Suspense>
  );
}
