'use client';

import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import type { ProductImage } from '@/services/catalogService';
import type { ProductVariant } from '@/app/e-commerce/product/[id]/page';

interface VariantImageScrollGalleryProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onVariantChange: (variant: ProductVariant) => void;
  productName: string;
  discountPercent?: number;
  inStock?: boolean;
}

interface VariantImageItem {
  key: string;
  variant: ProductVariant;
  variantIndex: number;
  image: ProductImage;
  imageIndex: number;
}

const VARIANT_WINDOW_RADIUS = 3;
const PLACEHOLDER_IMAGE: ProductImage = {
  id: 0,
  url: '/placeholder-product.png',
  is_primary: true,
  alt_text: 'Product',
};

const clampIndex = (value: number, total: number) => {
  if (total <= 0) return 0;
  return Math.min(Math.max(value, 0), total - 1);
};

const getImagesForVariant = (variant: ProductVariant): ProductImage[] => {
  return Array.isArray(variant.images) && variant.images.length > 0
    ? variant.images
    : [PLACEHOLDER_IMAGE];
};

const LoadedVariantImage = ({ src, alt }: { src: string; alt: string }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  useEffect(() => {
    return () => {
      if (imgRef.current) {
        imgRef.current.removeAttribute('src');
      }
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-white">
      {!loaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-gray-50">
          <div className="h-10 w-10 rounded-full border-2 border-gray-200 border-t-gray-400 opacity-30 animate-spin" />
        </div>
      )}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (!e.currentTarget.src.includes('/placeholder-product.png')) {
            e.currentTarget.src = '/placeholder-product.png';
          }
        }}
        className={`h-full w-full object-contain transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  );
};

const VariantImageScrollGallery: React.FC<VariantImageScrollGalleryProps> = memo(({
  variants,
  selectedVariant,
  onVariantChange,
  productName,
  discountPercent = 0,
  inStock = true,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);

  const imageItems = useMemo<VariantImageItem[]>(() => {
    return variants.flatMap((variant, variantIndex) => {
      return getImagesForVariant(variant).map((image, imageIndex) => ({
        key: `${variant.id}-${image.id || imageIndex}-${image.url || 'placeholder'}`,
        variant,
        variantIndex,
        image,
        imageIndex,
      }));
    });
  }, [variants]);

  const firstSelectedImageIndex = useMemo(() => {
    const index = imageItems.findIndex((item) => item.variant.id === selectedVariant.id);
    return index >= 0 ? index : 0;
  }, [imageItems, selectedVariant.id]);

  const [activeIndex, setActiveIndex] = useState(firstSelectedImageIndex);
  const totalImages = imageItems.length;
  const lastSelectedVariantIdRef = useRef(selectedVariant.id);

  useEffect(() => {
    if (lastSelectedVariantIdRef.current === selectedVariant.id) return;
    lastSelectedVariantIdRef.current = selectedVariant.id;

    const activeItem = imageItems[activeIndex];
    if (activeItem?.variant.id === selectedVariant.id) return;
    setActiveIndex(firstSelectedImageIndex);
  }, [activeIndex, firstSelectedImageIndex, imageItems, selectedVariant.id]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container || totalImages === 0) return;

    container.scrollTo({
      left: activeIndex * container.offsetWidth,
      behavior: 'smooth',
    });
  }, [activeIndex, totalImages]);

  useEffect(() => {
    const activeItem = imageItems[activeIndex];
    if (!activeItem || activeItem.variant.id === selectedVariant.id) return;
    onVariantChange(activeItem.variant);
  }, [activeIndex, imageItems, onVariantChange, selectedVariant.id]);

  const selectedVariantIndex = Math.max(
    0,
    variants.findIndex((variant) => variant.id === selectedVariant.id)
  );
  const activeItem = imageItems[activeIndex] || imageItems[firstSelectedImageIndex] || imageItems[0];
  const activeVariantIndex = activeItem?.variantIndex ?? selectedVariantIndex;

  const firstVisibleVariantIndex = Math.max(0, activeVariantIndex - VARIANT_WINDOW_RADIUS);
  const lastVisibleVariantIndex = Math.min(variants.length - 1, activeVariantIndex + VARIANT_WINDOW_RADIUS);

  const visibleItems = imageItems.filter(
    (item) => item.variantIndex >= firstVisibleVariantIndex && item.variantIndex <= lastVisibleVariantIndex
  );
  const firstVisibleImageIndex = visibleItems.length > 0 ? imageItems.findIndex((item) => item.key === visibleItems[0].key) : 0;
  const trailingCount = Math.max(0, totalImages - firstVisibleImageIndex - visibleItems.length);

  const scrollToIndex = (index: number) => {
    setActiveIndex(clampIndex(index, totalImages));
  };

  const handleScroll = () => {
    const container = scrollRef.current;
    if (!container || totalImages === 0) return;

    if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    rafRef.current = window.requestAnimationFrame(() => {
      const nextIndex = clampIndex(Math.round(container.scrollLeft / container.offsetWidth), totalImages);
      setActiveIndex((current) => (current === nextIndex ? current : nextIndex));
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const activeVariantImageCount = imageItems.filter((item) => item.variant.id === activeItem?.variant.id).length;
  const activeVariantImagePosition = activeItem
    ? imageItems.filter((item) => item.variant.id === activeItem.variant.id).findIndex((item) => item.key === activeItem.key) + 1
    : 1;

  if (totalImages === 0) {
    return null;
  }

  return (
    <div className="relative group">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="relative overflow-x-auto snap-x snap-mandatory scroll-smooth no-scrollbar rounded-lg md:rounded-2xl bg-white"
        style={{ aspectRatio: '4/5', maxWidth: '100%' }}
        aria-label="Variation image gallery"
      >
        <div className="flex h-full" style={{ width: `${totalImages * 100}%` }}>
          {firstVisibleImageIndex > 0 && (
            <div style={{ flex: `0 0 ${(firstVisibleImageIndex / totalImages) * 100}%` }} />
          )}

          {visibleItems.map((item) => (
            <div
              key={item.key}
              className="snap-start h-full flex-shrink-0"
              style={{ flex: `0 0 ${100 / totalImages}%` }}
            >
              <LoadedVariantImage
                src={item.image.url || '/placeholder-product.png'}
                alt={item.image.alt_text || `${productName} variation ${item.variantIndex + 1}`}
              />
            </div>
          ))}

          {trailingCount > 0 && (
            <div style={{ flex: `0 0 ${(trailingCount / totalImages) * 100}%` }} />
          )}
        </div>

        <div className="absolute top-0 left-0 flex flex-col gap-2 z-20">
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

        {totalImages > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 hidden md:flex items-center justify-between px-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-30">
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(activeIndex === 0 ? totalImages - 1 : activeIndex - 1);
              }}
              className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full bg-white/80 border border-gray-100 shadow-sm text-gray-900 hover:bg-white transition-all"
              aria-label="Previous variation image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                scrollToIndex(activeIndex === totalImages - 1 ? 0 : activeIndex + 1);
              }}
              className="pointer-events-auto h-10 w-10 flex items-center justify-center rounded-full bg-white/80 border border-gray-100 shadow-sm text-gray-900 hover:bg-white transition-all"
              aria-label="Next variation image"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
        <span>
          Image {activeIndex + 1} / {totalImages}
        </span>
        {activeVariantImageCount > 1 && (
          <span>
            Variant image {activeVariantImagePosition} / {activeVariantImageCount}
          </span>
        )}
      </div>
    </div>
  );
});

export default VariantImageScrollGallery;
