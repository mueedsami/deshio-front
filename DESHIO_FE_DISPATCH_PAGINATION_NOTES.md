# Deshio FE - Dispatch Page Pagination

Updated the Inventory > Outlet Stock / Dispatch Management page to use the backend paginated dispatch API.

Changed files:
- `app/inventory/outlet-stock/page.tsx`

What changed:
- Sends `page` and `per_page` to `GET /api/dispatches`.
- Reads Laravel pagination metadata: `current_page`, `last_page`, `from`, `to`, `total`, `per_page`.
- Shows a pagination footer under the dispatch table.
- Added Previous / Next and numbered page buttons.
- Added per-page selector: 10, 20, 50, 100.
- Resets to page 1 when search/status/source/destination filters change.
- Keeps compatibility with older non-paginated response shapes.

Backend note:
- No backend change was needed because the Deshio backend dispatch index already supports `page` and `per_page`.
