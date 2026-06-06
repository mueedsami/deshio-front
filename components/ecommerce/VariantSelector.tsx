'use client';

import React, { useState } from 'react';

import type { ProductVariant } from '@/app/e-commerce/product/[id]/page';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onVariantChange: (variant: ProductVariant) => void;
  baseName?: string;
}

const LARGE_VARIANT_THRESHOLD = 15;

const formatVariantLabelForCard = (v: ProductVariant) => {
  // Product detail page now shows the full product_name for every variation card.
  const productName = String(v.name || '').trim();
  return productName || 'Standard';
};

const VariantCard = ({
  variant,
  selected,
  onSelect,
}: {
  variant: ProductVariant;
  selected: boolean;
  onSelect?: () => void;
}) => {
  const isAvailable = variant.in_stock && (variant.available_inventory ?? 0) > 0;
  const displayLabel = formatVariantLabelForCard(variant);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-disabled={!onSelect}
      tabIndex={!onSelect ? -1 : 0}
      className={`group relative flex items-center justify-center min-h-11 min-w-[44px] max-w-full px-3 sm:px-4 py-2 rounded-lg border text-[10px] sm:text-[11px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 whitespace-normal text-center leading-snug flex-shrink-0 ${
        selected
          ? 'bg-black border-black text-white shadow-md'
          : isAvailable
            ? 'bg-white border-gray-200 text-gray-900 hover:border-black'
            : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
      } ${!onSelect ? 'cursor-default' : ''}`}
    >
      <span className="relative z-10 line-clamp-2">{displayLabel}</span>
      {!isAvailable && (
        <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none opacity-50">
          <div className="w-[150%] h-[1px] bg-current -rotate-45" />
        </div>
      )}
    </button>
  );
};

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onVariantChange,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const activeLabel = formatVariantLabelForCard(selectedVariant);
  const shouldUseDropdown = variants.length > LARGE_VARIANT_THRESHOLD;
  
  // Check if variants are primarily numeric sizes to adjust label
  const isSizeSet = variants.some(v => {
    const l = `${v.variation_suffix || ''} ${v.size || ''}`.toLowerCase();
    return /\d/.test(l) || l.includes('us') || l.includes('eu') || l.includes('uk');
  });

  if (shouldUseDropdown) {
    return (
      <div className="space-y-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="text-[10px] font-bold tracking-widest text-gray-900 uppercase">
              {isSizeSet ? 'Selected Size' : 'Selected Option'}:
            </span>
            <span className="text-[10px] font-semibold text-[#b83228] uppercase tracking-wider">
              {activeLabel}
            </span>
          </div>

          <div className="flex">
            <VariantCard variant={selectedVariant} selected />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            <button
              type="button"
              onClick={() => setDropdownOpen(open => !open)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <span>Choose from {variants.length} variations</span>
              <span className="text-gray-400">{dropdownOpen ? 'Close' : 'Open'}</span>
            </button>

            {dropdownOpen && (
              <div className="max-h-72 overflow-y-auto border-t border-gray-100 p-3">
                <div className="flex flex-wrap gap-2.5">
                  {variants.map((v) => {
                    const isSelected = selectedVariant.id === v.id;
                    return (
                      <VariantCard
                        key={v.id}
                        variant={v}
                        selected={isSelected}
                        onSelect={() => {
                          onVariantChange(v);
                          setDropdownOpen(false);
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="text-[10px] font-bold tracking-widest text-gray-900 uppercase">
            {isSizeSet ? 'Select Size' : 'Select Option'}:
          </span>
          <span className="text-[10px] font-semibold text-[#b83228] uppercase tracking-wider">
            {activeLabel}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {variants.map((v) => {
            const isSelected = selectedVariant.id === v.id;
            return (
              <VariantCard
                key={v.id}
                variant={v}
                selected={isSelected}
                onSelect={() => onVariantChange(v)}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VariantSelector;
