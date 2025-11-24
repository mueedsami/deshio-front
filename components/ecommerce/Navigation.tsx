import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Menu, X, ShoppingCart, Search, User, ChevronDown } from 'lucide-react';
import catalogService, { CatalogCategory } from '@/services/catalogService';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

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

  const toggleMobileMenu = () => {
    setIsOpen(!isOpen);
  };

  const handleDropdownToggle = (categoryId: number) => {
    setActiveDropdown(activeDropdown === categoryId ? null : categoryId);
  };

  return (
    <nav className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link href="/e-commerce" className="flex items-center space-x-2">
              <div className="text-red-800 font-bold text-3xl">
                DESHIO
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/e-commerce" className="text-gray-700 hover:text-red-800 transition">
              Home
            </Link>

            {/* Categories Dropdown */}
            <div className="relative group">
              <button className="text-gray-700 hover:text-red-800 transition flex items-center">
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
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-red-80 hover:text-red-800 transition"
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
                                href={`/categories/${encodeURIComponent(child.name)}`}
                                className="block px-4 py-1.5 text-xs text-gray-600 hover:bg-red-80 hover:text-red-800 transition"
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

            <Link href="/products" className="text-gray-700 hover:text-red-800 transition">
              All Products
            </Link>

            <Link href="/about" className="text-gray-700 hover:text-red-800 transition">
              About
            </Link>

            <Link href="/contact" className="text-gray-700 hover:text-red-800 transition">
              Contact
            </Link>
          </div>

          {/* Right Side Icons */}
          <div className="hidden md:flex items-center space-x-4">
            <Link href="/search" className="text-gray-700 hover:text-red-800 transition">
              <Search className="h-5 w-5" />
            </Link>

            <Link href="/account" className="text-gray-700 hover:text-red-800 transition">
              <User className="h-5 w-5" />
            </Link>

            <Link href="/cart" className="text-gray-700 hover:text-red-800 transition relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute -top-2 -right-2 bg-red-800 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                0
              </span>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={toggleMobileMenu}
              className="text-gray-700 hover:text-red-800 focus:outline-none"
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
            <Link
              href="/"
              className="block py-2 text-gray-700 hover:text-red-800 transition"
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
                        href={`/categories/${encodeURIComponent(category.name)}`}
                        className="flex-1 py-2 text-gray-700 hover:text-red-800"
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
                          className="p-2 text-gray-700 hover:text-red-800"
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
                              href={`/categories/${encodeURIComponent(child.name)}`}
                              className="block py-1.5 text-sm text-gray-600 hover:text-red-800"
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
              href="/products"
              className="block py-2 text-gray-700 hover:text-red-800 transition"
              onClick={() => setIsOpen(false)}
            >
              All Products
            </Link>

            <Link
              href="/about"
              className="block py-2 text-gray-700 hover:text-red-800 transition"
              onClick={() => setIsOpen(false)}
            >
              About
            </Link>

            <Link
              href="/contact"
              className="block py-2 text-gray-700 hover:text-red-800 transition"
              onClick={() => setIsOpen(false)}
            >
              Contact
            </Link>

            {/* Mobile Icons */}
            <div className="flex items-center space-x-4 pt-4 border-t border-gray-200">
              <Link
                href="/search"
                className="text-gray-700 hover:text-red-800 transition"
                onClick={() => setIsOpen(false)}
              >
                <Search className="h-5 w-5" />
              </Link>

              <Link
                href="/account"
                className="text-gray-700 hover:text-red-800 transition"
                onClick={() => setIsOpen(false)}
              >
                <User className="h-5 w-5" />
              </Link>

              <Link
                href="/cart"
                className="text-gray-700 hover:text-red-800 transition relative"
                onClick={() => setIsOpen(false)}
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-2 -right-2 bg-red-800 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  0
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;