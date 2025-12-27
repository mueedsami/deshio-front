"use client";

import Link from "next/link";
import Image from "next/image";
import { Sparkles } from "lucide-react";

const BRAND = "Errum";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Minimal premium background */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-rose-100/60 blur-3xl" />
        <div className="absolute -bottom-28 -right-24 h-[28rem] w-[28rem] rounded-full bg-red-100/50 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, #000 1px, transparent 0)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-16 md:pt-20 md:pb-24">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left content */}
          <div className="space-y-7">
            {/* Tiny premium badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-red-100 bg-red-50 px-3.5 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-red-700" />
              <span className="text-[11px] sm:text-xs font-semibold tracking-wide text-red-800">
                Signature Drops
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] text-gray-900 text-balance">
                {BRAND}{" "}
                <span className="bg-gradient-to-r from-red-800 to-rose-500 bg-clip-text text-transparent">
                  Lifestyle
                </span>{" "}
                essentials for everyday style
              </h1>

              <p className="text-base sm:text-lg text-gray-600 max-w-xl">
                A complete lifestyle brand — shop{" "}
                <span className="font-semibold text-gray-800">
                  shoes, clothing, watches, and bags
                </span>{" "}
                curated for comfort, quality, and a clean premium look.
              </p>
            </div>

            {/* Minimal trust line */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs sm:text-sm text-gray-500">
              <span className="inline-flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-red-700" />
                Comfort-first picks
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

            {/* ONE button only */}
            <div>
              <Link
                href="/e-commerce/products"
                className="group inline-flex items-center justify-center rounded-xl bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-black/10 transition-all hover:bg-black hover:shadow-xl hover:scale-[1.02]"
              >
                Explore Collection
                <span className="ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </Link>

              <p className="mt-3 text-[11px] text-gray-500">
                New drops & best sellers updated regularly.
              </p>
            </div>
          </div>

          {/* Right visual */}
          <div className="relative">
            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
              {/* Premium image frame */}
              <div className="relative aspect-[4/5] rounded-[2rem] bg-white p-2 shadow-2xl ring-1 ring-gray-200/60">
                <div className="relative h-full w-full overflow-hidden rounded-[1.6rem]">
                  <Image
                    src="/e-commerce-hero.jpg"
                    alt={`${BRAND} lifestyle collection`}
                    fill
                    priority
                    className="object-cover transition-transform duration-700 hover:scale-105"
                  />
                </div>
              </div>

              {/* Small floating label */}
              <div className="absolute -bottom-5 left-5 rounded-2xl bg-white/95 backdrop-blur px-4 py-2.5 shadow-xl ring-1 ring-gray-200/60">
                <p className="text-[10px] uppercase tracking-wide text-gray-500">
                  In-store & online
                </p>
                <p className="text-sm font-semibold text-gray-900">
                  Mirpur • Jamuna • Bashundhara
                </p>
              </div>
            </div>

            {/* Subtle side accent */}
            <div className="pointer-events-none absolute -right-10 top-1/2 hidden h-40 w-40 -translate-y-1/2 rotate-12 rounded-[2rem] bg-gradient-to-br from-rose-100 to-red-50 lg:block" />
          </div>
        </div>
      </div>
    </section>
  );
}
