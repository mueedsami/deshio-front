// types/product.ts

// Reusable constant for placeholder images
export const FALLBACK_IMAGE_URL =
  'https://via.placeholder.com/400x400/e5e7eb/6b7280?text=No+Image';

// Represents a single variant of a product (e.g., color/size)
export interface ProductVariant {
  id: number;
  name: string;
  sku: string;
  color?: string;
  size?: string;
  image?: string | null;
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

  /**
   * Hybrid mode while old SKU-grouped products still exist:
   * - legacy_products: variations are separate Product rows grouped by SKU
   * - variants_table: parent Product row + variants live in product_variants table
   */
  variationModel?: 'legacy_products' | 'variants_table';
  /** Parent product id when variationModel === 'variants_table' */
  parentProductId?: number;
  /** Variants count from API when variationModel === 'variants_table' */
  variantsCount?: number | null;
  /** Total stock from API when variationModel === 'variants_table' */
  totalStock?: number | null;
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
