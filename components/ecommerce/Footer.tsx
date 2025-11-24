'use client';

import React from 'react';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Company Info */}
          <div>
            <h3 className="text-white text-2xl font-bold mb-6">
              Deshio
            </h3>
            <p className="text-sm mb-6 leading-relaxed">
              Your destination for authentic Bangladeshi handcrafted sarees. We bring you the finest collection from skilled artisans.
            </p>
            
            {/* Social Links */}
            <div className="flex gap-3">
                <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors group"
                >
                <Facebook size={18} className="group-hover:scale-110 transition-transform" />
                </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors group"
              >
                <Twitter size={18} className="group-hover:scale-110 transition-transform" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors group"
              >
                <Instagram size={18} className="group-hover:scale-110 transition-transform" />
              </a>
              <a 
                href="#" 
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors group"
              >
                <Youtube size={18} className="group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-6 text-lg">Quick Links</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → About Us
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Shop All
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Categories
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Our Story
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Blog
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Customer Service */}
          <div>
            <h4 className="text-white font-semibold mb-6 text-lg">Customer Service</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Shipping Information
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Returns & Exchange
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Size Guide
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Track Order
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → FAQs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-red-400 transition-colors flex items-center">
                  → Privacy Policy
                </a>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="text-white font-semibold mb-6 text-lg">Contact Info</h4>
            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-red-400 flex-shrink-0 mt-1" />
                <span>123 Fashion Street, Dhaka 1205, Bangladesh</span>
              </li>
              <li className="flex items-start gap-3">
                <Phone size={18} className="text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p>+880 1XXX-XXXXXX</p>
                  <p>+880 1YYY-YYYYYY</p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Mail size={18} className="text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p>info@shareebazar.com</p>
                  <p>support@shareebazar.com</p>
                </div>
              </li>
            </ul>
            
            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-1">Working Hours</p>
              <p className="text-sm font-semibold text-white">Mon - Sat: 9AM - 9PM</p>
              <p className="text-sm text-gray-400">Sunday: Closed</p>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="border-t border-gray-800 pt-8 mb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-400">We Accept:</p>
            <div className="flex items-center gap-4">
              <div className="px-4 py-2 bg-gray-800 rounded text-xs font-semibold">Visa</div>
              <div className="px-4 py-2 bg-gray-800 rounded text-xs font-semibold">Mastercard</div>
              <div className="px-4 py-2 bg-gray-800 rounded text-xs font-semibold">bKash</div>
              <div className="px-4 py-2 bg-gray-800 rounded text-xs font-semibold">Nagad</div>
              <div className="px-4 py-2 bg-gray-800 rounded text-xs font-semibold">Rocket</div>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className="border-t border-gray-800 pt-8 text-center">
          <p className="text-sm text-gray-400">
            &copy; 2025 ShareeBazar. All rights reserved. Crafted with <span className="text-red-500">❤</span> in Bangladesh
          </p>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs">
            <a href="#" className="hover:text-red-400 transition-colors">Terms of Service</a>
            <span className="text-gray-700">•</span>
            <a href="#" className="hover:text-red-400 transition-colors">Privacy Policy</a>
            <span className="text-gray-700">•</span>
            <a href="#" className="hover:text-red-400 transition-colors">Cookie Policy</a>
          </div>
        </div>
      </div>
    </footer>
  );
}