import { getBaseProductName, getColorLabel, getSizeLabel } from '@/lib/productNameUtils';
import type { CatalogGroupedProduct } from '@/services/catalogService';

export interface GroupedVariant {
  id: number;
  name: string;
  sku?: string;
  color?: string;
  size?: string;
  price: number;
  in_stock: boolean;
  stock_quantity: number;
  image: string;
  raw: any;
}

export interface GroupedProduct {
  key: string;
  baseName: string;
  representativeId: number;
  primaryImage: string;
  variants: GroupedVariant[];
  totalVariants: number;
  hasVariations: boolean;
  lowestPrice: number;
  highestPrice: number;
  inStock: boolean;
  totalStock: number;
  category?: { id: number; name: string } | null;
  representative: any;
}

export interface GroupingOptions {
  /**
   * Include category in grouping key.
   * Keep true for category/list pages.
   * Disable for home widgets where sibling variations may come with
   * inconsistent category shapes (object/string/null).
   */
  useCategoryInKey?: boolean;

  /**
   * Prefer SKU-level grouping when SKU is present.
   * This matches backend variation model where one mother product shares SKU.
   */
  preferSkuGrouping?: boolean;
}

const toNumber = (value: any): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

export function getProductPrimaryImage(product: any): string {
  const images = Array.isArray(product?.images) ? product.images : [];
  const primary = images.find((img: any) => !!img?.is_primary) || images[0];
  return primary?.url || '/placeholder-product.png';
}

/**
 * Sort an images array so the is_primary image always comes first.
 */
function sortImagesPrimaryFirst(imgs: any[]): any[] {
  if (!Array.isArray(imgs) || imgs.length <= 1) return imgs;
  const primaryIdx = imgs.findIndex((img: any) => !!img?.is_primary);
  if (primaryIdx <= 0) return imgs;
  const sorted = [...imgs];
  const [primary] = sorted.splice(primaryIdx, 1);
  sorted.unshift(primary);
  return sorted;
}

/**
 * Given a list of variant-level product objects, find the first non-empty
 * image array across all of them and return it — sorted primary-first.
 * Returns [] if none have images.
 */
function pickFallbackImages(variants: any[]): any[] {
  for (const v of variants) {
    const imgs = Array.isArray(v?.images) ? v.images : [];
    if (imgs.length > 0) return sortImagesPrimaryFirst(imgs);
  }
  return [];
}

/**
 * Apply the fallback image set (already sorted primary-first) to any variant
 * that has an empty images array.
 */
function applyImageFallback<T extends { images?: any[] }>(variants: T[], fallback: any[]): T[] {
  if (!fallback.length) return variants;
  return variants.map((v) =>
    Array.isArray(v.images) && v.images.length > 0
      ? { ...v, images: sortImagesPrimaryFirst(v.images) }
      : { ...v, images: fallback }
  );
}

export function getMotherBaseName(product: any): string {
  return getBaseProductName(product?.name || '', product?.base_name || undefined);
}

function getCategoryKey(product: any): string {
  const category = product?.category;

  if (category && typeof category === 'object' && category.id) {
    return `id:${String(category.id).trim()}`;
  }

  if (typeof category === 'string' && category.trim()) {
    return `name:${category.trim().toLowerCase()}`;
  }

  const fallbackName =
    product?.category_name ||
    product?.category_title ||
    product?.categoryPath ||
    '';

  if (typeof fallbackName === 'string' && fallbackName.trim()) {
    return `name:${fallbackName.trim().toLowerCase()}`;
  }

  return 'none';
}

function normalizeSku(value: any): string {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase();
}

function chooseGroupBaseName(products: any[], fallback: string): string {
  if (!Array.isArray(products) || products.length === 0) return fallback;

  const scored = new Map<string, { name: string; count: number; length: number }>();

  products.forEach((product: any) => {
    const parsed = getMotherBaseName(product).trim();
    if (!parsed) return;

    const key = parsed.toLowerCase();
    const existing = scored.get(key);
    if (existing) {
      existing.count += 1;
      // Keep shortest human-readable form as canonical label.
      if (parsed.length < existing.length) {
        existing.name = parsed;
        existing.length = parsed.length;
      }
    } else {
      scored.set(key, { name: parsed, count: 1, length: parsed.length });
    }
  });

  if (scored.size === 0) return fallback;

  const best = Array.from(scored.values()).sort((a, b) => {
    if (a.count !== b.count) return b.count - a.count;
    if (a.length !== b.length) return a.length - b.length;
    return a.name.localeCompare(b.name);
  })[0];

  return best?.name || fallback;
}

