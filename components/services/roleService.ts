import axiosInstance from '@/lib/axios';

// ============================================
// TYPES & INTERFACES
// ============================================

export interface Permission {
  id: number;
  name: string;
  slug: string;
  description?: string;
  guard_name: string;
  group?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Role {
  id: number;
  title: string;
  slug: string;
  description?: string;
  guard_name: 'api' | 'web';
  level?: number;
  is_active: boolean;
  is_default: boolean;
  created_at?: string;
  updated_at?: string;
  permissions?: Permission[];
}

export interface CreateRoleData {
  title: string;
  description?: string;
  guard_name: 'api' | 'web';
  level?: number;
  is_active?: boolean;
  is_default?: boolean;
  permission_ids?: number[];
}

export interface UpdateRoleData {
  title?: string;
  description?: string;
  level?: number;
  is_active?: boolean;
  is_default?: boolean;
}

export interface RoleFilters {
  is_active?: boolean;
  guard_name?: 'api' | 'web';
}

export interface RoleStatistics {
  total_roles: number;
  active_roles: number;
  inactive_roles: number;
  by_guard: {
    api?: number;
    web?: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  errors?: Record<string, string[]>;
}

// ============================================
// ROLE SERVICE
// ============================================

class RoleService {
  
  /**
   * Get all roles with optional filters
   */
  async getRoles(filters?: RoleFilters): Promise<ApiResponse<Role[]>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Convert boolean to 1/0 for Laravel
          if (typeof value === 'boolean') {
            params.append(key, value ? '1' : '0');
          } else {
            params.append(key, String(value));
          }
        }
      });
    }
    
    const response = await axiosInstance.get<ApiResponse<Role[]>>(
      `/roles?${params.toString()}`
    );
    return response.data;
  }

  /**
   * Get single role by ID
   */
  async getRole(id: number): Promise<ApiResponse<Role>> {
    const response = await axiosInstance.get<ApiResponse<Role>>(`/roles/${id}`);
    return response.data;
  }

  /**
   * Create new role
   */
  async createRole(data: CreateRoleData): Promise<ApiResponse<Role>> {
    const response = await axiosInstance.post<ApiResponse<Role>>('/roles', data);
    return response.data;
  }

  /**
   * Update role
   */
  async updateRole(id: number, data: UpdateRoleData): Promise<ApiResponse<Role>> {
    const response = await axiosInstance.put<ApiResponse<Role>>(`/roles/${id}`, data);
    return response.data;
  }

  /**
   * Delete role
   */
  async deleteRole(id: number): Promise<ApiResponse<null>> {
    const response = await axiosInstance.delete<ApiResponse<null>>(`/roles/${id}`);
    return response.data;
  }

  /**
   * Assign permissions to role
   */
  async assignPermissions(id: number, permissionIds: number[]): Promise<ApiResponse<Role>> {
    const response = await axiosInstance.post<ApiResponse<Role>>(
      `/roles/${id}/permissions`,
      { permission_ids: permissionIds }
    );
    return response.data;
  }

  /**
   * Remove permissions from role
   */
  async removePermissions(id: number, permissionIds: number[]): Promise<ApiResponse<Role>> {
    const response = await axiosInstance.delete<ApiResponse<Role>>(
      `/roles/${id}/permissions`,
      { data: { permission_ids: permissionIds } }
    );
    return response.data;
  }

  /**
   * Get role statistics
   */
  async getRoleStatistics(): Promise<ApiResponse<RoleStatistics>> {
    const response = await axiosInstance.get<ApiResponse<RoleStatistics>>('/roles/statistics');
    return response.data;
  }

  /**
   * Get active roles only
   */
  async getActiveRoles(guardName?: 'api' | 'web'): Promise<ApiResponse<Role[]>> {
    return this.getRoles({
      is_active: true,
      guard_name: guardName,
    });
  }

  /**
   * Get all roles without filters (simple version)
   */
  async getAllRoles(): Promise<ApiResponse<Role[]>> {
    const response = await axiosInstance.get<ApiResponse<Role[]>>('/roles');
    return response.data;
  }
}

export default new RoleService();