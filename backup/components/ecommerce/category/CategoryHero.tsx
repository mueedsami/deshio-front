import React from "react";

export default function CategoryHero({ title, description, image }: any) {
  return (
    <section className="relative overflow-hidden bg-white">
      {/* Soft background and image wash */}
      <div className="absolute inset-0">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-rose-100/60 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-red-100/50 blur-3xl" />
        {image && (
          <img
            src={image}
            alt={title}
            className="absolute inset-0 w-full h-full object-cover opacity-[0.10]"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-white/70" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 md:py-20">
        <div className="max-w-2xl">
          <p className="text-[11px] uppercase tracking-widest text-gray-500">
            Category
          </p>
          <h1 className="mt-2 text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900">
            {title}
          </h1>
          {description && (
            <p className="mt-4 text-sm sm:text-base text-gray-600">
              {description}
            </p>
          )}

          {/* No aggressive button here to keep it premium-clean */}
          {/* If you want one later, we can add a subtle link-style CTA */}
        </div>
      </div>
    </section>
  );
}
