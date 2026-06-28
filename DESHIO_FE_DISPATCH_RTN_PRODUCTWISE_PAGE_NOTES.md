# Deshio Frontend Dispatch RTN Product-wise Repair Page

Route: `/inventory/dispatch-rtn-repair`

The page now shows full verification details, not only command output:

- product-wise cards;
- all batches for each product;
- all barcodes for each product;
- batch quantity vs computed barcode truth;
- stale `barcode_id` pointer reasons;
- RTN and dispatch-chain batch labels;
- barcode current store/status;
- barcode batch store mismatch;
- suggested target batch;
- individual dry-run and apply buttons per product.

The global repair section is still present, but the client-safe intended workflow is product-by-product.
