import api from '@/lib/axios';

export type HomepageSectionType =
  | 'hero_banner'
  | 'collection_tiles'
  | 'bannered_collections'
  | 'new_arrivals'
  | 'category_tabs'
  | 'instagram_reels';

export interface HomepageSection {
  id: number;
  type: HomepageSectionType;
  title?: string | null;
  subtitle?: string | null;
  image?: string | null;
  image_url?: string | null;
  link_url?: string | null;
  button_text?: string | null;
  settings?: any;
  sort_order: number;
  is_active: boolean;
}

const apiBase = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/api\/?$/i, '').replace(/\/$/, '');
const appBase = (process.env.NEXT_PUBLIC_BASE_URL || '').replace(/\/$/, '');
const assetBase = apiBase || appBase || '';

const normalizeAsset = (value?: string | null) => {
  if (!value) return value || null;
  if (/^(https?:)?\/\//i.test(value) || /^data:/i.test(value) || /^blob:/i.test(value)) return value;
  const path = value.startsWith('/') ? value : `/${value}`;
  if (!assetBase) return path;
  return `${assetBase}${path}`;
};

const normalizeSettings = (value: any) => {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (_err) {
      return {};
    }
  }
  return value;
};

const normalizeSection = (raw: any): HomepageSection => ({
  id: Number(raw.id),
  type: raw.type,
  title: raw.title ?? '',
  subtitle: raw.subtitle ?? '',
  image: raw.image ?? null,
  image_url: normalizeAsset(raw.image_url || raw.image || null),
  link_url: raw.link_url ?? '',
  button_text: raw.button_text ?? '',
  settings: normalizeSettings(raw.settings),
  sort_order: Number(raw.sort_order ?? 0),
  is_active: Boolean(raw.is_active),
});

const normalizeList = (payload: any): HomepageSection[] => {
  const rows = Array.isArray(payload?.data) ? payload.data : (Array.isArray(payload) ? payload : []);
  return rows.map(normalizeSection).sort((a, b) => a.sort_order - b.sort_order || a.id - b.id);
};

const homepageService = {
  async getPublic(): Promise<HomepageSection[]> {
    const response = await api.get('/catalog/homepage-sections');
    return normalizeList(response.data);
  },

  async getAll(): Promise<HomepageSection[]> {
    const response = await api.get('/homepage-sections');
    return normalizeList(response.data);
  },

  async create(formData: FormData): Promise<HomepageSection> {
    const response = await api.post('/homepage-sections', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeSection(response.data?.data);
  },

  async update(id: number, formData: FormData): Promise<HomepageSection> {
    const response = await api.post(`/homepage-sections/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return normalizeSection(response.data?.data);
  },

  async delete(id: number): Promise<void> {
    await api.delete(`/homepage-sections/${id}`);
  },
};

export default homepageService;
