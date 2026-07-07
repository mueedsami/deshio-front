# Deshio FE — Purchase Order Report Frontend Fix

## Problem
- The purchase-order list page had a PO PDF button that opened the backend API URL directly.
- The `/purchase-order/reports` page generated backend PDF links, so reports could show stale/wrong PO information and looked disconnected from the frontend.

## Fix
- Added `lib/purchaseOrderReportHtml.ts` to generate PO report HTML in the frontend from live API data.
- Updated `/purchase-order` so the PO report button fetches the single PO details with `/api/purchase-orders/{id}` and opens a browser print/save-as-PDF report. It no longer opens `/api/purchase-orders/{id}/pdf`.
- Rebuilt `/purchase-order/reports` as a frontend live report page:
  - filters PO list with the existing `/api/purchase-orders` endpoint
  - shows totals and PO rows on the page
  - opens frontend summary print/save-as-PDF report
  - downloads displayed rows as CSV without backend PDF/CSV dependency
  - supports exact single PO report by PO ID or PO number

## Files changed
- `lib/purchaseOrderReportHtml.ts`
- `app/purchase-order/page.tsx`
- `app/purchase-order/reports/page.tsx`

## Deploy
No backend change is required.
