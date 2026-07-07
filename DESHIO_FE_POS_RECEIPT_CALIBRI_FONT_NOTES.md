# Deshio FE - POS Receipt Calibri Font Update

Updated the POS receipt print template to force Calibri as the primary font.

Changed files:
- `lib/posReceiptHtml.ts`
- `lib/posReceiptHtml-2.ts`

What changed:
- Receipt body now uses `"Calibri", "Segoe UI", Arial, Helvetica, sans-serif`.
- Added a universal `*` rule inside the receipt print HTML so tables, totals, labels, and buttons inherit the same receipt font.

No backend change is required.
