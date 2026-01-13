import { Suspense } from 'react';
import ProductListClient from './ProductListClient';

export default function ProductListPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading products…</div>}>
      <ProductListClient />
    </Suspense>
  );
}
