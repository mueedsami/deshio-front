'use client';

import React from 'react';
import MyAccountShell from '@/components/ecommerce/my-account/MyAccountShell';

export default function MyAccountDownloadsPage() {
  return (
    <MyAccountShell
      title="Downloads"
      subtitle="Downloadable products will appear here (if enabled)."
    >
      <div className="border rounded-lg p-4 text-sm text-gray-600">
        No downloads available.
      </div>
    </MyAccountShell>
  );
}
