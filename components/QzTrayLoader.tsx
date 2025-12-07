'use client';

import Script from 'next/script';

export default function QZTrayLoader() {
  return (
    <>
      {/* JsBarcode library */}
      <Script
        src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"
        strategy="beforeInteractive"
      />
      
      {/* QZ Tray client library */}
      <Script
        src="https://cdn.jsdelivr.net/npm/qz-tray@2.2.4/qz-tray.js"
        strategy="afterInteractive"
        onLoad={() => {
          console.log('✅ QZ Tray script loaded successfully');
          console.log('QZ Tray available:', typeof window !== 'undefined' && !!(window as any).qz);
        }}
        onError={(e) => {
          console.error('❌ Failed to load QZ Tray script:', e);
        }}
      />
    </>
  );
}