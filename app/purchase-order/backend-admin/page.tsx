'use client';

import { useMemo, useState } from 'react';
import { ExternalLink, Link as LinkIcon } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';

const getApiUrlBase = () => {
  const raw = process.env.NEXT_PUBLIC_API_URL || '';
  return raw.replace(/\/$/, '');
};

const getWebBaseUrl = () => {
  const api = getApiUrlBase();
  // if NEXT_PUBLIC_API_URL = https://domain.com/api => web = https://domain.com
  return api.replace(/\/api\/?$/, '');
};

export default function PurchaseOrderBackendAdminPage() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  const webBase = useMemo(() => getWebBaseUrl(), []);
  const [path, setPath] = useState('/admin/purchase-orders');

  const fullUrl = useMemo(() => {
    if (!webBase) return '';
    return `${webBase}${path.startsWith('/') ? path : `/${path}`}`;
  }, [webBase, path]);

  const openExternal = (url: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className={`${darkMode ? 'dark' : ''} flex min-h-screen`}>
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
      <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors">
        <Header
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />

        <main className="p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100">PO Backend (Blade) Views</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                This page helps you open the legacy Laravel Blade screens (often used for hard delete / legacy admin actions).
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => openExternal(fullUrl)}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-900 transition-colors"
                title="Open in new tab"
              >
                <ExternalLink className="w-4 h-4" />
                Open
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-4 border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Backend URL path
                </label>
                <input
                  value={path}
                  onChange={(e) => setPath(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="/admin/purchase-orders"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Quick links
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPath('/admin/purchase-orders')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                  >
                    <LinkIcon className="w-4 h-4" />
                    /admin
                  </button>
                  <button
                    onClick={() => setPath('/purchase-orders')}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm"
                  >
                    <LinkIcon className="w-4 h-4" />
                    /purchase-orders
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 text-xs text-gray-600 dark:text-gray-400">
              Web base detected from <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">{process.env.NEXT_PUBLIC_API_URL || 'NEXT_PUBLIC_API_URL is not set'}</code>.
              If your backend uses a different domain for web routes, set NEXT_PUBLIC_API_URL accordingly (e.g. https://backend.yourdomain.com/api).
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                Embedded preview (may be blocked by backend headers)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[60%]">{fullUrl || '—'}</p>
            </div>

            {fullUrl ? (
              <iframe
                src={fullUrl}
                className="w-full h-[78vh] bg-white"
                // If backend blocks embedding, user can still open in new tab
                sandbox="allow-forms allow-same-origin allow-scripts allow-popups"
              />
            ) : (
              <div className="p-6 text-sm text-gray-700 dark:text-gray-300">
                Set <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-700">NEXT_PUBLIC_API_URL</code> first so we can build the backend URL.
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
