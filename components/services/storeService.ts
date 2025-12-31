import axios from '@/lib/axios';

export interface Store {
  id: number;
  name: string;
  address: string;
  pathao_key: string;
  type: string;
  is_online: boolean;
  is_active: boolean;
  is_warehouse: boolean;
  phone?: string;
  email?: string;
  contact_person?: string;
  store_code?: string;
  created_at?: string;
  updated_at?: string;
}

export interface StoreFormData {
  id?: number;
  name: string;
  address: string;
  pathao_key: string;
  type: string;
  is_online: boolean;
}

class StoreService {
  // Get all stores
  async getStores(params?: {
    is_warehouse?: boolean;
    is_online?: boolean;
    is_active?: boolean;
    type?: string;
    search?: string;
    sort_by?: string;
    sort_direction?: string;
    per_page?: number;
  }) {
    const response = await axios.get('/stores', { params });
    return response.data;
  }

  // ✅ Get all warehouse stores
  async getWarehouses() {
    const response = await axios.get('/stores', {
      params: { type: 'warehouse', is_active: true },
    });
    return response.data;
  }

  // Get single store
  async getStore(id: number) {
    const response = await axios.get(`/stores/${id}`);
    return response.data;
  }

  // Create store
  async createStore(data: StoreFormData) {
    const payload = {
      name: data.name,
      address: data.address,
      pathao_key: data.pathao_key,
      is_warehouse: data.type === 'warehouse',
      is_online: data.is_online,
    };
    const response = await axios.post('/stores', payload);
    return response.data;
  }

  // Update store
  async updateStore(id: number, data: StoreFormData) {
    const payload = {
      name: data.name,
      address: data.address,
      pathao_key: data.pathao_key,
      is_warehouse: data.type === 'warehouse',
      is_online: data.is_online,
    };
    const response = await axios.put(`/stores/${id}`, payload);
    return response.data;
  }

  // Delete store
  async deleteStore(id: number) {
    const response = await axios.delete(`/stores/${id}`);
    return response.data;
  }

  // Activate store
  async activateStore(id: number) {
    const response = await axios.patch(`/stores/${id}/activate`);
    return response.data;
  }

  // Deactivate store
  async deactivateStore(id: number) {
    const response = await axios.patch(`/stores/${id}/deactivate`);
    return response.data;
  }

  // Get store statistics
  async getStoreStats() {
    const response = await axios.get('/stores/stats');
    return response.data;
  }

  // Get store inventory
  async getStoreInventory(id: number) {
    const response = await axios.get(`/stores/${id}/inventory`);
    return response.data;
  }
}

export default new StoreService();
