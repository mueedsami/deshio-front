// lib/api/fieldService.ts
import axiosInstance from '@/lib/axios';

export interface Field {
  id: number;
  title?: string;  // Backend uses 'title'
  name?: string;   // Keep for compatibility
  type: string;
  mode?: string;
  description?: string;
  is_active?: boolean;
  is_required?: boolean;
  order?: number;
  display_order?: number;
  default_value?: string;
  options?: string[];
  validation_rules?: string;
  placeholder?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateFieldData {
  title: string;  // Backend expects 'title'
  type: string;
  description?: string;
  is_active?: boolean;
  is_required?: boolean;
  default_value?: string;
  options?: string[];
  validation_rules?: string;
  placeholder?: string;
  order?: number;
}

export interface UpdateFieldData extends CreateFieldData {
  id: number;
}

class FieldService {
  private baseUrl = '/fields';

  // Get all fields
  async getFields(): Promise<Field[]> {
    try {
      const response = await axiosInstance.get(this.baseUrl);
      // Backend returns { success: true, data: { data: [...], ...pagination } }
      const result = response.data;
      if (result?.data?.data) {
        return result.data.data; // Paginated response
      }
      return result?.data || result || [];
    } catch (error) {
      console.error('Error fetching fields:', error);
      throw error;
    }
  }

  // Get active fields only
  async getActiveFields(): Promise<Field[]> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/active`);
      const result = response.data;
      return result?.data || result || [];
    } catch (error) {
      console.error('Error fetching active fields:', error);
      throw error;
    }
  }

  // Get single field
  async getField(id: number): Promise<Field> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/${id}`);
      const result = response.data;
      return result?.data || result;
    } catch (error) {
      console.error(`Error fetching field ${id}:`, error);
      throw error;
    }
  }

  // Create new field
  async createField(data: CreateFieldData): Promise<Field> {
    try {
      const response = await axiosInstance.post(this.baseUrl, data);
      // Backend returns { success: true, data: {...} }
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error creating field:', error);
      throw error;
    }
  }

  // Update existing field
  async updateField(id: number, data: UpdateFieldData): Promise<Field> {
    try {
      const response = await axiosInstance.put(`${this.baseUrl}/${id}`, data);
      // Backend returns { success: true, data: {...} }
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error updating field ${id}:`, error);
      throw error;
    }
  }

  // Delete field
  async deleteField(id: number): Promise<void> {
    try {
      await axiosInstance.delete(`${this.baseUrl}/${id}`);
    } catch (error) {
      console.error(`Error deleting field ${id}:`, error);
      throw error;
    }
  }

  // Activate field
  async activateField(id: number): Promise<Field> {
    try {
      const response = await axiosInstance.patch(`${this.baseUrl}/${id}/activate`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error activating field ${id}:`, error);
      throw error;
    }
  }

  // Deactivate field
  async deactivateField(id: number): Promise<Field> {
    try {
      const response = await axiosInstance.patch(`${this.baseUrl}/${id}/deactivate`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error deactivating field ${id}:`, error);
      throw error;
    }
  }

  // Get field statistics
  async getStatistics(): Promise<any> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/statistics`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching field statistics:', error);
      throw error;
    }
  }

  // Bulk update field status
  async bulkUpdateStatus(ids: number[], isActive: boolean): Promise<void> {
    try {
      await axiosInstance.patch(`${this.baseUrl}/bulk/status`, {
        field_ids: ids,
        is_active: isActive,
      });
    } catch (error) {
      console.error('Error bulk updating field status:', error);
      throw error;
    }
  }

  // Reorder fields
  async reorderFields(fieldOrders: { id: number; order: number }[]): Promise<void> {
    try {
      await axiosInstance.patch(`${this.baseUrl}/reorder`, {
        orders: fieldOrders,
      });
    } catch (error) {
      console.error('Error reordering fields:', error);
      throw error;
    }
  }

  // Duplicate field
  async duplicateField(id: number): Promise<Field> {
    try {
      const response = await axiosInstance.post(`${this.baseUrl}/${id}/duplicate`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error(`Error duplicating field ${id}:`, error);
      throw error;
    }
  }

  // Get field types
  async getFieldTypes(): Promise<any[]> {
    try {
      const response = await axiosInstance.get(`${this.baseUrl}/types`);
      return response.data?.data || response.data;
    } catch (error) {
      console.error('Error fetching field types:', error);
      throw error;
    }
  }
}

export const fieldService = new FieldService();