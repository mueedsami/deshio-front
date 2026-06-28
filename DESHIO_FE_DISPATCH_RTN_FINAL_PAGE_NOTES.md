# Deshio Frontend Dispatch RTN Repair Page

The repair panel is now part of the real Deshio frontend, not a public backend HTML page.

## Route

`/inventory/dispatch-rtn-repair`

## Sidebar

Added under Inventory:

`Dispatch RTN Repair`

## What it checks

- RTN restore batches in selected window
- Barcodes still inside RTN restore batches
- Batch quantity / active / availability mismatches
- Stale `product_batches.barcode_id` pointers
- Fully received in-transit dispatches that need finalization

## Safe client flow

1. Open Inventory -> Dispatch RTN Repair.
2. Keep Last 3 days.
3. Load Summary.
4. Dry run products shown.
5. Apply products shown.

Global apply requires typing `REPAIR ALL`.
