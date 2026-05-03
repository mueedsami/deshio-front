import axiosInstance from '@/lib/axios';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Permission {
  id: number;
  title: string;
  slug: string;
  description?: string;
  module: string;
  guard_name: 'api' | 'web';
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePermissionData {
  title: string;
  description?: string;
  module: string;
  guard_name: 'api' | 'web';
  is_active?: boolean;
}

export interface UpdatePermissionData {
  title?: string;
  description?: string;
  module?: string;
  is_active?: boolean;
}

export interface PermissionFilters {
  is_active?: boolean;
  module?: string;
  guard_name?: 'api' | 'web';
}

export interface PermissionsByModuleRow {
  module: string;
  permissions: string;
  count: number;
}

export interface PermissionStatistics {
  total_permissions: number;
  active_permissions: number;
  by_module: Record<string, number>;
  by_guard: {
    web?: number;
    api?: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

// ============================================
// PERMISSION SERVICE
// ============================================

class PermissionService {
  /**
   * List all permissions with optional filters
   */
  async getPermissions(filters?: PermissionFilters): Promise<ApiResponse<Permission[]>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (typeof value === 'boolean') {
            params.append(key, value ? '1' : '0');
          } else {
            params.append(key, String(value));
          }
        }
      });
    }

    const response = await axiosInstance.get<ApiResponse<Permission[]>>(
      `/permissions?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Create permission
   */
  async createPermission(data: CreatePermissionData): Promise<ApiResponse<Permission>> {
    const response = await axiosInstance.post<ApiResponse<Permission>>('/permissions', data);
    return response.data;
  }

  /**
   * Get single permission
   */
  async getPermission(id: number): Promise<ApiResponse<Permission>> {
    const response = await axiosInstance.get<ApiResponse<Permission>>(`/permissions/${id}`);
    return response.data;
  }

  /**
   * Update permission
   */
  async updatePermission(id: number, data: UpdatePermissionData): Promise<ApiResponse<Permission>> {
    const response = await axiosInstance.put<ApiResponse<Permission>>(`/permissions/${id}`, data);
    return response.data;
  }

  /**
   * Delete permission
   */
  async deletePermission(id: number): Promise<ApiResponse<null>> {
    const response = await axiosInstance.delete<ApiResponse<null>>(`/permissions/${id}`);
    return response.data;
  }

  /**
   * Get grouped permissions by module
   */
  async getByModule(): Promise<ApiResponse<PermissionsByModuleRow[]>> {
    const response = await axiosInstance.get<ApiResponse<PermissionsByModuleRow[]>>(
      '/permissions/by-module'
    );
    return response.data;
  }

  /**
   * Get permission statistics
   */
  async getStatistics(): Promise<ApiResponse<PermissionStatistics>> {
    const response = await axiosInstance.get<ApiResponse<PermissionStatistics>>(
      '/permissions/statistics'
    );
    return response.data;
  }
}

export default new PermissionService();
