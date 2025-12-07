'use client';

import { X, ChevronLeft, ChevronRight } from 'lucide-react';

interface LightboxProps {
  image: string;
  productName: string;
  allImages: string[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
}

export default function Lightbox({
  image,
  productName,
  allImages,
  currentIndex,
  onClose,
  onNavigate,
}: LightboxProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center p-4">
      <button onClick={onClose} className="absolute top-4 right-4 text-white p-2">
        <X className="w-8 h-8" />
      </button>

      {allImages.length > 1 && (
        <>
          <button
            onClick={() => onNavigate('prev')}
            className="absolute left-4 text-white p-2"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <button
            onClick={() => onNavigate('next')}
            className="absolute right-4 text-white p-2"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </>
      )}

      <div className="max-w-5xl w-full">
        <img
          src={image}
          alt={productName}
          className="w-full h-auto max-h-[80vh] object-contain"
        />
        <div className="text-center mt-4">
          <p className="text-white text-lg font-semibold">{productName}</p>
          {allImages.length > 1 && (
            <p className="text-gray-300 text-sm mt-1">
              {currentIndex + 1} / {allImages.length}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