export function getMotherGroupKey(product: any, options: GroupingOptions = {}): string {
  const { useCategoryInKey = true, preferSkuGrouping = true } = options;
  const baseName = getMotherBaseName(product).toLowerCase();

  if (preferSkuGrouping) {
    const sku = normalizeSku(product?.sku);
    if (sku) {
      // SKU is the most reliable variation group id in backend design.
      return `sku:${sku}`;
    }
  }

  if (!useCategoryInKey) {
    return `base::${baseName}`;
  }

  return `cat:${getCategoryKey(product)}::base:${baseName}`;
}

export function groupProductsByMother(
  products: any[],
  options: GroupingOptions = {}
): GroupedProduct[] {
  const groups = new Map<string, GroupedProduct>();
  const productsByGroupKey = new Map<string, any[]>();

  (products || []).forEach((product: any) => {
    if (!product || typeof product !== 'object') return;

    const baseName = getMotherBaseName(product);
    const key = getMotherGroupKey(product, options);

    const list = productsByGroupKey.get(key) || [];
    list.push(product);
    productsByGroupKey.set(key, list);

    if (!groups.has(key)) {
      groups.set(key, {
        key,
        baseName,
        representativeId: product.id,
        primaryImage: getProductPrimaryImage(product),
        variants: [],
        totalVariants: 0,
        hasVariations: false,
        lowestPrice: toNumber(product?.selling_price),
        highestPrice: toNumber(product?.selling_price),
        inStock: !!product?.in_stock,
        totalStock: toNumber(product?.stock_quantity),
        category: product?.category || null,
        representative: product,
      });
    }

    const group = groups.get(key)!;

    const price = toNumber(product?.selling_price);
    const stockQty = toNumber(product?.stock_quantity);

    group.variants.push({
      id: Number(product.id),
      name: product.name || '',
      sku: product.sku,
      color: getColorLabel(product.name || ''),
      size: getSizeLabel(product.name || ''),
      price,
      in_stock: !!product.in_stock,
      stock_quantity: stockQty,
      image: getProductPrimaryImage(product),
      raw: product,
    });

    group.lowestPrice = Math.min(group.lowestPrice, price);
    group.highestPrice = Math.max(group.highestPrice, price);
    group.totalStock += stockQty;
    group.inStock = group.inStock || !!product.in_stock;

    // Prefer in-stock representative for navigation and thumbnail
    if (product?.in_stock && !group.representative?.in_stock) {
      group.representative = product;
      group.representativeId = Number(product.id);
      group.primaryImage = getProductPrimaryImage(product);
    }
  });

  return Array.from(groups.values()).map((group) => {
    const rawProducts = productsByGroupKey.get(group.key) || [];
    const canonicalBaseName = chooseGroupBaseName(rawProducts, group.baseName);

    const uniqueById = new Map<number, GroupedVariant>();
    group.variants.forEach((v) => {
      if (!uniqueById.has(v.id)) uniqueById.set(v.id, v);
    });

    const variants = Array.from(uniqueById.values()).sort((a, b) => {
      if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;

      const ac = (a.color || '').toLowerCase();
      const bc = (b.color || '').toLowerCase();
      if (ac !== bc) return ac.localeCompare(bc);

      const as = (a.size || '').toLowerCase();
      const bs = (b.size || '').toLowerCase();
      if (as !== bs) return as.localeCompare(bs);

      return a.id - b.id;
    });

    const representative = variants.find((v) => v.in_stock) || variants[0];

    // Propagate images: if representative has none, use any variant that does
    const allRaws = variants.map((v) => v.raw);
    const fallbackImgs = pickFallbackImages(allRaws);
    const representativeImage =
      (representative?.raw?.images?.length > 0
        ? representative.image
        : fallbackImgs.length > 0
        ? fallbackImgs[0]?.url || '/placeholder-product.png'
        : representative?.image) || '/placeholder-product.png';

    return {
      ...group,
      baseName: canonicalBaseName,
      variants,
      totalVariants: variants.length,
      hasVariations: variants.length > 1,
      representativeId: representative?.id || group.representativeId,
      primaryImage: representativeImage,
    };
  });
}

