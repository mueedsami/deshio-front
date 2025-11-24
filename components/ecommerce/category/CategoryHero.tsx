import React from 'react';

export default function CategoryHero({ title, description, image }: any) {
  return (
    <div className="relative h-96 bg-gradient-to-r from-gray-100 to-gray-50 overflow-hidden">
      <div className="absolute inset-0">
        <img
          src={image}
          alt={title}
          className="w-full h-full object-cover opacity-20"
        />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
        <div className="max-w-xl">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">{title}</h1>
          <p className="text-lg text-gray-700 mb-6">{description}</p>
          <button className="bg-red-700 text-white px-8 py-3 rounded font-semibold hover:bg-red-800 transition-colors">
            SHOP NOW
          </button>
        </div>
      </div>
    </div>
  );
}