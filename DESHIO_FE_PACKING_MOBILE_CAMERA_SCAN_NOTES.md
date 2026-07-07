# Deshio FE — Mobile Camera Barcode Scan for Packing

## Added
- Reusable component: `components/barcode/MobileCameraBarcodeScanner.tsx`
- Added mobile/tablet camera scan option to:
  - `app/social-commerce/package/page.tsx`
  - `app/store-fulfillment/page.tsx`

## Behavior
- Existing USB/manual scanner flow remains unchanged.
- Staff can click **Scan with Mobile Camera** inside the packing scanner panel.
- Uses rear camera when available.
- Successful camera scans call the same existing `handleBarcodeScan()` logic.
- Duplicate camera reads are debounced for 1.5 seconds.
- Camera stops automatically when scanning is disabled, the item/order changes, or the component unmounts.

## Requirements
- Browser camera permission must be allowed.
- Camera scanning requires HTTPS or localhost.
- Existing dependency `html5-qrcode` is reused; no backend change required.
