# Frontend confirmed order reopen/reconfirm workflow fix

## Changes
- Orders page:
  - Confirmed orders no longer show normal "Edit Order".
  - Confirmed orders show "Reopen for Edit".
  - Reopen calls `/api/order-management/orders/{id}/reopen-confirmed-for-edit`.
- Store Fulfillment page:
  - Fully scanned reopened orders show `Confirm Scanned Order`.
  - Partial orders show `Scan all items to confirm` and cannot be confirmed until all product barcodes are scanned.
  - The old ready-for-shipment button no longer performs partial auto-deduct behavior from the UI.
- Store fulfillment service:
  - Added `confirmScannedOrder(orderId)`.

## Workflow
Confirmed → Reopen for Edit → Assigned to Store → Edit → Scan missing barcodes if needed → Confirm Scanned Order → Confirmed.
