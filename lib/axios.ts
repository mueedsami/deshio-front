import axios from 'axios';

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Public routes that don't require authentication (NO trailing slashes)
const PUBLIC_ROUTES = [
  '/catalog',        // Matches /catalog, /catalog/products, etc.
  '/login',
  '/forgot-password',
  '/reset-password',
];

// Helper function to check if route is public
const isPublicRoute = (url?: string): boolean => {
  if (!url) return false;
  return PUBLIC_ROUTES.some(route => url.includes(route));
};

// Request interceptor to add auth token (skip for public routes)
axiosInstance.interceptors.request.use(
  (config) => {
    // Skip adding token for public routes
    if (isPublicRoute(config.url)) {
      console.log('🌐 Public route detected, skipping auth:', config.url);
      return config;
    }

    // Get token from localStorage for protected routes
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔒 Protected route, adding auth:', config.url);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle 401 Unauthorized errors (but not for public routes)
    if (error.response?.status === 401 && !isPublicRoute(error.config?.url)) {
      console.log('🚫 401 error on protected route, clearing auth');
      
      // Clear auth data
      if (typeof window !== 'undefined') {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        localStorage.removeItem('userName');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('storeId');
        localStorage.removeItem('storeName');
        localStorage.removeItem('platforms');
        
        // Redirect to login page if not already there
        const currentPath = window.location.pathname;
        const publicPages = ['/login', '/signup', '/e-commerce', '/catalog', '/'];
        
        if (!publicPages.some(page => currentPath.startsWith(page))) {
          window.location.href = '/login';
        }
      }
    } else if (error.response?.status === 401 && isPublicRoute(error.config?.url)) {
      // If we get 401 on a public route, backend is incorrectly requiring auth
      console.error('⚠️ PUBLIC route returned 401 - check backend middleware:', error.config?.url);
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;