'use client';

import React from 'react';
import Navigation from '@/components/ecommerce/Navigation';
import HeroSection from '@/components/ecommerce/HeroSection';
import OurCategories from '@/components/ecommerce/OurCategories';
import FeaturedProducts from '@/components/ecommerce/FeaturedProducts';
import NewArrivals from '@/components/ecommerce/NewArrivals';
import Footer from '@/components/ecommerce/Footer';

export default function HomePage() {
  return (
    <div className="bg-white min-h-screen">
      {/* Navigation Bar */}
      <Navigation />
      
      {/* Hero Section */}
      <HeroSection />
      
      {/* Categories Section */}
      <OurCategories />
      
      {/* Featured Products Section */}
      <FeaturedProducts />
      
      {/* New Arrivals Section */}
      <NewArrivals />
            
      {/* Footer */}
      <Footer />
    </div>
  );
}