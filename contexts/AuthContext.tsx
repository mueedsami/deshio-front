"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import authService, { LoginCredentials, Employee } from '@/services/authService';

interface AuthContextType {
  user: Employee | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // Check if user is authenticated on mount and initialize token refresh
  useEffect(() => {
    checkAuth();
    // Initialize token refresh timer if user has valid session
    authService.initializeTokenRefresh();
  }, []);

  // Monitor token validity and redirect if expired
  useEffect(() => {
    // Public frontend routes that don't need authentication
    const publicRoutes = ['/login', '/forgot-password', '/e-commerce', '/catalog'];
    
    // Check if current path is public (exact match or starts with route/)
    const isPublicRoute = publicRoutes.some(route => 
      pathname === route || pathname?.startsWith(route + '/')
    );
    
    // Home page is also public
    const isHomePage = pathname === '/';
    
    // Skip auth checks for public routes, home page, or during initial load
    if (isPublicRoute || isHomePage || isLoading) {
      return;
    }

    // Check token validity periodically (every 30 seconds) for protected routes
    const interval = setInterval(() => {
      if (!authService.isAuthenticated() && user) {
        console.log('⏰ Token expired, logging out');
        logout();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [pathname, user, isLoading]);

  const checkAuth = async () => {
    try {
      if (authService.isAuthenticated()) {
        const employee = await authService.getCurrentUser();
        setUser(employee);
        authService.setUserData(employee);
      } else {
        // Token is expired or invalid
        authService.clearAuth();
        setUser(null);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      authService.clearAuth();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    try {
      // Login handles token storage and auto-refresh setup
      await authService.login(credentials);
      const employee = await authService.getCurrentUser();
      setUser(employee);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      authService.clearAuth();
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    try {
      const employee = await authService.getCurrentUser();
      setUser(employee);
      authService.setUserData(employee);
    } catch (error) {
      console.error('Refresh user error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}