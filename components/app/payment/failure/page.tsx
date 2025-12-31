import React, { Suspense } from 'react';
import FailureClient from './FailureClient';

export default function PaymentFailurePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <FailureClient />
    </Suspense>
  );
}
