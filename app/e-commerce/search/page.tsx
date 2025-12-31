import { Suspense } from 'react';
import SearchClient from './search-client';

export default function SearchPage({
  searchParams,
}: {
  searchParams?: { q?: string };
}) {
  const initialQuery = typeof searchParams?.q === 'string' ? searchParams.q : '';

  return (
    <Suspense fallback={<div className="p-6">Loading...</div>}>
      <SearchClient initialQuery={initialQuery} />
    </Suspense>
  );
}
