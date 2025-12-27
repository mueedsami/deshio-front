'use client';

import React from 'react';
import Navigation from '@/components/ecommerce/Navigation';
import Footer from '@/components/ecommerce/Footer';
import Link from 'next/link';
import { CheckCircle2, ShieldCheck, Truck, Gem, Sparkles, HeartHandshake } from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen">
      <Navigation />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-rose-100/60 blur-3xl" />
          <div className="absolute -bottom-28 -right-24 h-[28rem] w-[28rem] rounded-full bg-red-100/50 blur-3xl" />
          <div
            className="absolute inset-0 opacity-[0.05]"
            style={{
              backgroundImage: 'radial-gradient(circle at 1px 1px, #000 1px, transparent 0)',
              backgroundSize: '24px 24px',
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12 md:pt-20 md:pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3.5 py-1.5">
              <Sparkles className="h-4 w-4 text-red-700" />
              <span className="text-xs font-semibold tracking-wide text-red-800">ERRUM</span>
            </div>

            <h1 className="mt-5 text-4xl sm:text-5xl font-bold leading-[1.05] text-gray-900">
              A complete lifestyle brand — built for everyday confidence.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-gray-600">
              Errum brings together <span className="font-semibold text-gray-800">shoes, clothing, watches, and bags</span> under
              one roof — with a focus on comfort, quality materials, and a clean premium look.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/e-commerce/products"
                className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-black/10 hover:bg-black transition"
              >
                Explore Collection
              </Link>
              <Link
                href="/e-commerce/contact"
                className="inline-flex items-center justify-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-50 transition"
              >
                Contact Us
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
                Comfort-first design
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
                Premium finishing
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
                Nationwide delivery
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* What we stand for */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-200 p-6 bg-white">
            <div className="flex items-center gap-3">
              <Gem className="h-5 w-5 text-red-700" />
              <h3 className="font-semibold text-gray-900">Quality that lasts</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              We focus on materials, stitching, finishing, and durability — so your everyday essentials feel premium and stay reliable.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 bg-white">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-red-700" />
              <h3 className="font-semibold text-gray-900">Comfort-first fit</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Style shouldn’t hurt. Our products are curated with comfort and wearability in mind — from daily shoes to everyday outfits.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 bg-white">
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-5 w-5 text-red-700" />
              <h3 className="font-semibold text-gray-900">Support you can trust</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Whether you shop online or in-store, our team is here to help with sizing, recommendations, and order support.
            </p>
          </div>
        </div>
      </section>

      {/* Story + Mission */}
      <section className="bg-gray-50 border-y border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Our story</h2>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Errum started with a simple idea: lifestyle essentials should be easy to shop, easy to wear, and easy to love.
                Instead of forcing you to jump between brands for footwear, outfits, watches, and bags — we curate a complete
                lifestyle experience in one place.
              </p>
              <p className="mt-4 text-gray-600 leading-relaxed">
                Today, Errum continues to grow with one goal: help people feel confident with clean design, reliable quality,
                and comfortable fits — every day.
              </p>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-semibold text-gray-900">What we focus on</h3>

              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-red-700 mt-0.5" />
                  <span>
                    <span className="font-semibold">Everyday essentials:</span> shoes, clothing, watches, and bags curated for daily use.
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-red-700 mt-0.5" />
                  <span>
                    <span className="font-semibold">Premium look, practical feel:</span> clean styles that match work, casual, and outings.
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-red-700 mt-0.5" />
                  <span>
                    <span className="font-semibold">Consistency:</span> sizing guidance, product details, and smooth customer experience.
                  </span>
                </li>
                <li className="flex gap-3">
                  <CheckCircle2 className="h-5 w-5 text-red-700 mt-0.5" />
                  <span>
                    <span className="font-semibold">Value:</span> strong quality-to-price balance without compromising on style.
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Shopping promise */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
        <h2 className="text-2xl font-bold text-gray-900">Our promise</h2>
        <p className="mt-3 text-gray-600 max-w-2xl">
          We want your Errum experience to be smooth — from browsing to delivery and after-sales support.
        </p>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-2xl border border-gray-200 p-6 bg-white">
            <div className="flex items-center gap-3">
              <Truck className="h-5 w-5 text-red-700" />
              <h3 className="font-semibold text-gray-900">Fast, careful delivery</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              We pack products carefully and ship across Bangladesh with reliable delivery partners.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 bg-white">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-red-700" />
              <h3 className="font-semibold text-gray-900">Authenticity & QC</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              We prioritize product authenticity and basic quality checks so you receive what you expect.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 bg-white">
            <div className="flex items-center gap-3">
              <HeartHandshake className="h-5 w-5 text-red-700" />
              <h3 className="font-semibold text-gray-900">Helpful support</h3>
            </div>
            <p className="mt-3 text-sm text-gray-600">
              Need sizing help or order updates? Our team responds quickly with practical guidance.
            </p>
          </div>
        </div>

        <div className="mt-10 rounded-2xl bg-gray-900 text-white p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h3 className="text-xl font-semibold">Ready to upgrade your everyday style?</h3>
            <p className="mt-2 text-sm text-gray-300">
              Explore shoes, clothing, watches, and bags — curated for the lifestyle you live.
            </p>
          </div>

          <Link
            href="/e-commerce/products"
            className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-gray-900 hover:bg-gray-100 transition"
          >
            Shop Now →
          </Link>
        </div>
      </section>

      {/* Footer (optional in your Home it was commented out, but About can keep it) */}
      <Footer />
    </div>
  );
}
