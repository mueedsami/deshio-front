# Deshio Frontend: Dispatch RTN Repair Panel

## Added

- New frontend page:
  - `/inventory/dispatch-rtn-repair`
- New service:
  - `services/dispatchRtnRepairService.ts`
- Sidebar item under Inventory:
  - `Dispatch RTN Repair`

## Backend API expected

This page expects the backend repair API from the latest backend patch:

- `GET /api/dispatch-rtn-repair/summary?days=3&product_id=&batch=`
- `POST /api/dispatch-rtn-repair/run`

## Client-safe flow

1. Open `/inventory/dispatch-rtn-repair`.
2. Keep `Last 3 days` selected.
3. Click `Load Summary`.
4. Click `Dry run products shown`.
5. If output looks normal, click `Apply products shown`.

This avoids global repair and only repairs product IDs found in the loaded summary window.

## Global repair safety

`Apply current scope` with no product or batch filter is blocked unless the user types:

```text
REPAIR ALL
```

Use global repair only if you intentionally want to repair every `RTN-RESTORE-P...` affected product, not just the last few days.
