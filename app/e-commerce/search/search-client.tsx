'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import productService from '@/services/productService'; // adjust if your service name differs

type Props = {
  initialQuery: string;
};

export default function SearchClient({ initialQuery }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  const trimmed = useMemo(() => query.trim(), [query]);

  // keep URL in sync when user types/searches
  useEffect(() => {
    const q = trimmed;
    const url = q ? `/e-commerce/search?q=${encodeURIComponent(q)}` : `/e-commerce/search`;
    router.replace(url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trimmed]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);

      if (!trimmed) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        // 👉 Use the correct method from your productService
        // Example: productService.searchProducts({ q: trimmed })
        const res = await productService.searchProducts?.(trimmed);

        // If your API returns { data: [...] } or something different, adjust here
        const items = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : [];
        if (!cancelled) setResults(items);
      } catch (e: any) {
        if (!cancelled) setError(e?.response?.data?.message || 'Search failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [trimmed]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Search</h1>

      <div className="mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search products..."
          className="w-full border rounded-lg px-4 py-3"
        />
        <p className="text-sm opacity-70 mt-2">
          {trimmed ? `Showing results for “${trimmed}”` : 'Type something to search.'}
        </p>
      </div>

      {loading && <div>Searching…</div>}
      {error && <div className="text-red-600">{error}</div>}

      {!loading && !error && results.length === 0 && trimmed && (
        <div>No products found.</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {results.map((p: any) => (
          <div key={p.id} className="border rounded-xl p-3">
            <div className="font-medium line-clamp-2">{p.name}</div>
            <div className="text-sm opacity-70 mt-1">{p.price ? `${p.price} Tk` : ''}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
