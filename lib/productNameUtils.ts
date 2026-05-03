// Utility helpers to keep product naming consistent across e-commerce pages.
// Goal: show the "group/base" product name while still allowing variant-level navigation.
//
// Supported naming patterns:
// 1) "Product Name - Red"
// 2) "Product Name - Red - XL"
// 3) "Product Name - 9"
// 4) "Product Name-ta1-18"
// 5) "Product Name-na-45-us-11"
// 6) "Product Name-fossil-not-applicable-38" (compact trailing numeric size)

const SIZE_TOKENS = new Set([
  'XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL', 'XXXXL',
  'FREE SIZE', 'FREESIZE', 'ONE SIZE', 'ONESIZE',
]);

const MARKET_SIZE_TOKENS = new Set(['US', 'EU', 'UK', 'BD', 'CM', 'MM']);

const normalize = (s: string) =>
  (s || '')
    // Normalize unicode dash variants to ASCII hyphen for reliable tokenization.
    .replace(/[‐‑‒–—−﹘﹣－]/g, '-')
    // Remove zero-width characters sometimes introduced by copy/paste.
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
const isNumeric = (s: string) => /^\d+$/.test(s.trim());
const isSizeToken = (s: string) => SIZE_TOKENS.has(s.trim().toUpperCase());

