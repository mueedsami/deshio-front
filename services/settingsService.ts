import axiosInstance from '@/lib/axios';

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

class SettingsService {
  async getHomepageSettings(group?: 'hero' | 'collections' | 'new_arrivals' | 'showcase' | 'bannered_collections' | 'instagram_reels'): Promise<Partial<HomepageSettings>> {
    const response = await axiosInstance.get('/catalog/homepage-settings', {
      params: group ? { group } : {}
    });
    return response.data;
  }

  async getAdminHomepageSettings(): Promise<HomepageSettings> {
    const response = await axiosInstance.get('/settings/homepage');
    return response.data;
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