export function formatGroupedPrice(group: GroupedProduct): string {
  if (group.totalVariants > 1 && group.lowestPrice !== group.highestPrice) {
    return `৳${group.lowestPrice.toFixed(2)} - ৳${group.highestPrice.toFixed(2)}`;
  }
  const price = Number.isFinite(group.lowestPrice) ? group.lowestPrice : 0;
  return `৳${price.toFixed(2)}`;
}

/**
 * Convert backend grouped catalog payload into the existing GroupedProduct shape.
 * This lets the UI support the new API without refactoring every consumer at once.
 */
export function adaptCatalogGroupedProducts(
  groups: CatalogGroupedProduct[] = []
): GroupedProduct[] {
  return (groups || [])
    .map((group): GroupedProduct | null => {
      const main = group?.main_variant;
      if (!main) return null;

      const allVariantsRaw = [main, ...(group.variants || [])].filter(Boolean);
      const uniqueById = new Map<number, any>();
      allVariantsRaw.forEach((variant) => {
        if (!variant?.id) return;
        if (!uniqueById.has(variant.id)) uniqueById.set(variant.id, variant);
      });

      const allVariants = Array.from(uniqueById.values());

      // Apply cross-variant image fallback before building mapped variants
      const fallbackImgs = pickFallbackImages(allVariants);
      const allVariantsWithImages = applyImageFallback(allVariants, fallbackImgs);
      const mappedVariants: GroupedVariant[] = allVariantsWithImages.map((variant: any) => ({
        id: Number(variant.id),
        name: variant.name || '',
        sku: variant.sku,
        color: getColorLabel(variant.name || ''),
        size: getSizeLabel(variant.name || ''),
        price: toNumber(variant.selling_price),
        in_stock:
          typeof variant.in_stock === 'boolean'
            ? variant.in_stock
            : toNumber(variant.stock_quantity) > 0,
        stock_quantity: toNumber(variant.stock_quantity),
        image: getProductPrimaryImage(variant),
        raw: variant,
      }));

      mappedVariants.sort((a, b) => {
        if (a.in_stock !== b.in_stock) return a.in_stock ? -1 : 1;
        const ac = (a.color || '').toLowerCase();
        const bc = (b.color || '').toLowerCase();
        if (ac !== bc) return ac.localeCompare(bc);
        const as = (a.size || '').toLowerCase();
        const bs = (b.size || '').toLowerCase();
        if (as !== bs) return as.localeCompare(bs);
        return a.id - b.id;
      });

      const representative = mappedVariants.find((v) => v.in_stock) || mappedVariants[0];

      const prices = mappedVariants.map((v) => v.price);
      const lowestPrice = prices.length ? Math.min(...prices) : 0;
      const highestPrice = prices.length ? Math.max(...prices) : 0;
      const totalStock = mappedVariants.reduce((sum, v) => sum + toNumber(v.stock_quantity), 0);
      const inStock = mappedVariants.some((v) => v.in_stock);

      return {
        key: `group:${(group.base_name || main.base_name || getMotherBaseName(main)).toLowerCase()}::${main.id}`,
        baseName: group.base_name || getMotherBaseName(main),
        representativeId: representative?.id || Number(main.id),
        primaryImage: representative?.image || getProductPrimaryImage(main),
        variants: mappedVariants,
        totalVariants: mappedVariants.length,
        hasVariations: Boolean(group.has_variants || mappedVariants.length > 1),
        lowestPrice,
        highestPrice,
        inStock,
        totalStock,
        category:
          (group.category as any) ||
          (typeof main.category === 'object'
            ? ({ id: main.category.id || 0, name: main.category.name || '' } as any)
            : null),
        representative: representative?.raw || main,
      };
    })
    .filter((group): group is GroupedProduct => Boolean(group));
}