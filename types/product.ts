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
  base_name: string;
  representative_id: number;
  category: {
    id: number;
    title: string;
  };
  vendor: string;
  variation_count: number;
  price_range: {
    min: number;
    max: number;
  };
  total_stock: number;
  primary_image: string | null;
  // UI legacy support (optional/deprecated)
  variants?: ProductVariant[];
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
