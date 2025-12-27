import axios from '@/lib/axios';

export type BusinessHistoryCategory =
  | 'all'
  | 'product-dispatches'
  | 'orders'
  | 'purchase-orders'
  | 'store-assignments'
  | 'products';

export interface BusinessHistoryWho {
  id: number;
  type: string;
  name: string;
  email?: string;
}

export interface BusinessHistoryWhen {
  timestamp: string;
  formatted: string;
  human?: string;
}

export type BusinessHistoryChanges = Record<string, { from: any; to: any }>;

export interface BusinessHistoryWhat {
  action: string; // created|updated|deleted
  description: string;
  fields_changed?: string[];
  changes?: BusinessHistoryChanges;
  // some endpoints can add extra fields (old_store/new_store, defect_reason, etc.)
  [key: string]: any;
}

export interface BusinessHistorySubject {
  id: number;
  type: string;
  data?: any;
}

export interface ActivityLogEntry {
  id: number;
  category: Exclude<BusinessHistoryCategory, 'all'>;
  who: BusinessHistoryWho;
  when: BusinessHistoryWhen;
  what: BusinessHistoryWhat;
  subject: BusinessHistorySubject;
}

export interface ActivityLogParams {
  category?: BusinessHistoryCategory;
  date_from?: string; // YYYY-MM-DD
  date_to?: string; // YYYY-MM-DD
  event?: string; // created|updated|deleted
  per_page?: number;
  page?: number;
  /** Allow endpoint-specific filters (order_id, product_id, dispatch_id, etc.) */
  [key: string]: any;
}

// Backward/compat alias used by UI components
export type BusinessHistoryEntry = ActivityLogEntry;

type Paginated<T> = {
  data: T[];
  links?: any;
  meta?: any;
};

type StatsResponse = {
  total_activities: number;
  date_range?: { from: string; to: string };
  by_model?: Record<string, number>;
  by_event?: Record<string, number>;
  most_active_users?: Array<{ id: number; type: string; name: string; email?: string; activity_count: number }>;
};

const endpointForCategory: Record<Exclude<BusinessHistoryCategory, 'all'>, string> = {
  'product-dispatches': '/business-history/product-dispatches',
  orders: '/business-history/orders',
  'purchase-orders': '/business-history/purchase-orders',
  'store-assignments': '/business-history/store-assignments',
  products: '/business-history/products',
};

function normalizeEntry(category: Exclude<BusinessHistoryCategory, 'all'>, e: any): ActivityLogEntry {
  return {
    id: Number(e?.id),
    category,
    who: {
      id: Number(e?.who?.id ?? 0),
      type: String(e?.who?.type ?? ''),
      name: String(e?.who?.name ?? 'Unknown'),
      email: e?.who?.email ? String(e.who.email) : undefined,
    },
    when: {
      timestamp: String(e?.when?.timestamp ?? ''),
      formatted: String(e?.when?.formatted ?? e?.when?.timestamp ?? ''),
      human: e?.when?.human ? String(e.when.human) : undefined,
    },
    what: {
      action: String(e?.what?.action ?? ''),
      description: String(e?.what?.description ?? ''),
      fields_changed: Array.isArray(e?.what?.fields_changed) ? e.what.fields_changed : [],
      changes: e?.what?.changes && typeof e.what.changes === 'object' ? e.what.changes : {},
      ...(e?.what && typeof e.what === 'object' ? e.what : {}),
    },
    subject: {
      id: Number(e?.subject?.id ?? 0),
      type: String(e?.subject?.type ?? ''),
      data: e?.subject?.data,
    },
  };
}

async function fetchCategory(
  category: Exclude<BusinessHistoryCategory, 'all'>,
  params: ActivityLogParams
): Promise<Paginated<ActivityLogEntry>> {
  const url = endpointForCategory[category];
  // Pass through endpoint-specific filters (e.g., order_id, product_id, dispatch_id, etc.)
  const { category: _cat, ...rest } = params as any;
  const res = await axios.get(url, {
    params: {
      ...rest,
      per_page: params.per_page ?? 50,
      page: params.page ?? 1,
    },
  });

  const payload = res.data;
  const items = Array.isArray(payload?.data) ? payload.data : [];
  return {
    data: items.map((e: any) => normalizeEntry(category, e)),
    links: payload?.links,
    meta: payload?.meta,
  };
}

const activityService = {
  /**
   * Fetch business history entries.
   *
   * - If category is omitted or "all", it fetches the first page from all supported categories and merges them.
   * - If a specific category is provided, it fetches that endpoint only.
   */
  async getLogs(params: ActivityLogParams): Promise<Paginated<ActivityLogEntry>> {
    const category = params.category ?? 'all';
    if (category !== 'all') {
      return fetchCategory(category, params);
    }

    const cats: Exclude<BusinessHistoryCategory, 'all'>[] = [
      'orders',
      'product-dispatches',
      'purchase-orders',
      'store-assignments',
      'products',
    ];

    const results = await Promise.all(
      cats.map((c) => fetchCategory(c, { ...params, category: c }))
    );

    const merged = results.flatMap((r) => r.data);
    merged.sort((a, b) => (b.when.timestamp || '').localeCompare(a.when.timestamp || ''));

    return {
      data: merged,
      meta: {
        ...results[0]?.meta,
        combined: true,
        combined_categories: cats,
        combined_count: merged.length,
      },
    };
  },

  /** Preferred API name used in some UI: getHistory(category, params) */
  async getHistory(category: BusinessHistoryCategory, params: ActivityLogParams) {
    return this.getLogs({ ...params, category });
  },

  async getStatistics(date_from?: string, date_to?: string): Promise<StatsResponse> {
    const res = await axios.get('/business-history/statistics', {
      params: { date_from, date_to },
    });
    return res.data as StatsResponse;
  },
};

export default activityService;
