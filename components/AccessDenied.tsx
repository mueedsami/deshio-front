'use client';

import React from 'react';
import { ShieldAlert } from 'lucide-react';

export default function AccessDenied({
  title = "You don't have access to this page",
  description = 'Please contact an administrator if you believe this is a mistake.',
}: {
  title?: string;
  description?: string;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
          <ShieldAlert className="w-7 h-7 text-gray-700 dark:text-gray-200" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">{description}</p>
      </div>
    </div>
  );
}
