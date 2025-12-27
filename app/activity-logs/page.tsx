import { Suspense } from 'react';
import ActivityLogsClient from './ActivityLogsClient';

/**
 * NOTE (Next.js App Router):
 * This page wraps the client component in a Suspense boundary because
 * ActivityLogsClient uses useSearchParams().
 */
export default function ActivityLogsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
          <div className="text-sm text-gray-600 dark:text-gray-300">Loading activity log...</div>
        </div>
      }
    >
      <ActivityLogsClient />
    </Suspense>
  );
}
