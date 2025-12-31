'use client';

import Image from 'next/image';
import Link from 'next/link';
import React from 'react';
import { Facebook, Instagram, Youtube, Mail, Phone, MapPin, Clock, Heart } from 'lucide-react';

import {
  CLIENT_NAME,
  CLIENT_EMAIL,
  CLIENT_PHONE,
  CLIENT_MOBILE,
  CLIENT_ADDRESS,
  CLIENT_SUPPORT_HOURS,
  CLIENT_FACEBOOK,
} from '@/lib/constants';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Main */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-12">
          {/* Column 1: Logo + text + social */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-12 h-12 rounded-xl bg-white/10 overflow-hidden border border-white/10">
                <Image
                  src="/logo.png"
                  alt={`${CLIENT_NAME} logo`}
                  fill
                  className="object-contain p-2"
                  priority
                />
              </div>
              <div>
                <p className="text-white text-xl font-bold leading-none">{CLIENT_NAME}</p>
                <p className="text-[11px] text-gray-400">বেস্ট প্রাইসে বেস্ট কোয়ালিটি</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-gray-300/90 mb-6">
              “এটা কোনো বিজনেস পেজ না, বরং একটা ফ্যামিলি” — দেশীয় তে পাবেন মেয়েদের কুর্তি, থ্রি পিছ,
              ব্লক ড্রেস, জামদানি/মণিপুরী/বাটিক শাড়ি এবং হোম ডেকোর আইটেম।
            </p>

            <div className="flex gap-3">
              <a
                href={CLIENT_FACEBOOK}
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors group"
              >
                <Facebook size={18} className="group-hover:scale-110 transition-transform" />
              </a>

              {/* Optional placeholders */}
              <a
                href="#"
                aria-label="Instagram"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors group"
              >
                <Instagram size={18} className="group-hover:scale-110 transition-transform" />
              </a>
              <a
                href="#"
                aria-label="YouTube"
                className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-red-600 transition-colors group"
              >
                <Youtube size={18} className="group-hover:scale-110 transition-transform" />
              </a>
            </div>
          </div>

          {/* Column 2: Links */}
          <div>
            <h4 className="text-white font-semibold mb-6 text-lg">Explore</h4>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/e-commerce/about-us" className="hover:text-red-400 transition-colors flex items-center">
                  → About Us
                </Link>
              </li>
              <li>
                <Link href="/e-commerce/categories" className="hover:text-red-400 transition-colors flex items-center">
                  → Categories
                </Link>
              </li>
              <li>
                <Link href="/e-commerce/our-story" className="hover:text-red-400 transition-colors flex items-center">
                  → Our Story
                </Link>
              </li>
              <li>
                <Link href="/e-commerce/contact" className="hover:text-red-400 transition-colors flex items-center">
                  → Contact
                </Link>
              </li>
              <li>
                <Link href="/e-commerce/order-tracking" className="hover:text-red-400 transition-colors flex items-center">
                  → Track Order
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Contact info */}
          <div>
            <h4 className="text-white font-semibold mb-6 text-lg">Contact</h4>

            <ul className="space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <MapPin size={18} className="text-red-400 flex-shrink-0 mt-1" />
                <span>{CLIENT_ADDRESS}</span>
              </li>

              <li className="flex items-start gap-3">
                <Phone size={18} className="text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p>Phone: {CLIENT_PHONE}</p>
                  <p>Mobile: {CLIENT_MOBILE}</p>
                </div>
              </li>

              <li className="flex items-start gap-3">
                <Mail size={18} className="text-red-400 flex-shrink-0 mt-1" />
                <div>
                  <p>{CLIENT_EMAIL}</p>
                </div>
              </li>
            </ul>

            <div className="mt-6 p-4 bg-gray-800 rounded-lg">
              <p className="text-xs text-gray-400 mb-1 flex items-center gap-2">
                <Clock className="w-4 h-4" /> Support hours
              </p>
              <p className="text-sm font-semibold text-white">{CLIENT_SUPPORT_HOURS}</p>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-gray-400">
            <p>
              {CLIENT_NAME} &copy; 2026. All rights reserved. Crafted with{' '}
              <span className="inline-flex items-center gap-1 text-red-500">
                <Heart className="w-4 h-4" />
              </span>{' '}
              in Bangladesh.
            </p>
            <p>
              Developed by{' '}
              <span className="text-gray-200 font-medium">mADestic Digital</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
