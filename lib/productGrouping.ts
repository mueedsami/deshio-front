/**
 * Product Grouping Utilities
 * 
 * These functions help group individual product records into a single product
 * with variations, based on the naming convention:
 * [Base Name] - [Color] - [Size]
 */

import { getBaseProductName, getColorLabel, getSizeLabel } from './productNameUtils';

export interface ProductVariant {
  id: number;
  sku: string;
  color?: string;
  size?: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  in_stock: boolean;
  images?: Array<{
    id: number;
    url: string;
    is_primary: boolean;
  }>;
}

export interface GroupedProduct {
  id: number;
  name: string; // Base name without variations
  sku: string; // Base SKU
  description?: string;
  short_description?: string;
  category?: any;
  images: Array<{
    id: number;
    url: string;
    is_primary: boolean;
  }>;
  variants: ProductVariant[];
  min_price: number;
  max_price: number;
  in_stock: boolean;
  created_at?: string;
}

export interface UngroupedProduct {
  id: number;
  name: string;
  sku: string;
  description?: string;
  short_description?: string;
  selling_price: number;
  cost_price: number;
  stock_quantity: number;
  in_stock: boolean;
  images: Array<{
    id: number;
    url: string;
    is_primary: boolean;
  }>;
  category?: any;
  created_at?: string;
}

/**
 * Groups individual product records into products with variations
 * 
 * Example:
 * Input: [
 *   { name: "Nike Air Force - Black - 42", ... },
 *   { name: "Nike Air Force - Black - 44", ... },
 *   { name: "Nike Air Force - White - 42", ... }
 * ]
 * 
 * Output: [
 *   {
 *     name: "Nike Air Force",
 *     variants: [
 *       { color: "Black", size: "42", ... },
 *       { color: "Black", size: "44", ... },
 *       { color: "White", size: "42", ... }
 *     ]
 *   }
 * ]
 */
export function groupProductsByBaseName(products: UngroupedProduct[]): GroupedProduct[] {
  const grouped = new Map<string, GroupedProduct>();

  products.forEach(product => {
    const baseName = getBaseProductName(product.name);
    const color = getColorLabel(product.name);
    const size = getSizeLabel(product.name);

    if (!grouped.has(baseName)) {
      // Create new grouped product
      grouped.set(baseName, {
        id: product.id, // Use first variant's ID as product ID
        name: baseName,
        sku: extractBaseSku(product.sku),
        description: product.description,
        short_description: product.short_description,
        category: product.category,
        images: product.images,
        variants: [],
        min_price: product.selling_price,
        max_price: product.selling_price,
        in_stock: product.in_stock,
        created_at: product.created_at
      });
    }

    const group = grouped.get(baseName)!;

    // Add this product as a variant
    group.variants.push({
      id: product.id,
      sku: product.sku,
      color,
      size,
      selling_price: product.selling_price,
      cost_price: product.cost_price,
      stock_quantity: product.stock_quantity,
      in_stock: product.in_stock,
      images: product.images
    });

    // Update price range
    group.min_price = Math.min(group.min_price, product.selling_price);
    group.max_price = Math.max(group.max_price, product.selling_price);

    // Update stock status
    if (product.in_stock) {
      group.in_stock = true;
    }

    // Use the primary image from the first in-stock variant if available
    if (product.in_stock && product.images.length > 0) {
      const primaryImage = product.images.find(img => img.is_primary);
      if (primaryImage) {
        group.images = product.images;
      }
    }
  });

  return Array.from(grouped.values());
}

/**
 * Extracts the base SKU from a variant SKU
 * Example: "NIKE-AF-BLK-42" → "NIKE-AF"
 */
function extractBaseSku(sku: string): string {
  const parts = sku.split('-');
  // Assume last 1-2 parts are variant-specific
  return parts.slice(0, -2).join('-') || sku;
}

/**
 * Gets unique colors from variants
 */
export function getAvailableColors(variants: ProductVariant[]): string[] {
  return [...new Set(variants
    .map(v => v.color)
    .filter((c): c is string => !!c)
  )];
}

/**
 * Gets unique sizes from variants
 */
export function getAvailableSizes(variants: ProductVariant[]): string[] {
  return [...new Set(variants
    .map(v => v.size)
    .filter((s): s is string => !!s)
  )];
}

/**
 * Gets variants matching the selected color
 */
export function getVariantsByColor(variants: ProductVariant[], color: string): ProductVariant[] {
  return variants.filter(v => v.color === color);
}

/**
 * Gets variants matching the selected size
 */
export function getVariantsBySize(variants: ProductVariant[], size: string): ProductVariant[] {
  return variants.filter(v => v.size === size);
}

/**
 * Gets a specific variant by color and size
 */
export function getVariantByColorAndSize(
  variants: ProductVariant[],
  color?: string,
  size?: string
): ProductVariant | undefined {
  return variants.find(v => {
    const colorMatch = !color || v.color === color;
    const sizeMatch = !size || v.size === size;
    return colorMatch && sizeMatch;
  });
}

/**
 * Gets the default variant (first in-stock variant, or first variant if none in stock)
 */
export function getDefaultVariant(variants: ProductVariant[]): ProductVariant | undefined {
  return variants.find(v => v.in_stock) || variants[0];
}

/**
 * Sorts sizes in a logical order
 */
export function sortSizes(sizes: string[]): string[] {
  const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL'];
  
  return sizes.sort((a, b) => {
    // Try standard size order first
    const aIndex = sizeOrder.indexOf(a.toUpperCase());
    const bIndex = sizeOrder.indexOf(b.toUpperCase());
    
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }
    
    // If both are numeric, sort numerically
    const aNum = parseInt(a);
    const bNum = parseInt(b);
    
    if (!isNaN(aNum) && !isNaN(bNum)) {
      return aNum - bNum;
    }
    
    // Otherwise sort alphabetically
    return a.localeCompare(b);
  });
}
