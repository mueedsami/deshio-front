import axiosInstance from '@/lib/axios';

export interface Employee {
  id: string | number;
  name: string;
  email: string;
  phone: string;
  role: string;
  store_id?: number;
  is_active: boolean;
  join_date?: string;
  department?: string;
}

export interface CreateEmployeePayload {
  name: string;
  email: string;
  phone: string;
  role: string;
  store_id?: number;
  department?: string;
  salary?: number;
  join_date?: string;
}

const employeeService = {
  /** Get all employees */
  async getAll(params?: { 
    store_id?: number; 
    role?: string; 
    is_active?: boolean;
    department?: string;
  }): Promise<Employee[]> {
    try {
      const response = await axiosInstance.get('/employees', { params });
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch employees');
      }
      
      return result.data || [];
    } catch (error: any) {
      console.error('Get employees error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch employees');
    }
  },

  /** Get single employee by ID */
  async getById(id: string | number): Promise<Employee> {
    try {
      const response = await axiosInstance.get(`/employees/${id}`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to fetch employee');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Get employee error:', error);
      throw new Error(error.response?.data?.message || 'Failed to fetch employee');
    }
  },

  /** Create new employee */
  async create(payload: CreateEmployeePayload): Promise<Employee> {
    try {
      const response = await axiosInstance.post('/employees', payload);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to create employee');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Create employee error:', error);
      throw new Error(error.response?.data?.message || 'Failed to create employee');
    }
  },

  /** Update employee */
  async update(id: string | number, payload: Partial<CreateEmployeePayload>): Promise<Employee> {
    try {
      const response = await axiosInstance.put(`/employees/${id}`, payload);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to update employee');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Update employee error:', error);
      throw new Error(error.response?.data?.message || 'Failed to update employee');
    }
  },

  /** Delete employee */
  async delete(id: string | number): Promise<void> {
    try {
      const response = await axiosInstance.delete(`/employees/${id}`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to delete employee');
      }
    } catch (error: any) {
      console.error('Delete employee error:', error);
      throw new Error(error.response?.data?.message || 'Failed to delete employee');
    }
  },

  /** Activate employee */
  async activate(id: string | number): Promise<Employee> {
    try {
      const response = await axiosInstance.patch(`/employees/${id}/activate`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to activate employee');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Activate employee error:', error);
      throw new Error(error.response?.data?.message || 'Failed to activate employee');
    }
  },

  /** Deactivate employee */
  async deactivate(id: string | number): Promise<Employee> {
    try {
      const response = await axiosInstance.patch(`/employees/${id}/deactivate`);
      const result = response.data;
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to deactivate employee');
      }
      
      return result.data;
    } catch (error: any) {
      console.error('Deactivate employee error:', error);
      throw new Error(error.response?.data?.message || 'Failed to deactivate employee');
    }
  },
};

export default employeeService;