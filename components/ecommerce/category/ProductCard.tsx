import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Eye, ShoppingCart } from "lucide-react";
import { useCart } from "@/app/e-commerce/CartContext";

interface ProductCardProps {
  product: any;
  onCartOpen?: () => void;
}

export default function ProductCard({ product, onCartOpen }: ProductCardProps) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isHovered, setIsHovered] = useState(false);
  const [isAdding, setIsAdding] = useState(false);

  const navigateToProduct = (productId: string | number) => {
    router.push(`/e-commerce/product/${productId}`);
  };

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (product.variations.length > 1) {
      navigateToProduct(product.variations[0].id);
      return;
    }
    setIsAdding(true);
    await addToCart(product.variations[0].id, 1);
    setTimeout(() => {
      setIsAdding(false);
      onCartOpen?.();
    }, 1200);
  };

  // Discount-aware pricing
  const firstVariation = product.variations?.[0];
  const hasDiscount = product.has_discount || firstVariation?.has_discount;
  const originalPrice = product.original_price ?? firstVariation?.original_price;
  const sellingPrice = product.selling_price ?? firstVariation?.selling_price;
  const discountPercentage = product.discount_percentage ?? firstVariation?.discount_percentage;
  const activeCampaign = product.active_campaign ?? firstVariation?.active_campaign;

  const priceText = (() => {
    try {
      const price = sellingPrice != null ? parseFloat(sellingPrice) : null;
      if (price !== null && !isNaN(price)) return `${price.toLocaleString()}.00৳`;
      if (product.priceRange?.includes("-")) return `${product.priceRange}৳`;
      const v = parseFloat(product.priceRange);
      if (!isNaN(v)) return `${v.toLocaleString()}.00৳`;
      return `${product.priceRange}৳`;
    } catch {
      return `${product.priceRange}৳`;
    }
  })();

  const originalPriceText = (() => {
    if (!hasDiscount || originalPrice == null) return null;
    const p = parseFloat(originalPrice);
    return isNaN(p) ? null : `${p.toLocaleString()}.00৳`;
  })();

  return (
    <div
      className="group rounded-2xl bg-white border border-gray-100 overflow-hidden transition-all duration-300 hover:shadow-xl hover:shadow-black/5"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        onClick={() => navigateToProduct(firstVariation?.id)}
        className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.baseName}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition" />

        {/* Discount badge */}
        {hasDiscount && discountPercentage && (
          <div className="absolute top-3 left-3 z-10">
            <span className="bg-red-500 text-white text-[11px] font-bold px-2 py-1 rounded-lg shadow">
              -{Math.round(discountPercentage)}%
            </span>
          </div>
        )}

        {/* Floating actions */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          <button
            onClick={(e) => e.stopPropagation()}
            className="h-9 w-9 rounded-full bg-white/95 backdrop-blur border border-gray-100 shadow-sm flex items-center justify-center text-gray-700 hover:text-red-700 transition"
            aria-label="Wishlist"
          >
            <Heart className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigateToProduct(firstVariation?.id);
            }}
            className="h-9 w-9 rounded-full bg-white/95 backdrop-blur border border-gray-100 shadow-sm flex items-center justify-center text-gray-700 hover:text-gray-900 transition"
            aria-label="Quick view"
          >
            <Eye className="h-4 w-4" />
          </button>
        </div>

        {/* Campaign banner */}
        {activeCampaign && (
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600/90 to-transparent px-3 py-2 pointer-events-none">
            <span className="text-white text-[10px] font-semibold truncate block">
              🔥 {activeCampaign.name}
            </span>
          </div>
        )}

        {/* Add-to-cart bar */}
        <div
          className={`absolute inset-x-3 ${activeCampaign ? "bottom-10" : "bottom-3"} rounded-xl border border-gray-100 bg-white/95 backdrop-blur px-3 py-2 shadow-sm transition-all duration-300 ${
            isHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          }`}
        >
          <button
            onClick={handleAddToCart}
            disabled={isAdding}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white hover:bg-black transition disabled:opacity-60"
          >
            <ShoppingCart className="h-4 w-4" />
            {isAdding ? "Adding..." : "Add to cart"}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3
          onClick={() => navigateToProduct(firstVariation?.id)}
          className="text-sm sm:text-[15px] font-semibold text-gray-900 line-clamp-2 cursor-pointer hover:text-red-700 transition"
        >
          {product.baseName}
        </h3>

        <div className="mt-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-base font-bold text-red-700">{priceText}</span>
            {hasDiscount && originalPriceText && (
              <span className="text-xs text-gray-400 line-through">{originalPriceText}</span>
            )}
          </div>

          {product.variations?.length > 1 && (
            <span className="text-[10px] px-2 py-1 rounded-full bg-gray-50 border border-gray-100 text-gray-600 whitespace-nowrap">
              {product.variations.length} options
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
