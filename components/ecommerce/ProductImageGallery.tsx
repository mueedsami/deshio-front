'use client';

import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ProductImage {
  id: number;
  url: string;
  is_primary: boolean;
  alt_text?: string;
}

interface ProductImageGalleryProps {
  images: ProductImage[];
  productName: string;
  discountPercent?: number;
  inStock?: boolean;
}

const PLACEHOLDER_IMAGE: ProductImage = {
  id: 0,
  url: '/placeholder-product.png',
  is_primary: true,
  alt_text: 'Product',
};

const PixelScaffold = () => {
  return (
    <div className="absolute inset-0 bg-gray-50 flex flex-wrap overflow-hidden z-[5]">
      {Array.from({ length: 64 }).map((_, i) => (
        <div
          key={i}
          className="w-[12.5%] h-[12.5%] bg-gray-100 border-[0.5px] border-white/40 animate-pulse"
          style={{ animationDelay: `${(i % 8) * 40 + Math.floor(i / 8) * 40}ms` }}
        />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin opacity-20" />
      </div>
    </div>
  );
};

const ImageWithScaffold = ({ src, alt, fill, sizes, className, priority, objectFit = 'contain' }: any) => {
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
  }, [src]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {!isLoaded && <PixelScaffold />}
      <Image
        src={src || '/placeholder-product.png'}
        alt={alt}
        fill={fill}
        sizes={sizes}
        className={`${className} transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        priority={priority}
        onLoad={() => setIsLoaded(true)}
        onError={(e) => {
          if (!e.currentTarget.src.includes('/placeholder-product.png')) {
            e.currentTarget.src = '/placeholder-product.png';
          }
          setIsLoaded(true);
        }}
        style={{ objectFit }}
      />
    </div>
  );
};

const ProductImageGallery: React.FC<ProductImageGalleryProps> = memo(({
  images,
  productName,
  discountPercent = 0,
  inStock = true,
}) => {
  const safeImages = Array.isArray(images) && images.length > 0 ? images : [PLACEHOLDER_IMAGE];
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [images]);

  useEffect(() => {
    if (activeIndex > safeImages.length - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, safeImages.length]);

  const goToImage = (index: number) => {
    if (safeImages.length <= 0) return;
    const nextIndex = ((index % safeImages.length) + safeImages.length) % safeImages.length;
    setActiveIndex(nextIndex);
  };

  const prevImage = () => goToImage(activeIndex - 1);
  const nextImage = () => goToImage(activeIndex + 1);
  const activeImage = safeImages[activeIndex] || safeImages[0];

  return (
    <div className="flex w-full flex-col gap-3 md:flex-row md:gap-6">
      {/* Vertical Thumbnails (Desktop) */}
      {safeImages.length > 1 && (
        <div className="hidden md:flex md:w-16 lg:w-20 md:flex-col gap-3 flex-shrink-0">
          {safeImages.map((img, index) => (
            <button
              key={img.id || `${img.url}-${index}`}
              type="button"
              onClick={() => goToImage(index)}
              className={`relative overflow-hidden rounded-md bg-white border transition-all duration-200 ${
                activeIndex === index ? 'border-gray-900 ring-1 ring-gray-900' : 'border-gray-200 hover:border-gray-400'
              }`}
              style={{ aspectRatio: '1/1' }}
              aria-label={`Show image ${index + 1}`}
            >
              <ImageWithScaffold
                src={img.url}
                alt={`${productName} thumbnail ${index + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                objectFit="cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Main Image: button navigation only, no horizontal scroll/snap */}
      <div className="relative group min-w-0 flex-1">
        <div
          className="relative w-full overflow-hidden rounded-xl md:rounded-2xl bg-white border border-gray-100"
          style={{ aspectRatio: '4/5', maxWidth: '100%', maxHeight: '72vh' }}
        >
          <ImageWithScaffold
            key={activeImage.id || activeImage.url || activeIndex}
            src={activeImage.url}
            alt={activeImage.alt_text || `${productName} view ${activeIndex + 1}`}
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-contain bg-white"
            priority={activeIndex === 0}
            objectFit="contain"
          />

          {/* Status Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-2 z-20 sm:top-3 sm:left-3">
            {!inStock && (
              <span className="bg-black text-white px-2 py-1 rounded-sm text-[8px] font-bold tracking-widest uppercase shadow-sm">
                Out of Stock
              </span>
            )}
            {discountPercent > 0 && (
              <span className="bg-[#b83228] text-white px-2 py-1 rounded-sm text-[8px] font-bold tracking-widest uppercase">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Navigation Arrows - visible on mobile too */}
          {safeImages.length > 1 && (
            <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4 pointer-events-none z-30">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prevImage(); }}
                className="pointer-events-auto h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-white/90 border border-gray-100 shadow-sm text-gray-900 hover:bg-white active:scale-95 transition-all"
                aria-label="Previous product image"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); nextImage(); }}
                className="pointer-events-auto h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-white/90 border border-gray-100 shadow-sm text-gray-900 hover:bg-white active:scale-95 transition-all"
                aria-label="Next product image"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile thumbnails are wrapped buttons, not a scrolling strip */}
        {safeImages.length > 1 && (
          <div className="flex md:hidden flex-wrap gap-2 py-3 z-30 justify-center">
            {safeImages.map((img, index) => (
              <button
                key={img.id || `${img.url}-${index}`}
                type="button"
                onClick={() => goToImage(index)}
                className={`w-12 h-12 sm:w-14 sm:h-14 relative rounded-md overflow-hidden border-2 transition-all ${
                  activeIndex === index ? 'border-gray-900' : 'border-gray-200'
                }`}
                aria-label={`Show image ${index + 1}`}
              >
                <ImageWithScaffold src={img.url} fill sizes="56px" className="object-cover" alt="" objectFit="cover" />
              </button>
            ))}
          </div>
        )}

        {safeImages.length > 1 && (
          <div className="flex justify-center gap-2 mt-3">
            {safeImages.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Show image ${i + 1}`}
                onClick={() => goToImage(i)}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeIndex ? 'w-8 bg-gray-900' : 'w-2 bg-gray-200'
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});

export default ProductImageGallery;
