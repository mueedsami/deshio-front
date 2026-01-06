// Utility helpers to keep product naming consistent across e-commerce pages.
// Goal: show the "group/base" product name (same as admin Product List) while still
// allowing variant-level navigation.
//
// Common patterns we support:
// - "Product Name - Red"
// - "Product Name - Red - XL"
// - "Product Name - 9"   (numeric variant code -> treat as color/variant label, not size)
//
// NOTE: We intentionally treat *single-digit* numeric suffixes (1..20) as variant/color codes,
// because many catalogs use numbering for colorways/designs.

const SIZE_TOKENS = new Set([
  'XS','S','M','L','XL','XXL','XXXL','XXXXL',
  'FREE SIZE','FREESIZE','ONE SIZE','ONESIZE',
]);

const isNumeric = (s: string) => /^\d+$/.test(s.trim());
const isSizeToken = (s: string) => SIZE_TOKENS.has(s.trim().toUpperCase());

const isNumericSize = (s: string) => {
  // Treat 2-3 digit numbers as size codes (e.g., 36, 38, 40, 42).
  // Single-digit numbers are treated as variant/color codes.
  const t = s.trim();
  if (!/^\d{1,3}$/.test(t)) return false;
  const n = Number(t);
  return t.length >= 2 && n >= 20 && n <= 60;
};

export function splitNameParts(name: string): string[] {
  return (name || '')
    .split(' - ')
    .map(p => p.trim())
    .filter(Boolean);
}

export function getBaseProductName(name: string): string {
  const parts = splitNameParts(name);
  if (parts.length <= 1) return (name || '').trim();

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];

  // Pattern: "Product - Color - Size"
  if ((isSizeToken(last) || isNumericSize(last)) && parts.length >= 3) {
    return parts.slice(0, -2).join(' - ').trim();
  }

  // Pattern: "Product - <something>" (color, numeric variant, etc.)
  return parts.slice(0, -1).join(' - ').trim();
}

export function getColorLabel(name: string): string | undefined {
  const parts = splitNameParts(name);
  if (parts.length <= 1) return undefined;

  const last = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];

  // If last is a size, color is the previous part
  if (isSizeToken(last) || isNumericSize(last)) {
    if (!secondLast) return undefined;
    if (isNumeric(secondLast) && Number(secondLast) <= 20) return `Color ${Number(secondLast)}`;
    return secondLast.trim();
  }

  // Last is numeric small => treat as color/variant code
  if (isNumeric(last) && Number(last) <= 20) return `Color ${Number(last)}`;

  // Last is a typical color string
  if (!isSizeToken(last)) return last.trim();

  return undefined;
}

export function getSizeLabel(name: string): string | undefined {
  const parts = splitNameParts(name);
  if (parts.length <= 1) return undefined;

  const last = parts[parts.length - 1];
  if (isSizeToken(last) || isNumericSize(last)) return last.trim();
  return undefined;
}
