'use client';

import React from 'react';
import Link from 'next/link';
import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';
import { Mail, MapPin, Phone, Clock, Facebook, MessageCircle } from 'lucide-react';

import {
  CLIENT_NAME,
  CLIENT_EMAIL,
  CLIENT_PHONE,
  CLIENT_MOBILE,
  CLIENT_ADDRESS,
  CLIENT_SUPPORT_HOURS,
  CLIENT_FACEBOOK,
} from '@/lib/constants';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-8 md:p-10">
            <p className="text-[11px] uppercase tracking-widest text-gray-500">Contact {CLIENT_NAME}</p>
            <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">We&apos;re here to help</h1>
            <p className="mt-4 max-w-2xl text-sm sm:text-base text-gray-600">
              Need order help, product info, or delivery support? Reach us anytime during our support hours.
            </p>

            <div className="mt-8 grid md:grid-cols-3 gap-6">
              <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-6">
                <div className="flex items-center gap-2">
                  <Phone className="h-5 w-5 text-red-700" />
                  <h3 className="text-base font-bold text-gray-900">Call</h3>
                </div>
                <div className="mt-4 space-y-2 text-sm">
                  <p className="text-gray-700">
                    <span className="font-semibold">Phone:</span> {CLIENT_PHONE}
                  </p>
                  <p className="text-gray-700">
                    <span className="font-semibold">Mobile:</span> {CLIENT_MOBILE}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-6">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-red-700" />
                  <h3 className="text-base font-bold text-gray-900">Email</h3>
                </div>
                <p className="mt-4 text-sm text-gray-700">{CLIENT_EMAIL}</p>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-6">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-red-700" />
                  <h3 className="text-base font-bold text-gray-900">Support Hours</h3>
                </div>
                <p className="mt-4 text-sm text-gray-700">{CLIENT_SUPPORT_HOURS}</p>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-700" />
                <h3 className="text-base font-bold text-gray-900">Address</h3>
              </div>
              <p className="mt-3 text-sm text-gray-700 leading-relaxed">{CLIENT_ADDRESS}</p>
            </div>

            <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-6">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-red-700" />
                <h3 className="text-base font-bold text-gray-900">Our Facebook</h3>
              </div>
              <p className="mt-3 text-sm text-gray-700">
                Follow updates, new arrivals & community posts on <span className="font-semibold">Deshio-দেশীয়</span>.
              </p>
              <Link
                href={CLIENT_FACEBOOK}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
              >
                <Facebook size={18} /> Visit Facebook
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
