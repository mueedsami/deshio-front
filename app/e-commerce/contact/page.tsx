"use client";

import React from "react";
import Navigation from "@/components/ecommerce/Navigation";
import { Phone, MapPin, MessageCircle } from "lucide-react";

const locations = [
  {
    title: "Mirpur 12",
    address: "Level 3, Hazi Kujrat Ali Mollah Market, Mirpur 12",
    phone: "01942565664",
  },
  {
    title: "Jamuna",
    address: "3C-17A, Level 3, Jamuna",
    phone: "01307130535",
  },
  {
    title: "Bashundhara",
    address: "38, 39, 40, Block D, Level 5, Bashundhara",
    phone: "01336041064",
  },
];

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      {/* Header */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl" />
          <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-red-100/50 blur-3xl" />
          <div className="absolute inset-0 bg-gradient-to-b from-white via-white/95 to-white" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-18">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">
            Contact Errum
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-gray-900">
            We&apos;re here to help.
          </h1>
          <p className="mt-4 max-w-2xl text-sm sm:text-base text-gray-600">
            Visit one of our stores or reach us on phone/WhatsApp for quick
            assistance and international orders.
          </p>
        </div>
      </section>

      {/* Locations */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-3 gap-6">
          {locations.map((loc) => (
            <div
              key={loc.title}
              className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm hover:shadow-md transition"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-red-700" />
                <h3 className="text-base font-bold text-gray-900">
                  {loc.title}
                </h3>
              </div>
              <p className="mt-3 text-sm text-gray-600 leading-relaxed">
                {loc.address}
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <Phone className="h-4 w-4 text-gray-700" />
                <span className="text-sm font-semibold text-gray-900">
                  {loc.phone}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* WhatsApp + International */}
        <div className="mt-10 rounded-2xl border border-gray-100 bg-gray-50/40 p-6">
          <div className="flex items-start sm:items-center gap-3 sm:gap-4 flex-col sm:flex-row justify-between">
            <div>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-red-700" />
                <h3 className="text-base font-bold text-gray-900">
                  WhatsApp for International Orders ✈️
                </h3>
              </div>
              <p className="mt-2 text-sm text-gray-600">
                For overseas orders and fast support, message us directly.
              </p>
            </div>

            <div className="rounded-xl bg-white border border-gray-100 px-4 py-2 text-sm font-semibold text-gray-900">
              WhatsApp: 01942565664
            </div>
          </div>
        </div>
      </section>

      {/* Optional simple contact form (no API required) */}
      <section className="border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <h2 className="text-xl font-bold text-gray-900">
            Send us a message
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            This form is UI-only for now. You can connect it to your API later.
          </p>

          <div className="mt-6 grid gap-4">
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Your name"
            />
            <input
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Your phone number"
            />
            <textarea
              rows={5}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-red-200"
              placeholder="Your message"
            />
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-xl bg-gray-900 px-5 py-3 text-xs sm:text-sm font-semibold text-white hover:bg-black transition"
              onClick={() => {
                alert("Message form is not connected yet.");
              }}
            >
              Send message
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
