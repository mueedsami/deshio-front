'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import customerAuthService, { 
  Customer,
  CustomerRegisterData
} from '@/services/customerAuthService';

interface CustomerAuthContextType {
  customer: Customer | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  register: (data: CustomerRegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  updateCustomer: (customerData: Customer) => void;
  checkAuth: () => boolean;
  changePassword: (currentPassword: string, newPassword: string, newPasswordConfirmation: string) => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<void>;
  resetPassword: (email: string, token: string, password: string, passwordConfirmation: string) => Promise<void>;
  resendEmailVerification: (email: string) => Promise<void>;
  getProfile: () => Promise<void>;
}

const CustomerAuthContext = createContext<CustomerAuthContextType | undefined>(undefined);

export function CustomerAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Initialize auth state and set up token refresh
  useEffect(() => {
    initializeAuth();
    
    // Initialize token refresh timer
    customerAuthService.initializeTokenRefresh();
    
    // Listen for auth changes
    const handleAuthChange = () => {
      const customerData = customerAuthService.getCustomerData();
      setCustomer(customerData);
    };
    
    window.addEventListener('customer-auth-changed', handleAuthChange);
    return () => window.removeEventListener('customer-auth-changed', handleAuthChange);
  }, []);

  const initializeAuth = async () => {
    try {
      if (customerAuthService.isAuthenticated()) {
        const customerData = await customerAuthService.getCurrentCustomer();
        setCustomer(customerData);
      } else {
        customerAuthService.clearAuth();
        setCustomer(null);
      }
    } catch (error) {
      console.error('Customer auth check failed:', error);
      customerAuthService.clearAuth();
      setCustomer(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      const { customer: customerData } = await customerAuthService.login({
        email,
        password,
        remember_me: rememberMe
      });
      
      setCustomer(customerData);
      return Promise.resolve();
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const register = async (data: CustomerRegisterData) => {
    try {
      await customerAuthService.register(data);
      return Promise.resolve();
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const logout = async () => {
    try {
      await customerAuthService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setCustomer(null);
      router.push('/e-commerce');
    }
  };

  const refreshToken = async () => {
    try {
      await customerAuthService.refreshToken();
      const customerData = customerAuthService.getCustomerData();
      setCustomer(customerData);
    } catch (error: any) {
      console.error('Token refresh failed:', error);
      await logout();
      throw new Error(error.message);
    }
  };

  const getProfile = async () => {
    try {
      const customerData = await customerAuthService.getCurrentCustomer();
      setCustomer(customerData);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const changePassword = async (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string
  ) => {
    try {
      await customerAuthService.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirmation: newPasswordConfirmation
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const sendPasswordResetEmail = async (email: string) => {
    try {
      await customerAuthService.sendPasswordResetEmail(email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const resetPassword = async (
    email: string,
    token: string,
    password: string,
    passwordConfirmation: string
  ) => {
    try {
      await customerAuthService.resetPassword({
        email,
        token,
        password,
        password_confirmation: passwordConfirmation
      });
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const resendEmailVerification = async (email: string) => {
    try {
      await customerAuthService.resendEmailVerification(email);
    } catch (error: any) {
      throw new Error(error.message);
    }
  };

  const updateCustomer = (customerData: Customer) => {
    setCustomer(customerData);
    customerAuthService.setCustomerData(customerData);
  };

  const checkAuth = (): boolean => {
    return customerAuthService.isAuthenticated();
  };

  const value: CustomerAuthContextType = {
    customer,
    isAuthenticated: !!customer && customerAuthService.isAuthenticated(),
    isLoading,
    login,
    register,
    logout,
    refreshToken,
    updateCustomer,
    checkAuth,
    changePassword,
    sendPasswordResetEmail,
    resetPassword,
    resendEmailVerification,
    getProfile
  };

  return <CustomerAuthContext.Provider value={value}>{children}</CustomerAuthContext.Provider>;
}

export function useCustomerAuth() {
  const context = useContext(CustomerAuthContext);
  if (context === undefined) {
    throw new Error('useCustomerAuth must be used within a CustomerAuthProvider');
  }
  return context;
}

// Helper hook for protected customer routes
export function useRequireCustomerAuth(redirectTo: string = '/e-commerce/login') {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, isLoading, redirectTo, router]);

  return { isAuthenticated, isLoading };
}