const extractMarketSizePairs = (value: string): string[] => {
  const text = normalize(value)
    .replace(/[|,;/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!text) return [];

  const pairs: string[] = [];
  const seen = new Set<string>();
  const re = /(US|EU|UK|BD|CM|MM)\s*[:\-]?\s*(\d{1,3}(?:\.\d+)?)/gi;
  let match: RegExpExecArray | null;

  while ((match = re.exec(text)) !== null) {
    const market = String(match[1] || '').toUpperCase();
    const size = String(match[2] || '').trim();
    if (!market || !size) continue;

    const key = `${market}-${size}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pairs.push(`${market} ${size}`);
  }

  // Useful fallback for values like "40 US 7" (EU is implied by footwear sizing).
  if (pairs.length > 0) {
    const hasUS = pairs.some((p) => p.startsWith('US '));
    const hasEU = pairs.some((p) => p.startsWith('EU '));

    if (hasUS && !hasEU) {
      const twoDigit = text.match(/\b(3\d|4\d|5\d|60)\b/);
      if (twoDigit) {
        const inferred = `EU ${twoDigit[1]}`;
        if (!seen.has(`EU-${twoDigit[1]}`)) {
          pairs.unshift(inferred);
        }
      }
    }
  }

  return pairs;
};

const hasMarketSize = (value: string): boolean => extractMarketSizePairs(value).length > 0;

const toMarketSizeLabel = (value: string): string | undefined => {
  const pairs = extractMarketSizePairs(value);
  if (!pairs.length) return undefined;
  return pairs.join(' / ');
};

const isNumericSize = (s: string) => {
  // Treat 2-3 digit numbers as size codes (e.g., 36, 38, 40, 42).
  // Single-digit numbers are typically variation/color codes in many catalogs.
  const t = s.trim();
  if (!/^\d{1,3}$/.test(t)) return false;
  const n = Number(t);
  return t.length >= 2 && n >= 20 && n <= 60;
};

const splitDashTokens = (value: string): string[] =>
  normalize(value)
    .split('-')
    .map((t) => t.trim())
    .filter(Boolean);

function isVariantLikeToken(token: string): boolean {
  const t = (token || '').trim();
  if (!t) return false;
  if (t.length > 8) return false;

  if (hasMarketSize(t)) return true;

  if (isSizeToken(t) || isNumericSize(t) || isNumeric(t)) return true;

  // Compact alphanumeric variation tokens (e.g., na, us, ta1, xl2)
  if (/^[A-Za-z]{1,4}\d{0,3}$/.test(t)) return true;

  // Mixed short token (e.g., 42EU)
  if (/^\d{1,3}[A-Za-z]{1,2}$/.test(t)) return true;

  return false;
}

function extractCompactSuffix(name: string): { base: string; suffixTokens: string[] } | null {
  const normalized = normalize(name);
  const tokens = splitDashTokens(normalized);

  if (tokens.length < 3) return null;

  let suffixCount = 0;
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (isVariantLikeToken(tokens[i])) {
      suffixCount += 1;
    } else {
      break;
    }
  }

  // Only treat as variation suffix when we have enough trailing variant-like tokens.
  // Example: "base-ta1-18", "base-na-45-us-11"
  if (suffixCount < 2) return null;

  const baseTokens = tokens.slice(0, tokens.length - suffixCount);
  if (baseTokens.length === 0) return null;

  return {
    base: baseTokens.join('-').trim(),
    suffixTokens: tokens.slice(tokens.length - suffixCount),
  };
}

/**
 * Handles names where only the last dash-token is numeric and acts as size,
 * but previous tokens are not short variation tokens.
 *
 * Examples:
 * - "Air Force 1 07 Fossil-not-applicable-38" -> base: "Air Force 1 07 Fossil-not-applicable", size: "38"
 */
function extractTrailingNumericSize(name: string): { base: string; size: string } | null {
  const tokens = splitDashTokens(name);
  if (tokens.length < 2) return null;

  const last = (tokens[tokens.length - 1] || '').trim();
  const prev = (tokens[tokens.length - 2] || '').trim();

  if (!/^\d{1,3}$/.test(last)) return null;

  const n = Number(last);
  if (!Number.isFinite(n)) return null;

  // Strong indicator: classic footwear sizes.
  if (isNumericSize(last)) {
    return { base: tokens.slice(0, -1).join('-').trim(), size: last };
  }

  // Fallback for catalogs that encode size like -7, -85, -95, etc.
  // Require at least 3 dash tokens (safer), OR a short previous token.
  const looksLikeVariantTail =
    tokens.length >= 3 ||
    isVariantLikeToken(prev) ||
    prev.length <= 4;

  if (!looksLikeVariantTail) return null;

  // Keep conservative range.
  if (n < 1 || n > 120) return null;

  return { base: tokens.slice(0, -1).join('-').trim(), size: last };
}

export function splitNameParts(name: string): string[] {
  return normalize(name)
    .split(' - ')
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * Returns base/mother product name.
 * - If explicitBaseName is passed (from backend), it is preferred.
 */
export function getBaseProductName(name: string, explicitBaseName?: string): string {
  const explicit = normalize(explicitBaseName || '');
  if (explicit) {
    const normalizedName = normalize(name || '');

    // Usually backend base_name is authoritative.
    // But when legacy rows accidentally store full variation name in base_name,
    // explicit can equal the full `name` value. In that case, continue parsing.
    if (!normalizedName || explicit !== normalizedName) {
      return explicit;
    }
  }

  const normalized = normalize(name);
  const parts = splitNameParts(normalized);

  if (parts.length > 1) {
    const last = parts[parts.length - 1];

    // Pattern: "Product - Color - Size"
    if ((isSizeToken(last) || isNumericSize(last)) && parts.length >= 3) {
      return parts.slice(0, -2).join(' - ').trim();
    }

    // Pattern: "Product - <something>" (color / variant label)
    return parts.slice(0, -1).join(' - ').trim();
  }

  // Compact pattern fallback:
  // "Product-na-45-us-11" -> "Product"
  // "Product-ta1-18" -> "Product"
  const compact = extractCompactSuffix(normalized);
  if (compact) return compact.base;

  // Trailing numeric variant fallback:
  // "Product-fossil-not-applicable-38" -> "Product-fossil-not-applicable"
  const trailingSize = extractTrailingNumericSize(normalized);
  if (trailingSize?.base) return trailingSize.base;

  return normalized;
}

export function getColorLabel(name: string): string | undefined {
  const normalized = normalize(name);
  const parts = splitNameParts(normalized);

  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    const secondLast = parts[parts.length - 2];

    // If last is size, color is previous part
    if (isSizeToken(last) || isNumericSize(last) || hasMarketSize(last)) {
      if (!secondLast) return undefined;
      if (isNumeric(secondLast) && Number(secondLast) <= 20) return `Color ${Number(secondLast)}`;
      return secondLast.trim();
    }

    // Last is numeric small => treat as color/variant code
    if (isNumeric(last) && Number(last) <= 20) return `Color ${Number(last)}`;

    // Last is typical color string
    if (!isSizeToken(last) && !hasMarketSize(last)) return last.trim();

    return undefined;
  }

  // Compact suffix fallback (no spaces around '-')
  const compact = extractCompactSuffix(normalized);
  if (!compact) return undefined;

  const suffix = compact.suffixTokens;
  const last = suffix[suffix.length - 1] || '';

  // For code pairs like TA1-18, treat full pair as color label
  if (suffix.length === 2) {
    return `${suffix[0]}-${suffix[1]}`;
  }

  // For longer suffix (e.g., na-45-us-11), keep everything except final size-like token as color label
  if (isSizeToken(last) || isNumericSize(last) || /^\d{1,3}$/.test(last)) {
    const colorPart = suffix.slice(0, -1).join('-').trim();
    return colorPart || undefined;
  }

  return suffix.join('-').trim() || undefined;
}

export function getSizeLabel(name: string): string | undefined {
  const normalized = normalize(name);
  const parts = splitNameParts(normalized);

  if (parts.length > 1) {
    const last = parts[parts.length - 1];
    if (isSizeToken(last) || isNumericSize(last)) return last.trim();

    const marketSize = toMarketSizeLabel(last);
    if (marketSize) return marketSize;

    return undefined;
  }

  // Fallback when the whole name carries market sizes without " - " separators,
  // e.g. "Air Max Black EU 40 US 7".
  const wholeNameMarketSize = toMarketSizeLabel(normalized);
  if (wholeNameMarketSize) return wholeNameMarketSize;

  // Compact suffix fallback (no spaces around '-')
  const compact = extractCompactSuffix(normalized);
  if (compact) {
    const suffix = compact.suffixTokens;
    const last = (suffix[suffix.length - 1] || '').trim();
    const prev = (suffix[suffix.length - 2] || '').trim().toUpperCase();

    if (isSizeToken(last) || isNumericSize(last)) return last;

    // Handle tokens like "...-us-11" as size 11
    if (/^\d{1,3}$/.test(last) && (MARKET_SIZE_TOKENS.has(prev) || suffix.length >= 3)) {
      return last;
    }
  }

  // Trailing numeric variant fallback (e.g., ...-38)
  const trailingSize = extractTrailingNumericSize(normalized);
  if (trailingSize?.size) return trailingSize.size;

  return undefined;
}
