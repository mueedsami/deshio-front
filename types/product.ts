// types/product.ts

// Reusable constant for placeholder images
export const FALLBACK_IMAGE_URL =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0MDAiIGhlaWdodD0iNDAwIiB2aWV3Qm94PSIwIDAgNDAwIDQwMCI+PHJlY3Qgd2lkdGg9IjQwMCIgaGVpZ2h0PSI0MDAiIGZpbGw9IiNlNWU3ZWIiLz48ZyBmaWxsPSJub25lIiBzdHJva2U9IiM5Y2EzYWYiIHN0cm9rZS13aWR0aD0iMTAiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIgb3BhY2l0eT0iMC45Ij48cmVjdCB4PSI5MCIgeT0iOTAiIHdpZHRoPSIyMjAiIGhlaWdodD0iMTgwIiByeD0iMTYiLz48cGF0aCBkPSJNMTIwIDI0MGw1NS01NSA0NSA0NSA1NS03MCA1NSA4MCIvPjxjaXJjbGUgY3g9IjI0NSIgY3k9IjE1NSIgcj0iMjAiLz48L2c+PHRleHQgeD0iMjAwIiB5PSIzMjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM2YjcyODAiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyOCI+Tm8gSW1hZ2U8L3RleHQ+PC9zdmc+';

// Represents a single variant of a product (e.g., color/size)
export interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  variation_suffix?: string;
  image?: string | null;
  stockQuantity?: number | null;
  onlineStockQuantity?: number | null;
  offlineStockQuantity?: number | null;
}

export interface ProductGroup {
  sku: string;
  baseName: string;
  totalVariants: number;
  variants: ProductVariant[];
  primaryImage: string | null;
  categoryPath: string;
  category_id: number; // required
  hasVariations: boolean;
  // Optional UI metadata (not required by backend)
  vendorId?: number;
  vendorName?: string | null;
  sellingPrice?: number | null;
  inStock?: boolean | null;
  stockQuantity?: number | null;
  onlineStockQuantity?: number | null;
  offlineStockQuantity?: number | null;
}


// Represents dynamic field-value pairs attached to products
export interface FieldValue {
  fieldId: number;
  fieldName: string;
  fieldType: string;
  value: any;
  instanceId: string;
}

// Represents selected categories (id → name or slug)
export interface CategorySelectionState {
  [key: string]: string;
}

// Represents temporary variation data while editing/adding
export interface VariationData {
  id: string;
  color: string;
  images: File[];
  imagePreviews: string[];
  sizes: string[];
}
