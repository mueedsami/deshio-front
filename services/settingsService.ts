import axiosInstance from '@/lib/axios';
import { toAbsoluteAssetUrl } from '@/lib/assetUrl';

export interface ShowcaseCategory {
  category_id: number;
  subcategories: number[];
  product_ids_by_category?: Record<string, number[]>;
  product_data_by_category?: Record<string, any[]>;
}

export interface HomepageSettings {
  ticker: {
    enabled: boolean;
    mode: 'static' | 'moving';
    phrases: string[];
    background_color?: string;
    text_color?: string;
    speed?: number;
  };
  hero: {
    images: { url: string; path?: string }[];
    title: string;
    show_title: boolean;
    slideshow_enabled?: boolean;
    autoplay_speed?: number;
    text_position?: string;
    text_color?: string;
    font_size?: number;
    transition_type?: 'fade' | 'slide';
  };
  collections: {
    id: number;
    type?: 'category' | 'collection';
    title?: string;
    subtitle: string;
    image?: string;
    href?: string;
    show_text?: boolean;
  }[];
  showcase?: ShowcaseCategory[];
  new_arrivals?: {
    enabled: boolean;
    product_ids: number[];
    products?: any[];
  };
  bannered_collections?: {
    id: number;
    type: 'category' | 'collection';
    title?: string;
    subtitle?: string;
    show_text?: boolean;
    image?: string;
    override_image?: { url: string; path?: string } | null;
    href?: string;
    new_image_file?: File | null;
    new_image_preview?: string | null;
  }[];
  instagram_reels?: {
    enabled: boolean;
    links: string[];
  };
  section_order?: string[];
}


const normalizeHomepageSettings = <T extends Partial<HomepageSettings>>(settings: T): T => {
  if (Array.isArray(settings.hero?.images)) {
    settings.hero.images = settings.hero.images.map((img: any) => ({
      ...img,
      url: toAbsoluteAssetUrl(img.url || img.path || ''),
    }));
  }

  if (Array.isArray(settings.collections)) {
    settings.collections = settings.collections.map((item: any) => ({
      ...item,
      image: toAbsoluteAssetUrl(item.image || ''),
    }));
  }

  if (Array.isArray(settings.bannered_collections)) {
    settings.bannered_collections = settings.bannered_collections.map((item: any) => ({
      ...item,
      image: toAbsoluteAssetUrl(item.image || ''),
      override_image: item.override_image
        ? { ...item.override_image, url: toAbsoluteAssetUrl(item.override_image.url || item.override_image.path || '') }
        : null,
    }));
  }

  return settings;
};

class SettingsService {
  async getHomepageSettings(group?: 'hero' | 'collections' | 'new_arrivals' | 'showcase' | 'bannered_collections' | 'instagram_reels'): Promise<Partial<HomepageSettings>> {
    const response = await axiosInstance.get('/catalog/homepage-settings', {
      params: group ? { group } : {}
    });
    return normalizeHomepageSettings(response.data);
  }

  async getAdminHomepageSettings(): Promise<HomepageSettings> {
    const response = await axiosInstance.get('/settings/homepage');
    return normalizeHomepageSettings(response.data);
  }

  async updateHomepageSettings(data: FormData): Promise<{ message: string }> {
    const response = await axiosInstance.post('/settings/homepage', data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

const settingsService = new SettingsService();
export default settingsService;
