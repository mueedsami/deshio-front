# Deshio FE - Social Commerce Invoice Order Date + Served By

Updated the Social Commerce invoice printed from the Orders page.

Changed file:
- `lib/socialInvoiceHtml.ts`

What changed:
- Added `Order Date` to the invoice details box.
- Added `Served By` to the invoice details box.
- `Served By` resolves from the moderator/sales actor available on the order payload, using these fallbacks:
  - `salesBy`
  - `created_by.name`
  - `createdBy.name`
  - `moderator.name`
  - `created_by_name`
  - `createdByName`
  - `salesman.name`
- This works for both single invoice print and bulk invoice print, because both use the shared `socialInvoiceHtml.ts` renderer.

No backend change is required if the order detail response already includes `salesman` / created-by actor information, which the current order detail response does.
