'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

export const dynamic = 'force-dynamic';

const getApiUrlBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  return raw.replace(/\/$/, '');
};

const getWebBaseUrl = () => {
  const api = getApiUrlBase();
  return api.replace(/\/api\/?$/, '');
};

export default function PurchaseOrderBackendAdminPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading...</div>}>
      <PurchaseOrderBackendAdminClientPage />
    </Suspense>
  );
}

function PurchaseOrderBackendAdminClientPage() {
  const searchParams = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const webBase = useMemo(() => getWebBaseUrl(), []);
  const [path, setPath] = useState('/admin/purchase-orders');

  // Allow deep-linking via /purchase-order/backend-admin?path=/admin/purchase-orders
  useEffect(() => {
    const qp = (searchParams.get('path') || '').trim();
    if (qp) setPath(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resolvedUrl = useMemo(() => {
    if (!webBase) return '';
    const p = (path || '').startsWith('/') ? path : `/${path || ''}`;
    return `${webBase}${p}`;
  }, [webBase, path]);

  const openInNewTab = () => {
    if (!resolvedUrl) return;
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer');
  };

  const quickLinks = useMemo(
    () => [
      { label: 'Purchase Orders (Blade)', path: '/admin/purchase-orders' },
      { label: 'PO CRUD (If exists)', path: '/purchase-orders' },
      { label: 'Vendors (Blade)', path: '/admin/vendors' },
      { label: 'Payments (Blade)', path: '/admin/payments' },
    ],
    []
  );

  return (
    <div className={`${darkMode ? 'dark' : ''} flex min-h-screen`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">PO Backend (Blade) Access</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This is a helper page to open backend Blade pages from the frontend.
              </p>
            </div>

            <button
              onClick={openInNewTab}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 text-sm"
            >
              <ExternalLink className="w-4 h-4" />
              Open in new tab
            </button>
          </div>

          {!webBase ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl p-4">
              <p className="font-semibold">NEXT_PUBLIC_API_URL is not set.</p>
              <p className="text-sm mt-1">
                Set it to your backend API base, e.g. <code>https://backend.example.com/api</code>. Then redeploy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left: Quick links */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Quick Links</h2>
                <div className="space-y-2">
                  {quickLinks.map((l) => (
                    <button
                      key={l.path}
                      onClick={() => setPath(l.path)}
                      className="w-full text-left px-3 py-2 rounded-lg bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/40 dark:hover:bg-gray-700 text-sm"
                    >
                      <span className="font-medium">{l.label}</span>
                      <span className="block text-xs text-gray-500 mt-0.5">{l.path}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Middle: Path input */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Path</h2>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Relative path on backend domain</label>
                    <input
                      value={path}
                      onChange={(e) => setPath(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholder="/admin/purchase-orders"
                    />
                  </div>
                  <button
                    onClick={openInNewTab}
                    className="mt-5 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                    title="Open selected path"
                  >
                    <LinkIcon className="w-4 h-4" />
                    Open
                  </button>
                </div>

                <div className="mt-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">Resolved URL</p>
                  <code className="block mt-1 px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-900 text-xs text-gray-800 dark:text-gray-100 break-all">
                    {resolvedUrl}
                  </code>
                </div>

                <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
                  <p>
                    If the iframe below is blank, your backend may block embedding (X-Frame-Options / CSP). Use <b>Open in new tab</b>.
                  </p>
                </div>
              </div>

              {/* Right: Embedded preview */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
                <h2 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Preview (iframe)</h2>
                <div className="rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 h-[520px]">
                  <iframe key={resolvedUrl} src={resolvedUrl} className="w-full h-full" title="Backend admin" />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
