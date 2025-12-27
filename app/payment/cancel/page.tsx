import React, { Suspense } from 'react';
import CancelClient from './CancelClient';

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <CancelClient />
    </Suspense>
  );
}
