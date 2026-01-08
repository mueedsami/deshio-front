// Service Management Service
// Handles CRUD operations for add-on services

export interface Service {
  id: number;
  name: string;
  description: string;
  basePrice: number; // Default price (used in e-commerce, shown as default in POS/social)
  category: 'wash' | 'repair' | 'alteration' | 'custom' | 'other';
  isActive: boolean;
  allowManualPrice: boolean; // If true, POS/social can override price
  createdAt: string;
  updatedAt: string;
}

class ServiceManagementService {
  private readonly STORAGE_KEY = 'services';

  /**
   * Get all services
   */
  async getAllServices(): Promise<Service[]> {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('Error getting services:', error);
      return [];
    }
  }

  /**
   * Get active services only
   */
  async getActiveServices(): Promise<Service[]> {
    const services = await this.getAllServices();
    return services.filter(s => s.isActive);
  }

  /**
   * Get service by ID
   */
  async getServiceById(id: number): Promise<Service | null> {
    const services = await this.getAllServices();
    return services.find(s => s.id === id) || null;
  }

  /**
   * Create new service
   */
  async createService(serviceData: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>): Promise<Service> {
    try {
      const services = await this.getAllServices();
      const newService: Service = {
        ...serviceData,
        id: Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      services.push(newService);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(services));
      
      return newService;
    } catch (error) {
      console.error('Error creating service:', error);
      throw error;
    }
  }

  /**
   * Update service
   */
  async updateService(id: number, updates: Partial<Service>): Promise<Service | null> {
    try {
      const services = await this.getAllServices();
      const index = services.findIndex(s => s.id === id);
      
      if (index === -1) return null;
      
      services[index] = {
        ...services[index],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(services));
      return services[index];
    } catch (error) {
      console.error('Error updating service:', error);
      throw error;
    }
  }

  /**
   * Delete service
   */
  async deleteService(id: number): Promise<boolean> {
    try {
      const services = await this.getAllServices();
      const filtered = services.filter(s => s.id !== id);
      
      if (filtered.length === services.length) return false;
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
      return true;
    } catch (error) {
      console.error('Error deleting service:', error);
      throw error;
    }
  }

  /**
   * Toggle service active status
   */
  async toggleServiceStatus(id: number): Promise<Service | null> {
    const service = await this.getServiceById(id);
    if (!service) return null;
    
    return await this.updateService(id, { isActive: !service.isActive });
  }

  /**
   * Initialize with default services if empty
   */
  async initializeDefaultServices(): Promise<void> {
    const services = await this.getAllServices();
    
    if (services.length === 0) {
      const defaultServices: Omit<Service, 'id' | 'createdAt' | 'updatedAt'>[] = [
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

      for (const service of defaultServices) {
        await this.createService(service);
      }
    }
  }
}

const serviceManagementService = new ServiceManagementService();
export default serviceManagementService;
