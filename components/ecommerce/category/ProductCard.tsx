import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart, Eye, ShoppingCart } from 'lucide-react';
import { useCart } from '@/app/e-commerce/CartContext';

interface ProductCardProps {
  product: any;
  onCartOpen?: () => void;  // ← NEW: Opens cart sidebar
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
    
    const cartItem = {
      id: product.variations[0].id,
      name: product.baseName,
      image: product.image,
      price: product.variations[0].price,
      sku: product.variations[0].attributes?.SKU || '',
      quantity: 1
    };

    // ✅ FIXED: Pass quantity parameter
    addToCart(cartItem, 1);

    // 🔥 AUTO-OPEN CART AFTER "ADDED" ANIMATION
    setTimeout(() => {
      setIsAdding(false);
      onCartOpen?.();  // ← OPENS CART SIDEBAR!
    }, 1200);
  };

  return (
    <div
      className="group bg-white rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 border border-gray-200"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div 
        onClick={() => navigateToProduct(product.variations[0].id)}
        className="relative aspect-square overflow-hidden bg-gray-50 cursor-pointer"
      >
        <img
          src={product.image}
          alt={product.baseName}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />

        {product.variations.length > 1 && (
          <span className="absolute top-3 left-3 bg-blue-600 text-white px-3 py-1.5 text-xs font-bold rounded-full shadow-lg">
            {product.variations.length} VARIANTS
          </span>
        )}

        {/* Action buttons */}
        <div
          className={`absolute top-3 right-3 flex flex-col gap-2 transition-all duration-300 ${
            isHovered ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
          }`}
        >
          <button className="p-2.5 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors">
            <Heart size={18} className="text-gray-700" />
          </button>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              navigateToProduct(product.variations[0].id);
            }}
            className="p-2.5 bg-white rounded-full shadow-lg hover:bg-blue-50 transition-colors"
          >
            <Eye size={18} className="text-gray-700" />
          </button>
        </div>

        {/* Bottom action button */}
        <button
          onClick={handleAddToCart}
          disabled={isAdding}
          className={`absolute bottom-0 left-0 right-0 bg-red-700 text-white py-3.5 text-sm font-bold transition-transform duration-300 flex items-center justify-center gap-2 hover:bg-red-800 ${
            isHovered ? 'translate-y-0' : 'translate-y-full'
          } ${isAdding ? 'bg-green-600' : ''}`}
        >
          {isAdding ? (
            <>✓ ADDED</>
          ) : product.variations.length > 1 ? (
            'SELECT OPTION'
          ) : (
            <>
              <ShoppingCart size={18} />
              ADD TO CART
            </>
          )}
        </button>
      </div>

      <div className="p-4 text-center">
        <h3 
          onClick={() => navigateToProduct(product.variations[0].id)}
          className="text-sm font-semibold text-gray-900 mb-2 line-clamp-2 group-hover:text-red-600 transition-colors cursor-pointer"
        >
          {product.baseName}
        </h3>
        <span className="text-lg font-bold text-red-700">
          {product.priceRange.includes('-') 
            ? `${product.priceRange}৳`
            : `${parseFloat(product.priceRange).toLocaleString()}.00৳`
          }
        </span>
        {product.variations.length > 1 && (
          <p className="text-xs text-gray-500 mt-1">{product.variations.length} variations available</p>
        )}
      </div>
    </div>
  );
}