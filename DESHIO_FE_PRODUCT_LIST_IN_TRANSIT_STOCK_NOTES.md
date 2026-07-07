# Deshio Frontend Product List In-Transit Stock Visibility

Updated `/product/list` to display dispatch-moving stock separately from available sellable stock.

New UI labels:

- `Available`: actual sellable batch stock
- `In Dispatch`: barcodes currently in `in_shipment` or `in_transit`
- `In Transit`: sent barcodes in transit
- `Scan Hold`: scanned into dispatch but not sent yet
- `Available + Dispatch`: visibility total so stock does not look lost

Updated files:

- `app/product/list/ProductListClient.tsx`
- `components/ProductListItem.tsx`
- `services/productService.ts`
- `types/product.ts`
