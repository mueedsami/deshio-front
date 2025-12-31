'use client';

import { Copy, Check, Image } from 'lucide-react';
import { useState } from 'react';

interface ProductWithStock {
  id: number | string;
  name: string;
  stockCount: number;
  sellingPrice: number;
  images: string[];
}

interface GalleryGridProps {
  loading: boolean;
  error: string | null;
  products: ProductWithStock[];
  onImageClick: (image: string, productName: string, images: string[], index: number) => void;
}

export default function GalleryGrid({ loading, error, products, onImageClick }: GalleryGridProps) {
  const [copiedImage, setCopiedImage] = useState<string | null>(null);
  const [copyType, setCopyType] = useState<'image' | 'link' | null>(null);

  const isMobile = () => /Mobi|Android/i.test(navigator.userAgent);
  const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);

  const convertBlobToPng = async (blob: Blob): Promise<Blob> => {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');
    ctx.drawImage(bitmap, 0, 0);
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject('PNG conversion failed')),
        'image/png'
      );
    });
  };

  const copyImageToClipboard = async (imagePath: string) => {
    try {
      const res = await fetch(imagePath, { mode: 'cors' });
      const blob = await res.blob();

      if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        try {
          await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
          setCopyType('image');
        } catch {
          const pngBlob = await convertBlobToPng(blob);
          await navigator.clipboard.write([new ClipboardItem({ [pngBlob.type]: pngBlob })]);
          setCopyType('image');
        }
      } else {
        await navigator.clipboard.writeText(imagePath);
        setCopyType('link');
      }
    } catch {
      await navigator.clipboard.writeText(imagePath);
      setCopyType('link');
    } finally {
      setCopiedImage(imagePath);
      setTimeout(() => {
        setCopiedImage(null);
        setCopyType(null);
      }, 2000);
    }
  };

  const saveImage = (imagePath: string) => {
    const link = document.createElement('a');
    link.href = imagePath;
    link.download = imagePath.split('/').pop() || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setCopiedImage(imagePath);
    setCopyType('image');
    setTimeout(() => {
      setCopiedImage(null);
      setCopyType(null);
    }, 2000);
  };

  const handleCopyOrSave = async (
    e: React.MouseEvent | React.TouchEvent,
    imagePath: string
  ) => {
    e.stopPropagation();
    if (isIOS()) saveImage(imagePath);
    else await copyImageToClipboard(imagePath);
  };

  if (loading)
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        Loading products...
      </div>
    );
  if (error)
    return (
      <div className="text-center py-12 text-red-600 dark:text-red-400">{error}</div>
    );
  if (!loading && !error && products.length === 0)
    return (
      <div className="text-center py-12 text-gray-500 dark:text-gray-400">
        <Image className="w-16 h-16 mx-auto mb-3 text-gray-400" />
        No products in stock
      </div>
    );

  return (
    <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
      {products.map((product) =>
        product.images.length > 0 ? (
          product.images.map((image, imageIndex) => (
            <div
              key={`${product.id}-${imageIndex}`}
              className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 group shadow-md hover:shadow-xl break-inside-avoid mb-4 bg-white dark:bg-gray-800"
            >
              {/* Product Image Container */}
              <div 
                className="relative cursor-pointer"
                onClick={() => onImageClick(image, product.name, product.images, imageIndex)}
              >
                <img
                  src={image}
                  alt={`${product.name} - Image ${imageIndex + 1}`}
                  className="w-full h-auto object-contain"
                />

                {/* Copy/Save button */}
                <button
                  onClick={(e) => handleCopyOrSave(e, image)}
                  onTouchEnd={(e) => handleCopyOrSave(e, image)}
                  className="absolute top-2 right-2 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-md z-10 hover:bg-white dark:hover:bg-gray-800 transition-colors"
                  title={isMobile() ? 'Copy/Save image' : 'Copy image'}
                >
                  {copiedImage === image ? (
                    <Check className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-700 dark:text-gray-300" />
                  )}
                </button>

                {/* Copied/Saved Message */}
                {copiedImage === image && (
                  <div
                    className={`absolute top-12 right-2 px-3 py-1.5 rounded-md shadow-md text-white text-xs z-10 ${
                      copyType === 'image' ? 'bg-gray-900' : 'bg-blue-600'
                    }`}
                  >
                    {isIOS()
                      ? 'Saved to device'
                      : copyType === 'image'
                      ? 'Image copied'
                      : 'Link copied'}
                  </div>
                )}
              </div>

              {/* White Info Section Below Image */}
              <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                <h3 className="text-gray-900 dark:text-white font-semibold text-sm mb-2 line-clamp-2">
                  {product.name}
                </h3>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-900 dark:text-white font-medium">
                    ৳{product.sellingPrice}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400 text-xs">
                    Stock: {product.stockCount}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div
            key={product.id}
            className="relative overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 break-inside-avoid mb-4"
          >
            {/* No Image Placeholder */}
            <div className="bg-gray-200 dark:bg-gray-700 flex items-center justify-center aspect-square">
              <span className="text-gray-400 dark:text-gray-500 text-sm">No Image</span>
            </div>
            
            {/* White Info Section */}
            <div className="p-3 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
              <h3 className="text-gray-900 dark:text-white font-semibold text-sm mb-2 line-clamp-2">
                {product.name}
              </h3>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-900 dark:text-white font-medium">
                  ${product.sellingPrice}
                </span>
                <span className="text-gray-600 dark:text-gray-400 text-xs">
                  Stock: {product.stockCount}
                </span>
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
}
