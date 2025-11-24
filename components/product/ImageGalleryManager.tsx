'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Star, Image as ImageIcon, Loader2, MoveVertical } from 'lucide-react';
import productImageService from '@/services/productImageService';

interface ProductImage {
  id?: number;
  image_path: string;
  image_url: string;
  alt_text?: string;
  is_primary: boolean;
  sort_order: number;
  is_active: boolean;
}

interface ImageItem {
  id?: number;
  file?: File;
  preview: string;
  alt_text: string;
  is_primary: boolean;
  sort_order: number;
  uploaded: boolean;
}

interface ImageGalleryManagerProps {
  productId?: number;
  existingImages?: ProductImage[];
  onImagesChange?: (images: ImageItem[]) => void;
  maxImages?: number;
  allowReorder?: boolean;
}

export default function ImageGalleryManager({
  productId,
  existingImages = [],
  onImagesChange,
  maxImages = 10,
  allowReorder = true,
}: ImageGalleryManagerProps) {
  const [images, setImages] = useState<ImageItem[]>(() =>
    existingImages.map((img, index) => ({
      id: img.id,
      preview: img.image_url,
      alt_text: img.alt_text || '',
      is_primary: img.is_primary,
      sort_order: img.sort_order || index,
      uploaded: true,
    }))
  );
  
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const notifyChange = useCallback(
    (updatedImages: ImageItem[]) => {
      setImages(updatedImages);
      onImagesChange?.(updatedImages);
    },
    [onImagesChange]
  );

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setError(null);
    const fileArray = Array.from(files);

    // Validate total images
    if (images.length + fileArray.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    // Validate each file
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const validation = productImageService.validateImageFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        return;
      }
      validFiles.push(file);
    }

    // Create preview URLs
    const newImages: ImageItem[] = validFiles.map((file, index) => ({
      file,
      preview: productImageService.createPreviewUrl(file),
      alt_text: '',
      is_primary: images.length === 0 && index === 0,
      sort_order: images.length + index,
      uploaded: false,
    }));

    // If productId exists, upload immediately
    if (productId) {
      setUploading(true);
      try {
        const uploadedImages: ImageItem[] = [];

        for (const imageItem of newImages) {
          if (imageItem.file) {
            const uploadedImage = await productImageService.uploadImage(
              productId,
              imageItem.file,
              {
                alt_text: imageItem.alt_text,
                is_primary: imageItem.is_primary,
                sort_order: imageItem.sort_order,
              }
            );

            uploadedImages.push({
              id: uploadedImage.id,
              preview: uploadedImage.image_url,
              alt_text: uploadedImage.alt_text || '',
              is_primary: uploadedImage.is_primary,
              sort_order: uploadedImage.sort_order,
              uploaded: true,
            });
          }
        }

        notifyChange([...images, ...uploadedImages]);
      } catch (err: any) {
        setError(err.message || 'Failed to upload images');
      } finally {
        setUploading(false);
      }
    } else {
      // Just add to state if no productId (will upload on product creation)
      notifyChange([...images, ...newImages]);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files);
    },
    [images, maxImages, productId]
  );

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeImage = async (index: number) => {
    const imageItem = images[index];

    // If image is already uploaded, delete from server
    if (imageItem.uploaded && imageItem.id && productId) {
      try {
        await productImageService.deleteImage(imageItem.id);
      } catch (err: any) {
        setError(err.message || 'Failed to delete image');
        return;
      }
    }

    // Revoke preview URL if it's a local file
    if (!imageItem.uploaded && imageItem.file) {
      productImageService.revokePreviewUrl(imageItem.preview);
    }

    const updatedImages = images.filter((_, i) => i !== index);
    
    // Reorder and ensure at least one primary
    const reorderedImages = updatedImages.map((img, idx) => ({
      ...img,
      sort_order: idx,
      is_primary: idx === 0 ? true : img.is_primary,
    }));

    notifyChange(reorderedImages);
  };

  const setPrimaryImage = async (index: number) => {
    const imageItem = images[index];

    // If image is uploaded and has ID, update on server
    if (imageItem.uploaded && imageItem.id && productId) {
      try {
        await productImageService.makePrimary(imageItem.id);
      } catch (err: any) {
        setError(err.message || 'Failed to set primary image');
        return;
      }
    }

    const updatedImages = images.map((img, idx) => ({
      ...img,
      is_primary: idx === index,
    }));

    notifyChange(updatedImages);
  };

  const updateAltText = async (index: number, altText: string) => {
    const imageItem = images[index];

    // If image is uploaded, update on server
    if (imageItem.uploaded && imageItem.id && productId) {
      try {
        await productImageService.updateImage(imageItem.id, { alt_text: altText });
      } catch (err: any) {
        console.error('Failed to update alt text:', err);
      }
    }

    const updatedImages = [...images];
    updatedImages[index] = { ...updatedImages[index], alt_text: altText };
    notifyChange(updatedImages);
  };

  // Drag and Drop Reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragEnter = (index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;

    const newImages = [...images];
    const draggedItem = newImages[draggedIndex];
    newImages.splice(draggedIndex, 1);
    newImages.splice(index, 0, draggedItem);

    setImages(newImages);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);

    // Update sort orders
    const reorderedImages = images.map((img, idx) => ({
      ...img,
      sort_order: idx,
    }));

    // If uploaded, sync with server
    if (productId && reorderedImages.some((img) => img.uploaded)) {
      try {
        const imageOrders = reorderedImages
          .filter((img) => img.id)
          .map((img) => ({
            image_id: img.id!,
            sort_order: img.sort_order,
          }));

        await productImageService.reorderImages(productId, imageOrders);
      } catch (err: any) {
        setError(err.message || 'Failed to reorder images');
      }
    }

    notifyChange(reorderedImages);
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Upload Zone */}
      {images.length < maxImages && (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-gray-400 dark:hover:border-gray-500 transition-colors cursor-pointer"
        >
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={(e) => handleFileSelect(e.target.files)}
            className="hidden"
            id="image-upload"
            disabled={uploading}
          />
          <label htmlFor="image-upload" className="cursor-pointer">
            <div className="flex flex-col items-center gap-3">
              {uploading ? (
                <>
                  <Loader2 className="w-10 h-10 text-gray-400 animate-spin" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Uploading images...
                  </p>
                </>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-gray-400" />
                  <div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      PNG, JPG, GIF, WebP up to 5MB (Max {maxImages} images)
                    </p>
                  </div>
                </>
              )}
            </div>
          </label>
        </div>
      )}

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
              Product Images ({images.length}/{maxImages})
            </h3>
            {allowReorder && images.length > 1 && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                <MoveVertical className="w-3 h-3 inline mr-1" />
                Drag to reorder
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((image, index) => (
              <div
                key={index}
                draggable={allowReorder}
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                className={`relative group border-2 rounded-lg overflow-hidden transition-all ${
                  image.is_primary
                    ? 'border-yellow-400 dark:border-yellow-500'
                    : 'border-gray-200 dark:border-gray-700'
                } ${draggedIndex === index ? 'opacity-50' : ''} ${
                  allowReorder ? 'cursor-move' : ''
                }`}
              >
                {/* Image */}
                <div className="aspect-square bg-gray-100 dark:bg-gray-800">
                  <img
                    src={image.preview}
                    alt={image.alt_text || `Product image ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Primary Badge */}
                {image.is_primary && (
                  <div className="absolute top-2 left-2 bg-yellow-400 text-yellow-900 px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Star className="w-3 h-3 fill-current" />
                    Primary
                  </div>
                )}

                {/* Uploading Overlay */}
                {!image.uploaded && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}

                {/* Actions Overlay */}
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                  {!image.is_primary && (
                    <button
                      onClick={() => setPrimaryImage(index)}
                      className="px-3 py-1.5 bg-yellow-400 hover:bg-yellow-500 text-yellow-900 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <Star className="w-3 h-3" />
                      Set as Primary
                    </button>
                  )}
                  <button
                    onClick={() => removeImage(index)}
                    className="px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white rounded-lg text-xs font-medium flex items-center gap-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    Remove
                  </button>
                </div>

                {/* Alt Text Input */}
                <div className="p-2 bg-white dark:bg-gray-800">
                  <input
                    type="text"
                    placeholder="Alt text (optional)"
                    value={image.alt_text}
                    onChange={(e) => updateAltText(index, e.target.value)}
                    className="w-full px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {images.length === 0 && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <ImageIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600 dark:text-gray-400">
            No images yet. Upload some to get started!
          </p>
        </div>
      )}
    </div>
  );
}