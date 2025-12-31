import axios from '@/lib/axios';
import { ApiResponse, PaginatedResponse } from './api.types';

export interface Category {
  id: number;
  title: string;
  name?: string;
  slug?: string;
  description?: string;
  parent_id?: number;
  order?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  subcategories?: Category[];
  parent?: Category;
}

export interface CreateCategoryData {
  title: string;
  description?: string;
  parent_id?: number;
  order?: number;
  is_active?: boolean;
}

export interface CategoryFilters {
  parent_id?: number;
  is_active?: boolean;
  search?: string;
  per_page?: number;
  page?: number;
}

class CategoryService {
  private readonly endpoint = '/categories';

  /**
   * Get all categories with optional filters
   */
  async getCategories(filters?: CategoryFilters): Promise<PaginatedResponse<Category>> {
    const response = await axios.get(this.endpoint, { params: filters });
    return response.data;
  }

  /**
   * Get categories as array (helper method)
   */
  async getCategoriesArray(filters?: CategoryFilters): Promise<Category[]> {
    const response = await this.getCategories(filters);
    return response.data.data || response.data || [];
  }

  /**
   * Get single category by ID
   */
  async getCategory(id: number): Promise<ApiResponse<Category>> {
    const response = await axios.get(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Get category tree (hierarchical structure)
   */
  async getCategoryTree(): Promise<ApiResponse<Category[]>> {
    const response = await axios.get(`${this.endpoint}/tree`);
    return response.data;
  }

  /**
   * Create new category
   */
  async createCategory(data: CreateCategoryData): Promise<ApiResponse<Category>> {
    const response = await axios.post(this.endpoint, data);
    return response.data;
  }

  /**
   * Update category
   */
  async updateCategory(id: number, data: Partial<CreateCategoryData>): Promise<ApiResponse<Category>> {
    const response = await axios.put(`${this.endpoint}/${id}`, data);
    return response.data;
  }

  /**
   * Delete category
   */
  async deleteCategory(id: number): Promise<ApiResponse<{ message: string }>> {
    const response = await axios.delete(`${this.endpoint}/${id}`);
    return response.data;
  }

  /**
   * Get subcategories of a parent category
   */
  async getSubcategories(parentId: number): Promise<Category[]> {
    return this.getCategoriesArray({ parent_id: parentId });
  }
}

export default new CategoryService();