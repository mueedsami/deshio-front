'use client';

import React from 'react';

import { ProductVariant } from '@/app/e-commerce/product/[id]/page';

interface VariantSelectorProps {
  variants: ProductVariant[];
  selectedVariant: ProductVariant;
  onVariantChange: (variant: ProductVariant) => void;
  baseName?: string;
}

const formatVariantLabelForCard = (v: ProductVariant) => {
  // Use variation_suffix as the primary source of truth
  let source = v.variation_suffix || v.name || '';

  // Strip only leading dashes as requested
  let clean = source.trim();
  while (clean.startsWith('-')) {
    clean = clean.substring(1).trim();
  }
  
  return clean || 'Standard';
};

const VariantSelector: React.FC<VariantSelectorProps> = ({
  variants,
  selectedVariant,
  onVariantChange,
}) => {
  const activeLabel = formatVariantLabelForCard(selectedVariant);
  
  // Check if variants are primarily numeric sizes to adjust label
  const isSizeSet = variants.some(v => {
    const l = formatVariantLabelForCard(v).toLowerCase();
    return /\d/.test(l) || l.includes('us') || l.includes('eu') || l.includes('uk');
  });

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
            const isAvailable = v.in_stock && (v.available_inventory ?? 0) > 0;
            const label = formatVariantLabelForCard(v);
            
            // Show full label as requested, no more stripping
            const displayLabel = label;

            return (
              <button
                key={v.id}
                onClick={() => onVariantChange(v)}
                className={`group relative flex items-center justify-center h-11 min-w-[44px] px-4 rounded-lg border text-[11px] font-bold uppercase tracking-wider transition-all duration-300 active:scale-95 whitespace-nowrap flex-shrink-0 ${
                  isSelected
                    ? 'bg-black border-black text-white shadow-md'
                    : isAvailable
                      ? 'bg-white border-gray-200 text-gray-900 hover:border-black'
                      : 'bg-gray-50 border-gray-100 text-gray-300 cursor-not-allowed'
                }`}
              >
                <span className="relative z-10">{displayLabel}</span>
                
                {!isAvailable && (
                  <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none opacity-50">
                    <div className="w-[150%] h-[1px] bg-current -rotate-45" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default VariantSelector;
