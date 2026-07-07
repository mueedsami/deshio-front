# Deshio FE Preorders Page Visibility Fix

## Problem
`/preorders` used the general orders service and only checked the first large page of orders. Preorders could be absent from that page, so the UI showed no preorder rows.

## Fix
`/preorders` now loads from `GET /api/pre-orders` and maps the backend preorder response into the existing table/detail modal.

## Changed file
- `app/preorders/page.tsx`
