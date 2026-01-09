// Service Management Service (API-first)
//
// Persists services in DB via /api/services.
// LocalStorage is used as a cache + offline fallback so POS/Social can still operate.

import axiosInstance from '@/lib/axios';

export interface Service {
  id: number;
  name: string;
  description: string;
  basePrice: number; // Default price
  // UI categories (we map to backend categories in toApiPayload)
  category: 'wash' | 'repair' | 'alteration' | 'custom' | 'other';
  isActive: boolean;
  allowManualPrice: boolean;
  createdAt: string;
  updatedAt: string;
}

type ApiService = any;

class ServiceManagementService {
  private readonly STORAGE_KEY = 'services';
  private readonly BACKUP_KEY = 'services_backup';

  private writeServicesToStorage(services: Service[]) {
    try {
      const serialized = JSON.stringify(services);
      localStorage.setItem(this.STORAGE_KEY, serialized);
      localStorage.setItem(this.BACKUP_KEY, serialized);
    } catch {
      // ignore
    }
  }

  private safeParse(raw: string | null): Service[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as Service[];
      if (parsed?.data && Array.isArray(parsed.data)) return parsed.data as Service[];
      if (parsed?.data?.data && Array.isArray(parsed.data.data)) return parsed.data.data as Service[];
      return [];
    } catch {
      return [];
    }
  }

  private pickArray(payload: any): any[] {
    if (!payload) return [];
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    if (Array.isArray(payload?.data?.services)) return payload.data.services;
    if (Array.isArray(payload?.services)) return payload.services;
    if (Array.isArray(payload?.data?.items)) return payload.data.items;
    return [];
  }

  private pickObject(payload: any): any {
    if (!payload) return null;
    // Common wrappers:
    // { success: true, data: {...} }
    // { success: true, data: { service: {...} } }
    // { data: {...} }
    if (payload?.data?.service && typeof payload.data.service === 'object') return payload.data.service;
    if (payload?.data && typeof payload.data === 'object') return payload.data;
    return payload;
  }

  private normalizeCategory(input: any): Service['category'] {
    const v = String(input || '').toLowerCase();
    if (v === 'wash' || v === 'repair' || v === 'alteration' || v === 'custom' || v === 'other') return v;
    // If backend returns categories like 'cleaning'/'tailoring', map them to the closest UI bucket
    if (v === 'cleaning') return 'wash';
    if (v === 'tailoring') return 'custom';
    return 'other';
  }

  /**
   * Map UI categories to backend categories.
   * Backend commonly uses: cleaning, repair, alteration, tailoring, other
   */
  private toBackendCategory(ui: Service['category']): string {
    switch (ui) {
      case 'wash':
        return 'cleaning';
      case 'custom':
        return 'tailoring';
      case 'repair':
      case 'alteration':
      case 'other':
      default:
        return ui;
    }
  }

  private toBoolean(v: any, fallback = false): boolean {
    if (typeof v === 'boolean') return v;
    if (typeof v === 'number') return v === 1;
    if (typeof v === 'string') {
      const s = v.toLowerCase();
      if (s === 'true' || s === '1' || s === 'yes') return true;
      if (s === 'false' || s === '0' || s === 'no') return false;
    }
    return fallback;
  }

  private toNumber(v: any, fallback = 0): number {
    const n = Number(String(v ?? '').replace(/,/g, '').replace(/[^0-9.\-]/g, ''));
    return Number.isFinite(n) ? n : fallback;
  }

  private normalize(api: ApiService): Service {
    // Some backends may not include allow_manual_price but may include pricing_type.
    // In that case we treat anything other than 'fixed' as allowing manual override.
    const rawPricingType = String(api?.pricing_type ?? api?.pricingType ?? '').toLowerCase();
    const inferredAllowManual = rawPricingType ? rawPricingType !== 'fixed' : undefined;
    return {
      id: Number(api?.id) || 0,
      name: api?.name || api?.service_name || '',
      description: api?.description || '',
      basePrice: this.toNumber(api?.base_price ?? api?.basePrice ?? api?.price ?? 0, 0),
      category: this.normalizeCategory(api?.category),
      isActive: this.toBoolean(api?.is_active ?? api?.isActive ?? true, true),
      allowManualPrice: this.toBoolean(
        api?.allow_manual_price ?? api?.allowManualPrice ?? inferredAllowManual ?? true,
        true
      ),
      createdAt: api?.created_at || api?.createdAt || new Date().toISOString(),
      updatedAt: api?.updated_at || api?.updatedAt || new Date().toISOString(),
    };
  }

  private toApiPayload(serviceData: Partial<Service>): any {
    const basePrice = this.toNumber((serviceData as any)?.basePrice ?? (serviceData as any)?.base_price ?? 0, 0);
    const allowManual = this.toBoolean((serviceData as any)?.allowManualPrice ?? (serviceData as any)?.allow_manual_price ?? true, true);
    const isActive = this.toBoolean((serviceData as any)?.isActive ?? (serviceData as any)?.is_active ?? true, true);
    const uiCategory = (serviceData.category || 'other') as Service['category'];

    return {
      name: (serviceData.name || '').trim(),
      description: (serviceData.description || '').trim(),
      base_price: basePrice,

      // Category enum mismatch is the #1 cause of 422s.
      // Map UI bucket -> backend category.
      category: this.toBackendCategory(uiCategory),

      // Laravel accepts booleans, but some setups validate strictly as 0/1.
      is_active: isActive ? 1 : 0,

      // Manual overrides are needed for POS/Social.
      allow_manual_price: allowManual ? 1 : 0,
    };
  }

  /**
   * Some backends have strict validation around pricing_type.
   * We avoid sending it by default, but can retry with a safe value.
   */
  private withPricingType(payload: any, pricingType: 'fixed' = 'fixed') {
    return { ...payload, pricing_type: pricingType };
  }

  private getAxiosStatus(e: any): number | null {
    return e?.response?.status ?? null;
  }

  private extractApiErrorMessage(e: any): string {
    const data = e?.response?.data;
    if (!data) return e?.message || 'Request failed';
    if (typeof data === 'string') return data;
    if (typeof data?.message === 'string') return data.message;
    // Laravel validation: { message, errors: { field: [..] } }
    if (data?.errors && typeof data.errors === 'object') {
      const firstKey = Object.keys(data.errors)[0];
      const firstVal = firstKey ? data.errors[firstKey] : null;
      const msg = Array.isArray(firstVal) ? firstVal[0] : firstVal;
      if (msg) return String(msg);
    }
    return e?.message || 'Request failed';
  }

  private hasValidationErrorForField(e: any, field: string): boolean {
    const data = e?.response?.data;
    const errors = data?.errors;
    if (!errors || typeof errors !== 'object') return false;
    return Object.prototype.hasOwnProperty.call(errors, field);
  }

  /**
   * Get all services (API-first)
   */
  async getAllServices(): Promise<Service[]> {
    // 1) Try API
    try {
      // Some backends paginate services; request a large page size and merge pages if needed.
      const first = await axiosInstance.get('/services', { params: { per_page: 5000, page: 1 } });
      const firstArr = this.pickArray(first.data);
      const meta = first?.data?.data;
      const lastPage = Number(meta?.last_page || 1);

      let all: any[] = [...firstArr];
      if (lastPage > 1) {
        const maxPages = Math.min(lastPage, 20); // safety cap
        for (let page = 2; page <= maxPages; page += 1) {
          const res = await axiosInstance.get('/services', { params: { per_page: 5000, page } });
          const arr = this.pickArray(res.data);
          if (!arr.length) break;
          all = all.concat(arr);
        }
      }

      const normalized = all.map((s) => this.normalize(s)).filter((s) => s.id);
      if (normalized.length >= 0) {
        // cache even empty result (means DB has no services)
        this.writeServicesToStorage(normalized);
      }
      return normalized;
    } catch (e) {
      // 2) Fallback to local cache
      try {
        const raw = localStorage.getItem(this.STORAGE_KEY);
        const cached = this.safeParse(raw);
        if (cached.length > 0) return cached;
        const backupRaw = localStorage.getItem(this.BACKUP_KEY);
        const backup = this.safeParse(backupRaw);
        if (backup.length > 0) {
          this.writeServicesToStorage(backup);
          return backup;
        }
      } catch {
        // ignore
      }
      console.error('Error getting services (API + fallback):', e);
      return [];
    }
  }

  /**
   * Get active services only
   */
  async getActiveServices(): Promise<Service[]> {
    const services = await this.getAllServices();
    return services.filter((s) => s.isActive);
  }

  /**
   * Get service by ID
   */
  async getServiceById(id: number): Promise<Service | null> {
    // Try API first
    try {
      const res = await axiosInstance.get(`/services/${id}`);
      const obj = this.pickObject(res.data);
      if (obj) return this.normalize(obj);
    } catch {
      // ignore
    }

    // fallback cache
    const services = await this.getAllServices();
    return services.find((s) => s.id === id) || null;
  }

  /**
   * Create new service
   */
  async createService(serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    try {
      const payload = this.toApiPayload(serviceData);
      let res;
      try {
        res = await axiosInstance.post('/services', payload);
      } catch (e: any) {
        // Some backends require pricing_type (enum). Retry with a safe default.
        const status = this.getAxiosStatus(e);
        if (status === 422 && this.hasValidationErrorForField(e, 'pricing_type')) {
          res = await axiosInstance.post('/services', this.withPricingType(payload, 'fixed'));
        } else {
          throw e;
        }
      }
      const obj = this.pickObject(res.data);
      const created = this.normalize(obj);

      // refresh cache
      await this.getAllServices();
      return created;
    } catch (e) {
      // For admin panels, do NOT silently fall back on validation/auth errors.
      // Only fall back when the API is unreachable (network error / no response).
      const status = this.getAxiosStatus(e);
      if (status && status >= 400 && status < 500) {
        const msg = this.extractApiErrorMessage(e);
        console.error('API createService failed:', msg, e);
        throw new Error(msg);
      }

      // Network/offline fallback
      const services = await this.getAllServices();
      const newService: Service = {
        ...(serviceData as any),
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [...services, newService];
      this.writeServicesToStorage(next);
      console.warn('API createService failed (offline); stored locally as fallback:', e);
      return newService;
    }
  }

  /**
   * Update service
   */
  async updateService(id: number, updates: Partial<Service>): Promise<Service | null> {
    try {
      const payload = this.toApiPayload(updates);
      let res;
      try {
        res = await axiosInstance.put(`/services/${id}`, payload);
      } catch (e: any) {
        const status = this.getAxiosStatus(e);
        if (status === 422 && this.hasValidationErrorForField(e, 'pricing_type')) {
          res = await axiosInstance.put(`/services/${id}`, this.withPricingType(payload, 'fixed'));
        } else {
          throw e;
        }
      }
      const obj = this.pickObject(res.data);
      const updated = obj ? this.normalize(obj) : null;
      await this.getAllServices();
      return updated;
    } catch (e) {
      const status = this.getAxiosStatus(e);
      if (status && status >= 400 && status < 500) {
        const msg = this.extractApiErrorMessage(e);
        console.error('API updateService failed:', msg, e);
        throw new Error(msg);
      }
      // fallback: local update
      const services = await this.getAllServices();
      const index = services.findIndex((s) => s.id === id);
      if (index === -1) return null;
      const next = [...services];
      next[index] = { ...next[index], ...updates, updatedAt: new Date().toISOString() };
      this.writeServicesToStorage(next);
      console.warn('API updateService failed; updated local cache as fallback:', e);
      return next[index];
    }
  }

  /**
   * Delete service
   */
  async deleteService(id: number): Promise<boolean> {
    try {
      await axiosInstance.delete(`/services/${id}`);
      await this.getAllServices();
      return true;
    } catch (e) {
      const status = this.getAxiosStatus(e);
      if (status && status >= 400 && status < 500) {
        const msg = this.extractApiErrorMessage(e);
        console.error('API deleteService failed:', msg, e);
        throw new Error(msg);
      }
      // fallback local delete
      const services = await this.getAllServices();
      const filtered = services.filter((s) => s.id !== id);
      this.writeServicesToStorage(filtered);
      console.warn('API deleteService failed; removed from local cache as fallback:', e);
      return services.length !== filtered.length;
    }
  }

  /**
   * Toggle service active status
   */
  async toggleServiceStatus(id: number): Promise<Service | null> {
    const existing = await this.getServiceById(id);
    if (!existing) return null;

    const target = !existing.isActive;

    // Prefer activate/deactivate endpoints if present
    try {
      if (target) {
        await axiosInstance.patch(`/services/${id}/activate`);
      } else {
        await axiosInstance.patch(`/services/${id}/deactivate`);
      }
      await this.getAllServices();
      return await this.getServiceById(id);
    } catch {
      // fallback to update
      return await this.updateService(id, { isActive: target });
    }
  }

  /**
   * Initialize defaults ONLY for offline/localStorage mode.
   * We do NOT auto-seed DB via API (to avoid overwriting production data).
   */
  async initializeDefaultServices(): Promise<void> {
    // If API is reachable, do nothing.
    try {
      await axiosInstance.get('/services');
      return;
    } catch {
      // offline: seed only if storage is missing
    }

    const hasKey = typeof window !== 'undefined' && localStorage.getItem(this.STORAGE_KEY) !== null;
    const services = await this.getAllServices();

    if (!hasKey && services.length === 0) {
      const defaults: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>[] = [
        {
          name: 'Wash',
          description: 'Professional washing service',
          basePrice: 300,
          category: 'wash',
          isActive: true,
          allowManualPrice: true,
        },
        {
          name: 'Dry Clean',
          description: 'Premium dry cleaning service',
          basePrice: 500,
          category: 'wash',
          isActive: true,
          allowManualPrice: true,
        },
        {
          name: 'Iron & Press',
          description: 'Professional ironing service',
          basePrice: 150,
          category: 'wash',
          isActive: true,
          allowManualPrice: true,
        },
        {
          name: 'Minor Repair',
          description: 'Small repairs and fixes',
          basePrice: 200,
          category: 'repair',
          isActive: true,
          allowManualPrice: true,
        },
        {
          name: 'Alteration',
          description: 'Clothing alteration service',
          basePrice: 400,
          category: 'alteration',
          isActive: true,
          allowManualPrice: true,
        },
      ];

      const seeded: Service[] = defaults.map((d, idx) => ({
        ...d,
        id: Date.now() + idx,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      this.writeServicesToStorage(seeded);
    }
  }
}

const serviceManagementService = new ServiceManagementService();
export default serviceManagementService;
