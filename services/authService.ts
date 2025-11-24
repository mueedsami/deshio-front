import axiosInstance from 'lib/axios';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
  store_id: string;
  role_id?: string;
  phone?: string;
  department?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface SignupResponse extends AuthResponse {
  message: string;
  employee: {
    id: number;
    name: string;
    email: string;
    employee_code: string;
    store_id: string;
    role_id: string;
    phone?: string;
    department?: string;
    is_active: boolean;
  };
}

export interface Employee {
  id: number;
  name: string;
  email: string;
  employee_code: string;
  store_id: string;
  role_id: string;
  phone?: string;
  department?: string;
  is_active: boolean;
  hire_date?: string;
  last_login_at?: string;
}

class AuthService {
  private refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Login user with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await axiosInstance.post<AuthResponse>('/login', credentials);
    
    // Store token and setup auto-refresh
    if (response.data.access_token) {
      this.setAuthToken(response.data.access_token, response.data.expires_in);
      
      // Fetch and store user data after login
      try {
        const user = await this.getCurrentUser();
        this.setUserData(user);
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        this.clearAuth();
        throw error;
      }
    }
    
    return response.data;
  }

  /**
   * Register a new employee
   */
  async signup(data: SignupData): Promise<SignupResponse> {
    const response = await axiosInstance.post<SignupResponse>('/signup', data);
    
    // Store token, user data, and setup auto-refresh
    if (response.data.access_token) {
      this.setAuthToken(response.data.access_token, response.data.expires_in);
      
      if (response.data.employee) {
        this.setUserData(response.data.employee);
      }
    }
    
    return response.data;
  }

  /**
   * Get current authenticated user
   */
  async getCurrentUser(): Promise<Employee> {
    const response = await axiosInstance.get<Employee>('/me');
    return response.data;
  }

  /**
   * Logout user
   */
  async logout(): Promise<void> {
    try {
      await axiosInstance.post('/logout');
    } finally {
      this.clearAuth();
      this.clearRefreshTimer();
    }
  }

  /**
   * Refresh authentication token
   */
  async refreshToken(): Promise<AuthResponse> {
    try {
      const response = await axiosInstance.post<AuthResponse>('/refresh');
      
      if (response.data.access_token) {
        this.setAuthToken(response.data.access_token, response.data.expires_in);
      }
      
      return response.data;
    } catch (error) {
      console.error('Token refresh failed:', error);
      this.clearAuth();
      throw error;
    }
  }

  /**
   * Set authentication token and setup auto-refresh
   */
  setAuthToken(token: string, expiresIn?: number): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('authToken', token);
      
      if (expiresIn) {
        // Store expiration timestamp
        const expiresAt = Date.now() + (expiresIn * 1000);
        localStorage.setItem('tokenExpiresAt', expiresAt.toString());
        
        // Setup auto-refresh
        this.scheduleTokenRefresh(expiresIn);
      }
    }
  }

  /**
   * Schedule automatic token refresh
   * Refreshes 5 minutes before expiration
   */
  private scheduleTokenRefresh(expiresIn: number): void {
    // Clear any existing timer
    this.clearRefreshTimer();

    // Refresh 5 minutes (300 seconds) before token expires
    // Minimum 1 minute to avoid issues with very short tokens
    const refreshTime = Math.max((expiresIn - 300) * 1000, 60000);
    
    console.log(`Token will auto-refresh in ${(refreshTime / 1000 / 60).toFixed(1)} minutes`);

    this.refreshTimer = setTimeout(async () => {
      try {
        await this.refreshToken();
        console.log('✅ Token auto-refreshed successfully');
      } catch (error) {
        console.error('❌ Auto token refresh failed:', error);
      }
    }, refreshTime);
  }

  /**
   * Clear refresh timer
   */
  private clearRefreshTimer(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Get authentication token
   */
  getAuthToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('authToken');
    }
    return null;
  }

  /**
   * Check if token is still valid based on expiration time
   */
  isTokenValid(): boolean {
    if (typeof window === 'undefined') return false;
    
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!expiresAt) {
      // If no expiration stored but token exists, assume it's valid
      // This handles backward compatibility
      return !!this.getAuthToken();
    }
    
    return Date.now() < parseInt(expiresAt);
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getAuthToken() && this.isTokenValid();
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('userRole');
      localStorage.removeItem('userId');
      localStorage.removeItem('userName');
      localStorage.removeItem('userEmail');
      localStorage.removeItem('storeId');
      localStorage.removeItem('storeName');
      localStorage.removeItem('platforms');
    }
    this.clearRefreshTimer();
  }

  /**
   * Store user data in localStorage
   */
  setUserData(employee: Employee | SignupResponse['employee']): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('userId', employee.id.toString());
      localStorage.setItem('userName', employee.name);
      localStorage.setItem('userEmail', employee.email);
      localStorage.setItem('userRole', employee.role_id);
      
      if (employee.store_id) {
        localStorage.setItem('storeId', employee.store_id);
      }
    }
  }

  /**
   * Initialize token refresh on app load
   * Call this when the app starts to restore session
   */
  initializeTokenRefresh(): void {
    if (typeof window === 'undefined') return;

    const token = this.getAuthToken();
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    
    if (!token || !expiresAt) return;

    const timeLeft = parseInt(expiresAt) - Date.now();
    
    if (timeLeft > 0) {
      const expiresInSeconds = Math.floor(timeLeft / 1000);
      this.scheduleTokenRefresh(expiresInSeconds);
      console.log('🔄 Token refresh timer restored from session');
    } else {
      console.log('⏰ Token expired, clearing auth');
      this.clearAuth();
    }
  }
}

export default new AuthService();