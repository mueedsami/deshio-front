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
    const imgEl = imgRef.current;
    return () => {
      if (imgEl) {
        imgEl.src = '';
        imgEl.removeAttribute('src');
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
        src={src || '/placeholder-product.png'}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={(e) => {
          if (!e.currentTarget.src.includes('/placeholder-product.png')) {
            e.currentTarget.src = '/placeholder-product.png';
          }
          setLoaded(true);
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
    setActiveIndex(firstSelectedImageIndex);
  }, [firstSelectedImageIndex, selectedVariant.id]);

  useEffect(() => {
    if (activeIndex > totalImages - 1) {
      setActiveIndex(0);
    }
  }, [activeIndex, totalImages]);

  useEffect(() => {
    const activeItem = imageItems[activeIndex];
    if (!activeItem || activeItem.variant.id === selectedVariant.id) return;
    onVariantChange(activeItem.variant);
  }, [activeIndex, imageItems, onVariantChange, selectedVariant.id]);

  const scrollToIndex = (index: number) => {
    setActiveIndex(clampIndex(index, totalImages));
  };

  const goPrevious = () => scrollToIndex(activeIndex === 0 ? totalImages - 1 : activeIndex - 1);
  const goNext = () => scrollToIndex(activeIndex === totalImages - 1 ? 0 : activeIndex + 1);

  const selectedVariantIndex = Math.max(
    0,
    variants.findIndex((variant) => variant.id === selectedVariant.id)
  );
  const activeItem = imageItems[activeIndex] || imageItems[firstSelectedImageIndex] || imageItems[0];
  const activeVariantIndex = activeItem?.variantIndex ?? selectedVariantIndex;

  const activeVariantImageCount = imageItems.filter((item) => item.variant.id === activeItem?.variant.id).length;
  const activeVariantImagePosition = activeItem
    ? imageItems.filter((item) => item.variant.id === activeItem.variant.id).findIndex((item) => item.key === activeItem.key) + 1
    : 1;

  if (totalImages === 0 || !activeItem) {
    return null;
  }

  return (
    <div className="relative group min-w-0">
      <div
        className="relative overflow-hidden rounded-xl md:rounded-2xl bg-white border border-gray-100"
        style={{ aspectRatio: '4/5', maxWidth: '100%', maxHeight: '72vh' }}
        aria-label="Variation image gallery"
      >
        <LoadedVariantImage
          key={activeItem.key}
          src={activeItem.image.url || '/placeholder-product.png'}
          alt={activeItem.image.alt_text || `${productName} variation ${activeVariantIndex + 1}`}
        />

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

        {totalImages > 1 && (
          <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2 sm:px-4 pointer-events-none z-30">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goPrevious();
              }}
              className="pointer-events-auto h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-white/90 border border-gray-100 shadow-sm text-gray-900 hover:bg-white active:scale-95 transition-all"
              aria-label="Previous variation image"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goNext();
              }}
              className="pointer-events-auto h-9 w-9 sm:h-10 sm:w-10 flex items-center justify-center rounded-full bg-white/90 border border-gray-100 shadow-sm text-gray-900 hover:bg-white active:scale-95 transition-all"
              aria-label="Next variation image"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-bold uppercase tracking-widest text-gray-500">
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
