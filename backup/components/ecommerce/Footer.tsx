"use client";

import React from "react";
import Link from "next/link";
import { Facebook, Instagram, Youtube, MapPin, Phone, MessageCircle } from "lucide-react";

const BRAND = "Errum";

const stores = [
  {
    name: "Mirpur 12",
    address: "Level 3, Hazi Kujrat Ali Mollah Market, Mirpur 12",
    phone: "01942565664",
  },
  {
    name: "Jamuna Future Park",
    address: "3C-17A, Level 3, Jamuna",
    phone: "01307130535",
  },
  {
    name: "Bashundhara City",
    address: "38, 39, 40, Block D, Level 5, Bashundhara",
    phone: "01336041064",
  },
];

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="relative bg-gray-950 text-gray-300">
      {/* Thin luxury accent */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-rose-400/60 to-transparent" />

      {/* Soft background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-10 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-red-500/10 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main grid */}
        <div className="py-14 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* LEFT: Brand + socials */}
          <div className="space-y-4">
            <div>
              <h3 className="text-white text-2xl font-bold tracking-tight">
                {BRAND}
              </h3>
              <p className="text-sm text-gray-400 mt-2 max-w-sm">
  A complete lifestyle brand — footwear, clothing, watches, and bags curated for everyday confidence.
</p>

            </div>

            {/* Minimal quick nav (optional tiny) */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
              <Link href="/e-commerce/products" className="text-gray-400 hover:text-white transition">
                Collection
              </Link>
              <Link href="/e-commerce/categories" className="text-gray-400 hover:text-white transition">
                Categories
              </Link>
              <Link href="/e-commerce/contact" className="text-gray-400 hover:text-white transition">
                Contact
              </Link>
            </div>

            {/* Social icons */}
            <div className="flex gap-3 pt-2">
              {[
                { Icon: Facebook, href: "#" },
                { Icon: Instagram, href: "#" },
                { Icon: Youtube, href: "#" },
              ].map(({ Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition"
                  aria-label="social"
                >
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          {/* MIDDLE: Small brand reassurance (no heavy links) */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold text-base">
              Shopping Promise
            </h4>

            <div className="space-y-3">
              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm font-semibold text-white">
                  Comfort & quality assured
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Thoughtfully selected designs with quality finishing.
                </p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm font-semibold text-white">
                  In-store & Online Support
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Visit us or order easily with responsive customer service.
                </p>
              </div>

              <div className="rounded-xl bg-white/5 border border-white/10 p-4">
                <p className="text-sm font-semibold text-white">
                  Nationwide Delivery
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Smooth and reliable delivery across Bangladesh.
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT: Addresses + phones */}
          <div className="space-y-5">
            <h4 className="text-white font-semibold text-base">
              Stores & Contact
            </h4>

            <div className="space-y-4">
              {stores.map((store) => (
                <div
                  key={store.name}
                  className="rounded-xl bg-white/5 border border-white/10 p-4"
                >
                  <p className="text-sm font-semibold text-white">
                    {store.name}
                  </p>
                  <div className="mt-2 space-y-2 text-sm text-gray-400">
                    <div className="flex items-start gap-2">
                      <MapPin size={16} className="mt-0.5 text-rose-300" />
                      <span>{store.address}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={15} className="text-rose-300" />
                      <span>{store.phone}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* WhatsApp international */}
            <div className="rounded-xl bg-gradient-to-r from-white/5 to-white/0 border border-white/10 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">
                International Orders
              </p>
              <div className="mt-2 flex items-center gap-2">
                <MessageCircle size={16} className="text-green-300" />
                <p className="text-sm text-white">
                  WhatsApp: <span className="font-semibold">01942565664</span>
                </p>
                <span className="text-xs text-gray-500">✈️</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-white/10 py-7 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="text-xs text-gray-500">
            © {year} {BRAND}. All rights reserved.
          </p>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="rounded-md bg-white/5 border border-white/10 px-2.5 py-1">
              bKash
            </span>
            <span className="rounded-md bg-white/5 border border-white/10 px-2.5 py-1">
              Nagad
            </span>
            <span className="rounded-md bg-white/5 border border-white/10 px-2.5 py-1">
              Card
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
