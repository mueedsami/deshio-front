const LOCAL_FRONTEND_PATH_PREFIXES = [
  '/placeholder',
  '/icons/',
  '/logos/',
  '/favicon',
  '/_next/',
];

const BACKEND_MEDIA_FOLDERS = [
  'categories',
  'category',
  'products',
  'product-images',
  'collections',
  'homepage',
];

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function stripApiSegment(value: string): string {
  return value.replace(/\/api(?:\/v\d+)?\/?$/i, '');
}

/**
 * Returns backend origin URL for serving media assets.
 * Priority: NEXT_PUBLIC_API_URL -> NEXT_PUBLIC_BACKEND_URL -> NEXT_PUBLIC_BASE_URL.
 * If value ends with /api, it is removed.
 */
export function getBackendOrigin(): string {
  const raw = String(
    process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      ''
  ).trim();

  if (!raw) return '';

  const withoutTrailing = trimTrailingSlash(raw);
  return stripApiSegment(withoutTrailing);
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function hasProtocolRelativeUrl(value: string): boolean {
  return /^\/\//.test(value);
}

function isFrontendPlaceholder(value: string): boolean {
  return /^\/(?:images\/)?placeholder-product\.(?:png|jpe?g|webp|svg)$/i.test(value) ||
    /^\/placeholder-product\.(?:png|jpe?g|webp|svg)$/i.test(value) ||
    /^\/placeholder\.(?:png|jpe?g|webp|svg)$/i.test(value);
}

function shouldKeepAsLocalFrontendPath(value: string): boolean {
  return isFrontendPlaceholder(value) || LOCAL_FRONTEND_PATH_PREFIXES.some((prefix) => value.startsWith(prefix));
}

function encodePath(path: string): string {
  return path.split('/').map((part) => {
    try {
      return encodeURIComponent(decodeURIComponent(part));
    } catch {
      return encodeURIComponent(part);
    }
  }).join('/');
}

/**
 * Converts legacy/public-storage media paths into the backend API media endpoint.
 * This prevents Next/Vercel from trying to load backend uploads from the frontend
 * public folder.
 */
function normalizeBackendMediaPath(inputPath: string): string {
  let path = inputPath.replace(/^['"]|['"]$/g, '').trim();
  if (!path) return '';

  path = path.replace(/^\/api\/storage\//i, '/storage/');
  path = path.replace(/^api\/storage\//i, 'storage/');

  if (/^\/?api\/media\//i.test(path)) {
    const mediaPath = path.replace(/^\/?api\/media\//i, '');
    return `/api/media/${encodePath(mediaPath)}`;
  }

  if (/^\/?storage\//i.test(path)) {
    let mediaPath = path.replace(/^\/?storage\//i, '');
    mediaPath = mediaPath.replace(/^category\//i, 'categories/');
    return `/api/media/${encodePath(mediaPath)}`;
  }

  const withoutLeadingSlash = path.replace(/^\/+/, '');
  const firstSegment = withoutLeadingSlash.split('/')[0]?.toLowerCase();
  if (BACKEND_MEDIA_FOLDERS.includes(firstSegment)) {
    const mediaPath = withoutLeadingSlash.replace(/^category\//i, 'categories/');
    return `/api/media/${encodePath(mediaPath)}`;
  }

  return path.startsWith('/') ? path : `/${path}`;
}

/**
 * Converts relative media paths to absolute backend URLs.
 * Leaves data/blob URLs and known local frontend placeholders unchanged.
 */
export function toAbsoluteAssetUrl(value?: string | null): string {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (raw.startsWith('data:') || raw.startsWith('blob:')) {
    return raw;
  }

  if (hasProtocolRelativeUrl(raw)) {
    if (typeof window !== 'undefined' && window.location?.protocol) {
      return `${window.location.protocol}${raw}`;
    }
    return `https:${raw}`;
  }

  const backendOrigin = getBackendOrigin();

  if (isAbsoluteHttpUrl(raw)) {
    try {
      const url = new URL(raw);
      const normalizedPath = normalizeBackendMediaPath(url.pathname);
      if (/^\/api\/media\//i.test(normalizedPath)) {
        return `${backendOrigin || url.origin}${normalizedPath}`;
      }
    } catch {
      return raw;
    }
    return raw;
  }

  if (shouldKeepAsLocalFrontendPath(raw)) {
    return raw;
  }

  const path = normalizeBackendMediaPath(raw);

  if (!backendOrigin) return path;
  return `${backendOrigin}${path.startsWith('/') ? path : `/${path}`}`;
}
