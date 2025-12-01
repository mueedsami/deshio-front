// services/customerAuthService.ts

import axiosInstance from '@/lib/axios';

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  customer_code: string;
  customer_type: string;
  status: string;
  email_verified: boolean;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  total_orders?: number;
  total_purchases?: number;
  first_purchase_at?: string;
  last_purchase_at?: string;
  preferences?: any;
  social_profiles?: any;
  created_at?: string;
  updated_at?: string;
}

export interface CustomerLoginCredentials {
  email: string;
  password: string;
  remember_me?: boolean;
}

export interface CustomerRegisterData {
  name: string;
  email: string;
  phone: string;
  password: string;
  password_confirmation: string;
  date_of_birth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  preferences?: any;
  social_profiles?: any;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

export interface ResetPasswordData {
  email: string;
  token: string;
  password: string;
  password_confirmation: string;
}

class CustomerAuthService {
  private readonly TOKEN_KEY = 'auth_token';
  private readonly USER_KEY = 'customer_user';
  private readonly TOKEN_EXPIRY_KEY = 'token_expires_in';
  
  private tokenRefreshInterval: NodeJS.Timeout | null = null;

  /**
   * Login customer
   */
  async login(credentials: CustomerLoginCredentials): Promise<{
    customer: Customer;
    token: string;
    expires_in: number;
  }> {
    try {
      const response = await axiosInstance.post('/customer-auth/login', {
        email: credentials.email,
        password: credentials.password,
        remember_me: credentials.remember_me || false
      });

      if (response.data.success) {
        const { customer, token, expires_in } = response.data.data;
        
        // Store authentication data
        this.setToken(token);
        this.setCustomerData(customer);
        this.setTokenExpiry(expires_in);
        
        // Initialize token refresh
        this.initializeTokenRefresh(expires_in);
        
        // Dispatch events
        this.dispatchAuthEvent();
        
        return { customer, token, expires_in };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  }

  /**
   * Register new customer
   */
  async register(data: CustomerRegisterData): Promise<void> {
    try {
      const response = await axiosInstance.post('/customer-auth/register', {
        ...data,
        country: data.country || 'Bangladesh',
        preferences: data.preferences || {},
        social_profiles: data.social_profiles || {}
      });

      if (!response.data.success) {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || error.message || 'Registration failed';
      const errors = error.response?.data?.errors;
      
      if (errors) {
        const firstError = Object.values(errors)[0];
        throw new Error(Array.isArray(firstError) ? firstError[0] : errorMessage);
      }
      
      throw new Error(errorMessage);
    }
  }

  /**
   * Logout customer
   */
  async logout(): Promise<void> {
    try {
      // Call backend to invalidate token
      await axiosInstance.post('/customer-auth/logout');
    } catch (error) {
      console.error('Logout API error:', error);
    } finally {
      // Clear local auth data
      this.clearAuth();
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(): Promise<string> {
    try {
      const response = await axiosInstance.post('/customer-auth/refresh');
      
      if (response.data.success) {
        const { token, customer, expires_in } = response.data.data;
        
        // Update stored data
        this.setToken(token);
        this.setCustomerData(customer);
        this.setTokenExpiry(expires_in);
        
        // Restart refresh timer
        this.initializeTokenRefresh(expires_in);
        
        // Dispatch event
        this.dispatchAuthEvent();
        
        return token;
      } else {
        throw new Error('Token refresh failed');
      }
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      this.clearAuth();
      throw new Error('Session expired. Please login again.');
    }
  }

  /**
   * Get current customer profile
   */
  async getCurrentCustomer(): Promise<Customer> {
    try {
      const response = await axiosInstance.get('/customer-auth/me');
      
      if (response.data.success) {
        const customer = response.data.data.customer;
        
        // Update stored customer data
        this.setCustomerData(customer);
        this.dispatchAuthEvent();
        
        return customer;
      } else {
        throw new Error('Failed to get customer profile');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Failed to get customer profile');
    }
  }

  /**
   * Change password
   */
  async changePassword(data: ChangePasswordData): Promise<void> {
    try {
      const response = await axiosInstance.post('/customer-auth/password/change', data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Password change failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Password change failed');
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string): Promise<void> {
    try {
      const response = await axiosInstance.post('/customer-auth/password/reset-request', {
        email
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send reset email');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to send reset email');
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(data: ResetPasswordData): Promise<void> {
    try {
      const response = await axiosInstance.post('/customer-auth/password/reset', data);
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Password reset failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Password reset failed');
    }
  }

  /**
   * Resend email verification
   */
  async resendEmailVerification(email: string): Promise<void> {
    try {
      const response = await axiosInstance.post('/customer-auth/email/resend', {
        email
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Failed to send verification email');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Failed to send verification email');
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(customerId: number, token: string): Promise<void> {
    try {
      const response = await axiosInstance.post('/customer-auth/email/verify', {
        customer_id: customerId,
        token
      });
      
      if (!response.data.success) {
        throw new Error(response.data.message || 'Email verification failed');
      }
    } catch (error: any) {
      throw new Error(error.response?.data?.message || error.message || 'Email verification failed');
    }
  }

  // ============================================
  // Token Management
  // ============================================

  /**
   * Check if customer is authenticated
   */
  isAuthenticated(): boolean {
    const token = this.getToken();
    const customer = this.getCustomerData();
    
    if (!token || !customer) {
      return false;
    }

    // Check token expiry (optional - backend will validate)
    const expiry = this.getTokenExpiry();
    if (expiry) {
      const now = Math.floor(Date.now() / 1000);
      if (now >= expiry) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Set token
   */
  setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Get stored customer data
   */
  getCustomerData(): Customer | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const data = localStorage.getItem(this.USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error parsing customer data:', error);
      return null;
    }
  }

  /**
   * Set customer data
   */
  setCustomerData(customer: Customer): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.USER_KEY, JSON.stringify(customer));
  }

  /**
   * Get token expiry timestamp
   */
  private getTokenExpiry(): number | null {
    if (typeof window === 'undefined') return null;
    
    const expiry = localStorage.getItem(this.TOKEN_EXPIRY_KEY);
    return expiry ? parseInt(expiry) : null;
  }

  /**
   * Set token expiry (in seconds from now)
   */
  private setTokenExpiry(expiresIn: number): void {
    if (typeof window === 'undefined') return;
    
    const expiryTimestamp = Math.floor(Date.now() / 1000) + expiresIn;
    localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTimestamp.toString());
  }

  /**
   * Clear all authentication data
   */
  clearAuth(): void {
    if (typeof window === 'undefined') return;
    
    // Stop token refresh
    this.stopTokenRefresh();
    
    // Clear storage
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
    localStorage.removeItem('checkout-redirect');
    
    // Dispatch events
    this.dispatchAuthEvent();
    window.dispatchEvent(new Event('cart-updated'));
  }

  /**
   * Initialize automatic token refresh
   */
  initializeTokenRefresh(expiresIn?: number): void {
    // Stop any existing refresh timer
    this.stopTokenRefresh();
    
    if (typeof window === 'undefined') return;
    
    // Get expiry time (from parameter or storage)
    let refreshTime = expiresIn;
    
    if (!refreshTime) {
      const expiry = this.getTokenExpiry();
      if (expiry) {
        const now = Math.floor(Date.now() / 1000);
        refreshTime = expiry - now;
      }
    }
    
    if (!refreshTime || refreshTime <= 0) {
      return;
    }
    
    // Refresh token 5 minutes before expiry
    const refreshIn = (refreshTime - 300) * 1000; // Convert to milliseconds
    
    if (refreshIn > 0) {
      console.log(`🔄 Customer token will refresh in ${Math.floor(refreshIn / 1000)} seconds`);
      
      this.tokenRefreshInterval = setTimeout(async () => {
        try {
          console.log('🔄 Auto-refreshing customer token...');
          await this.refreshToken();
        } catch (error) {
          console.error('Auto token refresh failed:', error);
          this.clearAuth();
        }
      }, refreshIn);
    }
  }

  /**
   * Stop token refresh timer
   */
  private stopTokenRefresh(): void {
    if (this.tokenRefreshInterval) {
      clearTimeout(this.tokenRefreshInterval);
      this.tokenRefreshInterval = null;
    }
  }

  /**
   * Dispatch authentication event
   */
  private dispatchAuthEvent(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event('customer-auth-changed'));
  }
}

// Export singleton instance
const customerAuthService = new CustomerAuthService();
export default customerAuthService;