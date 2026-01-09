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
    return [];
  }

  private pickObject(payload: any): any {
    if (!payload) return null;
    if (payload?.data && typeof payload.data === 'object') return payload.data;
    return payload;
  }

  private normalizeCategory(input: any): Service['category'] {
    const v = String(input || '').toLowerCase();
    if (v === 'wash' || v === 'repair' || v === 'alteration' || v === 'custom' || v === 'other') return v;
    return 'other';
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
    return {
      id: Number(api?.id) || 0,
      name: api?.name || api?.service_name || '',
      description: api?.description || '',
      basePrice: this.toNumber(api?.base_price ?? api?.basePrice ?? api?.price ?? 0, 0),
      category: this.normalizeCategory(api?.category),
      isActive: this.toBoolean(api?.is_active ?? api?.isActive ?? true, true),
      allowManualPrice: this.toBoolean(api?.allow_manual_price ?? api?.allowManualPrice ?? true, true),
      createdAt: api?.created_at || api?.createdAt || new Date().toISOString(),
      updatedAt: api?.updated_at || api?.updatedAt || new Date().toISOString(),
    };
  }

  private toApiPayload(serviceData: Partial<Service>): any {
    return {
      name: serviceData.name,
      description: serviceData.description,
      base_price: serviceData.basePrice,
      category: serviceData.category,
      is_active: serviceData.isActive,
      allow_manual_price: serviceData.allowManualPrice,
      // Some backends use pricing_type instead of allow_manual_price
      pricing_type: serviceData.allowManualPrice ? 'manual' : 'fixed',
    };
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
      const res = await axiosInstance.post('/services', payload);
      const obj = this.pickObject(res.data);
      const created = this.normalize(obj);

      // refresh cache
      await this.getAllServices();
      return created;
    } catch (e) {
      // if API fails, fallback to local creation (offline mode)
      const services = await this.getAllServices();
      const newService: Service = {
        ...(serviceData as any),
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const next = [...services, newService];
      this.writeServicesToStorage(next);
      console.warn('API createService failed; stored locally as fallback:', e);
      return newService;
    }
  }

  /**
   * Update service
   */
  async updateService(id: number, updates: Partial<Service>): Promise<Service | null> {
    try {
      const payload = this.toApiPayload(updates);
      const res = await axiosInstance.put(`/services/${id}`, payload);
      const obj = this.pickObject(res.data);
      const updated = obj ? this.normalize(obj) : null;
      await this.getAllServices();
      return updated;
    } catch (e) {
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
