'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Menu, X, ShoppingCart, Search, User, ChevronDown, LogOut, Heart, Package } from 'lucide-react';
import { useCustomerAuth } from '@/contexts/CustomerAuthContext';
import catalogService, { CatalogCategory } from '@/services/catalogService';
import cartService from '@/services/cartService';

const Navbar = () => {
  const router = useRouter();
  const { customer, isAuthenticated, logout } = useCustomerAuth();
  
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [cartCount, setCartCount] = useState(0);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  // Ref for dropdown to handle click outside
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch categories
  useEffect(() => {
    fetchCategories();
  }, []);

  // Fetch cart count
  useEffect(() => {
    if (isAuthenticated) {
      fetchCartCount();
    } else {
      setCartCount(0);
    }
  }, [isAuthenticated]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      if (isAuthenticated) {
        fetchCartCount();
      }
    };

    const handleAuthChange = () => {
      if (isAuthenticated) {
        fetchCartCount();
      } else {
        setCartCount(0);
      }
    };

    window.addEventListener('cart-updated', handleCartUpdate);
    window.addEventListener('customer-auth-changed', handleAuthChange);

    return () => {
      window.removeEventListener('cart-updated', handleCartUpdate);
      window.removeEventListener('customer-auth-changed', handleAuthChange);
    };
  }, [isAuthenticated]);

  // Handle click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
    };

    if (showUserDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserDropdown]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await catalogService.getCategories();
      setCategories(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load categories');
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCartCount = async () => {
    try {
      const summary = await cartService.getCartSummary();
      setCartCount(summary.total_items || 0);
    } catch (err: any) {
      console.error('Error fetching cart count:', err);
      setCartCount(0);
    }
  };

  const toggleMobileMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleDropdownToggle = (categoryId: number) => {
    setActiveDropdown(activeDropdown === categoryId ? null : categoryId);
  };

  const handleLogout = async () => {
    try {
      setShowUserDropdown(false);
      await logout();
      router.push('/e-commerce');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/e-commerce" className="flex items-center space-x-2">
              <div className="text-red-700 font-bold text-3xl">
                DESHIO
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/e-commerce" className="text-gray-700 hover:text-red-700 transition">
              Home
            </Link>

            {/* Categories Dropdown */}
            <div className="relative group">
              <button className="text-gray-700 hover:text-red-700 transition flex items-center">
                Categories
                <ChevronDown className="ml-1 h-4 w-4" />
              </button>

              {/* Dropdown Menu */}
              {!loading && categories.length > 0 && (
                <div className="absolute left-0 mt-2 w-56 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <div className="py-2">
                    {categories.map((category) => (
                      <div key={category.id}>
                        <Link
                          href={`/e-commerce/${encodeURIComponent(category.name)}`}
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                        >
                          {category.name}
                          {category.product_count > 0 && (
                            <span className="ml-2 text-xs text-gray-500">
                              ({category.product_count})
                            </span>
                          )}
                        </Link>
                        
                        {/* Sub-categories */}
                        {category.children && category.children.length > 0 && (
                          <div className="pl-4">
                            {category.children.map((child) => (
                              <Link
                                key={child.id}
                                href={`/e-commerce/${encodeURIComponent(child.name)}`}
                                className="block px-4 py-1.5 text-xs text-gray-600 hover:bg-red-50 hover:text-red-700 transition"
                              >
                                {child.name}
                                {child.product_count > 0 && (
                                  <span className="ml-2 text-gray-500">
                                    ({child.product_count})
                                  </span>
                                )}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <Link href="/e-commerce/products" className="text-gray-700 hover:text-red-700 transition">
              All Products
            </Link>

            <Link href="/e-commerce/about" className="text-gray-700 hover:text-red-700 transition">
              About
            </Link>

            <Link href="/e-commerce/contact" className="text-gray-700 hover:text-red-700 transition">
              Contact
            </Link>
          </div>

          {/* Right Side Icons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/e-commerce/search" className="text-gray-700 hover:text-red-700 transition">
              <Search className="h-5 w-5" />
            </Link>

            {/* User Account Dropdown */}
            {isAuthenticated ? (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center gap-2 text-gray-700 hover:text-red-700 transition"
                >
                  <User className="h-5 w-5" />
                  <span className="text-sm font-medium">{customer?.name?.split(' ')[0]}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>

                {showUserDropdown && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-2 z-50">
                    <Link
                      href="/e-commerce/my-account"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <User className="h-4 w-4" />
                      My Account
                    </Link>
                    <Link
                      href="/e-commerce/orders"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <Package className="h-4 w-4" />
                      My Orders
                    </Link>
                    <Link
                      href="/e-commerce/wishlist"
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                      onClick={() => setShowUserDropdown(false)}
                    >
                      <Heart className="h-4 w-4" />
                      Wishlist
                    </Link>
                    <hr className="my-2" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition text-left"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/e-commerce/login" className="text-gray-700 hover:text-red-700 transition">
                <User className="h-5 w-5" />
              </Link>
            )}

            <Link href="/e-commerce/cart" className="text-gray-700 hover:text-red-700 transition relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-700 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-red-700 focus:outline-none"
            >
              {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 pt-2 pb-4 space-y-2">
            {/* User Section for Mobile */}
            {isAuthenticated ? (
              <div className="border-b border-gray-200 pb-4 mb-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                    <User className="h-5 w-5 text-red-700" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{customer?.name}</div>
                    <div className="text-sm text-gray-500">{customer?.email}</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link
                    href="/e-commerce/my-account"
                    className="flex items-center gap-2 py-2 text-gray-700 hover:text-red-700"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="h-4 w-4" />
                    My Account
                  </Link>
                  <Link
                    href="/e-commerce/orders"
                    className="flex items-center gap-2 py-2 text-gray-700 hover:text-red-700"
                    onClick={() => setIsOpen(false)}
                  >
                    <Package className="h-4 w-4" />
                    My Orders
                  </Link>
                  <Link
                    href="/e-commerce/wishlist"
                    className="flex items-center gap-2 py-2 text-gray-700 hover:text-red-700"
                    onClick={() => setIsOpen(false)}
                  >
                    <Heart className="h-4 w-4" />
                    Wishlist
                  </Link>
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-2 py-2 text-gray-700 hover:text-red-700 w-full text-left"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-b border-gray-200 pb-4 mb-4">
                <Link
                  href="/e-commerce/login"
                  className="flex items-center gap-2 py-2 text-gray-700 hover:text-red-700"
                  onClick={() => setIsOpen(false)}
                >
                  <User className="h-5 w-5" />
                  Login / Register
                </Link>
              </div>
            )}

            <Link
              href="/e-commerce"
              className="block py-2 text-gray-700 hover:text-red-700 transition"
              onClick={() => setIsOpen(false)}
            >
              Home
            </Link>

            {/* Mobile Categories */}
            <div className="border-t border-gray-200 pt-2">
              <div className="font-semibold text-gray-900 mb-2">Categories</div>
              {loading ? (
                <div className="text-sm text-gray-500">Loading categories...</div>
              ) : error ? (
                <div className="text-sm text-red-500">{error}</div>
              ) : categories.length === 0 ? (
                <div className="text-sm text-gray-500">No categories available</div>
              ) : (
                categories.map((category) => (
                  <div key={category.id} className="mb-2">
                    <div className="flex items-center justify-between">
                      <Link
                        href={`/e-commerce/${encodeURIComponent(category.name)}`}
                        className="flex-1 py-2 text-gray-700 hover:text-red-700"
                        onClick={() => setIsOpen(false)}
                      >
                        {category.name}
                        {category.product_count > 0 && (
                          <span className="ml-2 text-xs text-gray-500">
                            ({category.product_count})
                          </span>
                        )}
                      </Link>
                      {category.children && category.children.length > 0 && (
                        <button
                          onClick={() => handleDropdownToggle(category.id)}
                          className="p-2 text-gray-700 hover:text-red-700"
                        >
                          <ChevronDown
                            className={`h-4 w-4 transition-transform ${
                              activeDropdown === category.id ? 'rotate-180' : ''
                            }`}
                          />
                        </button>
                      )}
                    </div>

                    {/* Sub-categories */}
                    {activeDropdown === category.id &&
                      category.children &&
                      category.children.length > 0 && (
                        <div className="pl-4 space-y-1 mt-1">
                          {category.children.map((child) => (
                            <Link
                              key={child.id}
                              href={`/e-commerce/${encodeURIComponent(child.name)}`}
                              className="block py-1.5 text-sm text-gray-600 hover:text-red-700"
                              onClick={() => setIsOpen(false)}
                            >
                              {child.name}
                              {child.product_count > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                  ({child.product_count})
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      )}
                  </div>
                ))
              )}
            </div>

            <Link
              href="/e-commerce/products"
              className="block py-2 text-gray-700 hover:text-red-700 transition"
              onClick={() => setIsOpen(false)}
            >
              All Products
            </Link>

            <Link
              href="/e-commerce/about"
              className="block py-2 text-gray-700 hover:text-red-700 transition"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>

            <Link
              href="/e-commerce/contact"
              className="block py-2 text-gray-700 hover:text-red-700 transition"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>

            {/* Mobile Icons */}
            <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
              <Link
                href="/e-commerce/search"
                className="text-gray-700 hover:text-red-700 transition"
                onClick={() => setIsOpen(false)}
              >
                <Search className="h-5 w-5" />
              </Link>

              <Link
                href="/e-commerce/cart"
                className="text-gray-700 hover:text-red-700 transition relative"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingCart className="h-5 w-5" />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-700 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;