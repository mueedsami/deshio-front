'use client';

import { useState, useEffect } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Toast from '@/components/Toast';
import FieldsSidebar from '@/components/product/FieldsSidebar';
import DynamicFieldInput from '@/components/product/DynamicFieldInput';
import VariationCard from '@/components/product/VariationCard';
import ImageGalleryManager from '@/components/product/ImageGalleryManager';
import CategoryTreeSelector from '@/components/product/CategoryTreeSelector';
import { productService, Field } from '@/services/productService';
import productImageService from '@/services/productImageService';
import categoryService, { Category, CategoryTree } from '@/services/categoryService';
import { vendorService, Vendor } from '@/services/vendorService';
import {
  FieldValue,
  CategorySelectionState,
  VariationData,
  FALLBACK_IMAGE_URL,
} from '@/types/product';

interface AddEditProductPageProps {
  productId?: string;
  mode?: 'create' | 'edit' | 'addVariation';
  baseSku?: string;
  baseName?: string;
  categoryId?: string;
  onBack?: () => void;
  onSuccess?: () => void;
}

export default function AddEditProductPage({
  productId,
  mode = 'create',
  baseSku = '',
  baseName = '',
  categoryId = '',
  onBack,
  onSuccess,
}: AddEditProductPageProps) {
  const isEditMode = mode === 'edit';
  const addVariationMode = mode === 'addVariation';
  
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'general' | 'variations'>('general');
  const [loading, setLoading] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'warning' } | null>(null);
  const [isVariationProduct, setIsVariationProduct] = useState<boolean>(false);
  const [hasVariations, setHasVariations] = useState<boolean>(false);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    description: '',
  });

  const [categorySelection, setCategorySelection] = useState<CategorySelectionState>({});
  const [selectedVendorId, setSelectedVendorId] = useState<string>('');
  const [productImages, setProductImages] = useState<any[]>([]);

  const [availableFields, setAvailableFields] = useState<Field[]>([]);
  const [selectedFields, setSelectedFields] = useState<FieldValue[]>([]);
  const [variations, setVariations] = useState<VariationData[]>([]);
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isEditMode && productId && availableFields.length > 0) {
      fetchProduct();
    } else if (addVariationMode) {
      setFormData({
        name: baseName,
        sku: baseSku,
        description: '',
      });
      setCategorySelection({ level0: categoryId });
      setHasVariations(true);
      setActiveTab('variations');
    }
  }, [isEditMode, productId, availableFields, addVariationMode]);

  useEffect(() => {
    if (hasVariations && !isEditMode) {
      setActiveTab('variations');
    }
  }, [hasVariations, isEditMode]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      
      const fieldsData = await productService.getAvailableFields();
      setAvailableFields(Array.isArray(fieldsData) ? fieldsData : []);

      const categoriesData = await categoryService.getTree();
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);

      const vendorsData = await vendorService.getAll({ is_active: true });
      const vendorsList = Array.isArray(vendorsData) ? vendorsData : [];
      setVendors(vendorsList);
    } catch (error) {
      console.error('Failed to fetch initial data:', error);
      setToast({ message: 'Failed to load page data. Please refresh.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchProduct = async () => {
    if (!productId) return;

    try {
      setLoading(true);
      const product = await productService.getById(productId);

      setFormData({
        name: product.name,
        sku: product.sku,
        description: product.description || '',
      });

      setSelectedVendorId(String(product.vendor_id));
      setCategorySelection({ level0: String(product.category_id) });

      if (product.images && product.images.length > 0) {
        setProductImages(product.images);
      }

      const hasColor = product.custom_fields?.some(cf => cf.field_id === 6 && cf.value) ?? false;
      setIsVariationProduct(hasColor);
      setHasVariations(hasColor);

      if (product.custom_fields) {
        const fields: FieldValue[] = product.custom_fields
          .filter(cf => !['Primary Image', 'Additional Images', 'SKU', 'Product Name', 'Description', 'Category', 'Vendor'].includes(cf.field_title))
          .map(cf => ({
            fieldId: cf.field_id,
            fieldName: cf.field_title,
            fieldType: cf.field_type,
            value: cf.value,
            instanceId: `field-${cf.field_id}-${Date.now()}`,
          }));
        setSelectedFields(fields);
      }
    } catch (error) {
      console.error('Failed to fetch product:', error);
      setToast({ message: 'Failed to load product', type: 'error' });
      if (onBack) {
        onBack();
      }
    } finally {
      setLoading(false);
    }
  };

  const getCategoryPathArray = (): string[] => {
    const path: string[] = [];
    let level = 0;
    while (categorySelection[`level${level}`]) {
      path.push(categorySelection[`level${level}`]);
      level++;
    }
    return path;
  };

  const getCategoryPathDisplay = (): string => {
    const path = getCategoryPathArray();
    const names: string[] = [];
    let current: CategoryTree[] = categories;

    for (const id of path) {
      const cat = current.find(c => String(c.id) === String(id));
      if (cat) {
        names.push(cat.title);
        current = cat.children || cat.all_children || [];
      }
    }
    return names.join(' > ') || 'None selected';
  };

  const addField = (field: Field) => {
    const instanceId = `field-${field.id}-${Date.now()}-${Math.random()}`;
    const newFieldValue: FieldValue = {
      fieldId: field.id,
      fieldName: field.title,
      fieldType: field.type,
      value: field.type === 'file' ? [] : '',
      instanceId,
    };
    setSelectedFields([...selectedFields, newFieldValue]);
  };

  const removeField = (instanceId: string) => {
    setSelectedFields(selectedFields.filter(f => f.instanceId !== instanceId));
  };

  const updateFieldValue = (instanceId: string, value: any) => {
    setSelectedFields(selectedFields.map(f =>
      f.instanceId === instanceId ? { ...f, value } : f
    ));
  };

  const validateForm = (): boolean => {
    if (!formData.name.trim()) {
      setToast({ message: 'Product name is required', type: 'error' });
      return false;
    }

    if (!formData.sku.trim()) {
      setToast({ message: 'SKU is required', type: 'error' });
      return false;
    }

    const categoryPath = getCategoryPathArray();
    if (categoryPath.length === 0) {
      setToast({ message: 'Please select a category', type: 'error' });
      return false;
    }

    if (!selectedVendorId) {
      setToast({ message: 'Please select a vendor', type: 'error' });
      return false;
    }

    if (!isEditMode && hasVariations && variations.length > 0) {
      const hasValidVariation = variations.some(v => v.color.trim());
      
      if (!hasValidVariation) {
        setToast({ message: 'Please add at least one color for variations', type: 'error' });
        return false;
      }
    }

    return true;
  };

  const addVariation = () => {
    const newVariation: VariationData = {
      id: `var-${Date.now()}-${Math.random()}`,
      color: '',
      sizes: [''],
      images: [],
      imagePreviews: [],
    };
    setVariations([...variations, newVariation]);
  };

  const removeVariation = (variationId: string) => {
    setVariations(variations.filter(v => v.id !== variationId));
  };

  const updateVariationColor = (variationId: string, color: string) => {
    setVariations(variations.map(v =>
      v.id === variationId ? { ...v, color } : v
    ));
  };

  const addSize = (variationId: string) => {
    setVariations(variations.map(v =>
      v.id === variationId ? { ...v, sizes: [...v.sizes, ''] } : v
    ));
  };

  const updateSizeValue = (variationId: string, sizeIndex: number, value: string) => {
    setVariations(variations.map(v =>
      v.id === variationId
        ? { ...v, sizes: v.sizes.map((s, idx) => (idx === sizeIndex ? value : s)) }
        : v
    ));
  };

  const removeSize = (variationId: string, sizeIndex: number) => {
    setVariations(variations.map(v =>
      v.id === variationId
        ? { ...v, sizes: v.sizes.filter((_, idx) => idx !== sizeIndex) }
        : v
    ));
  };

  const handleVariationImageChange = (variationId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (files.length === 0) return;

    const invalidFiles = files.filter(f => !f.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setToast({ message: 'Only image files are allowed', type: 'error' });
      return;
    }

    const largeFiles = files.filter(f => f.size > 5 * 1024 * 1024);
    if (largeFiles.length > 0) {
      setToast({ message: 'Images must be less than 5MB each', type: 'error' });
      return;
    }

    setVariations(variations.map(v => {
      if (v.id !== variationId) return v;

      const newImages = [...v.images, ...files];
      const newPreviews = [...v.imagePreviews];

      files.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newPreviews.push(reader.result as string);
          setVariations(prevVars =>
            prevVars.map(pv =>
              pv.id === variationId ? { ...pv, imagePreviews: newPreviews } : pv
            )
          );
        };
        reader.readAsDataURL(file);
      });

      return { ...v, images: newImages };
    }));
  };

  const removeVariationImage = (variationId: string, imageIndex: number) => {
    setVariations(variations.map(v =>
      v.id === variationId
        ? {
            ...v,
            images: v.images.filter((_, idx) => idx !== imageIndex),
            imagePreviews: v.imagePreviews.filter((_, idx) => idx !== imageIndex),
          }
        : v
    ));
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      const categoryPath = getCategoryPathArray();
      const finalCategoryId = parseInt(categoryPath[categoryPath.length - 1]);

      const customFields = selectedFields.map(f => ({
        field_id: f.fieldId,
        value: f.value,
      }));

      if (isEditMode) {
        // EDIT MODE - Images are handled by ImageGalleryManager automatically
        await productService.update(parseInt(productId!), {
          name: formData.name,
          sku: formData.sku,
          description: formData.description,
          category_id: finalCategoryId,
          vendor_id: parseInt(selectedVendorId),
          custom_fields: customFields,
        });

        setToast({ message: 'Product updated successfully!', type: 'success' });
        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      } else {
        // CREATE MODE
        const baseData = {
          name: formData.name,
          sku: formData.sku,
          description: formData.description,
          category_id: finalCategoryId,
          vendor_id: parseInt(selectedVendorId),
        };

        if (hasVariations && variations.length > 0) {
          // VARIATIONS MODE
          const colorField = availableFields.find(f => f.title === 'Color');
          const sizeField = availableFields.find(f => f.title === 'Size');

          if (!colorField || !sizeField) {
            setToast({ 
              message: 'Color and Size fields must exist in Fields table to create variations', 
              type: 'error' 
            });
            setLoading(false);
            return;
          }

          const createdProducts = [];
          const VARIATION_FIELD_IDS = [colorField.id, sizeField.id];
          const baseCustomFields = customFields.filter(
            cf => !VARIATION_FIELD_IDS.includes(cf.field_id)
          );

          for (const variation of variations) {
            const hasColor = variation.color.trim();
            const validSizes = variation.sizes.filter(s => s.trim());
            const hasSizes = validSizes.length > 0;
            
            if (!hasColor) continue;

            const sizesToCreate = hasSizes ? validSizes : [''];

            for (const size of sizesToCreate) {
              const variationName = size 
                ? `${baseData.name} - ${variation.color} - ${size}`
                : `${baseData.name} - ${variation.color}`;
              
              const varCustomFields = [
                ...baseCustomFields,
                { field_id: colorField.id, value: variation.color }
              ];

              if (size) {
                varCustomFields.push({ field_id: sizeField.id, value: size });
              }

              // Create product
              const product = await productService.create({
                name: variationName,
                sku: baseData.sku,
                description: baseData.description,
                category_id: baseData.category_id,
                vendor_id: baseData.vendor_id,
                custom_fields: varCustomFields,
              });

              // Upload variation images using productImageService
              if (variation.images.length > 0 && product.id) {
                for (let i = 0; i < variation.images.length; i++) {
                  try {
                    await productImageService.uploadImage(
                      product.id,
                      variation.images[i],
                      {
                        is_primary: i === 0,
                        sort_order: i,
                      }
                    );
                  } catch (error) {
                    console.error('Failed to upload variation image:', error);
                  }
                }
              }

              createdProducts.push(product);
            }
          }

          if (createdProducts.length === 0) {
            setToast({ message: 'No valid variations to create.', type: 'warning' });
            setLoading(false);
            return;
          }

          setToast({ message: `Created ${createdProducts.length} product variation(s)!`, type: 'success' });
        } else {
          // ===== SINGLE PRODUCT MODE =====
          // STEP 1: CREATE THE PRODUCT FIRST (without images)
          console.log('Step 1: Creating product...');
          const createdProduct = await productService.create({
            ...baseData,
            custom_fields: customFields,
          });

          console.log('Product created with ID:', createdProduct.id);

          // STEP 2: UPLOAD AND ATTACH IMAGES (after product exists)
          if (productImages.length > 0 && createdProduct.id) {
            console.log(`Step 2: Uploading ${productImages.length} images...`);
            
            let successCount = 0;
            
            for (let i = 0; i < productImages.length; i++) {
              const imageItem = productImages[i];
              
              // Check if this image needs to be uploaded
              if (imageItem.file && !imageItem.uploaded) {
                try {
                  console.log(`Uploading image ${i + 1}: ${imageItem.file.name}`);
                  
                  // ✅ USE productImageService.uploadImage - uploads AND attaches in one call!
                  await productImageService.uploadImage(
                    createdProduct.id,
                    imageItem.file,
                    {
                      alt_text: imageItem.alt_text || '',
                      is_primary: imageItem.is_primary || (i === 0),
                      sort_order: imageItem.sort_order || i,
                    }
                  );
                  
                  successCount++;
                  console.log(`Image ${i + 1} uploaded and attached successfully`);
                } catch (error) {
                  console.error(`Failed to upload/attach image ${i + 1}:`, error);
                  // Continue with other images even if one fails
                }
              }
            }
            
            console.log(`Successfully uploaded ${successCount}/${productImages.length} images`);
          }

          setToast({ message: 'Product created successfully!', type: 'success' });
        }

        setTimeout(() => {
          if (onSuccess) {
            onSuccess();
          }
        }, 1500);
      }
    } catch (error: any) {
      console.error('Failed to save product:', error);
      setToast({ message: error.message || 'Failed to save product', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    }
  };

  if (loading && !availableFields.length && !categories.length) {
    return (
      <div className={`${darkMode ? 'dark' : ''} flex h-screen`}>
        <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
        <div className="flex-1 flex flex-col">
          <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />
          <main className="flex-1 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-gray-900 dark:border-t-white rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const showVariationsTab = isEditMode 
  ? isVariationProduct 
  : hasVariations;

  return (
    <div className={`${darkMode ? 'dark' : ''} flex h-screen`}>
      <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header darkMode={darkMode} setDarkMode={setDarkMode} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900">
          <div className="max-w-4xl mx-auto p-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="p-2.5 hover:bg-white dark:hover:bg-gray-800 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 shadow-sm"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                  {isEditMode ? 'Edit Product' : addVariationMode ? 'Add Product Variation' : 'Add New Product'}
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {isEditMode 
                    ? 'Update product information' 
                    : addVariationMode 
                    ? 'Create a new variation for existing product'
                    : 'Create a new product in your catalog'}
                </p>
              </div>
            </div>

            <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700 mb-6">
              <button
                onClick={() => setActiveTab('general')}
                className={`px-6 py-3 font-medium border-b-2 transition-all ${
                  activeTab === 'general'
                    ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                    : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
                }`}
              >
                General Information
              </button>
              {showVariationsTab && (
            <button
              onClick={() => setActiveTab('variations')}
              className={`px-6 py-3 font-medium border-b-2 transition-all ${
                activeTab === 'variations'
                  ? 'border-gray-900 dark:border-white text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300'
              }`}
            >
              Product Variations
              {variations.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full">
                  {variations.length}
                </span>
              )}
            </button>
          )}
            </div>

            {activeTab === 'general' && (
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                <div className="lg:col-span-3 space-y-6">
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                      Basic Information
                    </h2>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Product Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter product name"
                            disabled={addVariationMode}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            SKU <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            value={formData.sku}
                            onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                            placeholder="e.g., PROD-001"
                            disabled={isEditMode || addVariationMode}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                          {(isEditMode || addVariationMode) && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {addVariationMode ? 'All variations share the same SKU' : 'SKU cannot be changed after creation'}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Description
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Enter product description"
                          rows={4}
                          className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <CategoryTreeSelector
                          categories={categories}
                          selectedCategoryId={categorySelection.level0 || ''}
                          onSelect={(categoryId) => {
                            if (categoryId) {
                              setCategorySelection({ level0: categoryId });
                            } else {
                              setCategorySelection({});
                            }
                          }}
                          disabled={addVariationMode}
                        />

                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Vendor <span className="text-red-500">*</span>
                          </label>
                          <select
                            value={selectedVendorId}
                            onChange={(e) => setSelectedVendorId(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                          >
                            <option value="">Select vendor</option>
                            {vendors.map((vendor) => (
                              <option key={vendor.id} value={vendor.id}>
                                {vendor.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {!isEditMode && !addVariationMode && (
                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div>
                              <label className="text-sm font-medium text-gray-900 dark:text-white">
                                Create Product with Variations
                              </label>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                Enable this to create products with different colors and sizes
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const newValue = !hasVariations;
                                setHasVariations(newValue);
                                if (!newValue) {
                                  setVariations([]);
                                }
                              }}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 dark:focus:ring-gray-500 focus:ring-offset-2 ${
                                hasVariations ? 'bg-gray-900 dark:bg-white' : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-900 transition-transform ${
                                  hasVariations ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {!hasVariations && !addVariationMode && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Product Images
                      </h2>
                      <ImageGalleryManager
                        productId={isEditMode ? parseInt(productId!) : undefined}
                        existingImages={productImages}
                        onImagesChange={(images) => {
                          setProductImages(images);
                        }}
                        maxImages={10}
                        allowReorder={true}
                      />
                    </div>
                  )}

                  {hasVariations && !isEditMode && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <p className="text-sm text-blue-800 dark:text-blue-400">
                        <strong>Variations Mode Enabled:</strong> You can upload images for each color variant in the "Product Variations" tab.
                      </p>
                    </div>
                  )}

                  {selectedFields.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                        Additional Fields
                      </h2>
                      <div className="space-y-4">
                        {selectedFields.map((field) => (
                          <DynamicFieldInput
                            key={field.instanceId}
                            field={field}
                            availableFields={availableFields}
                            onUpdate={(value) => updateFieldValue(field.instanceId, value)}
                            onRemove={() => removeField(field.instanceId)}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-1">
                  <div className="sticky top-6">
                    <FieldsSidebar
                      fields={availableFields}
                      selectedFieldIds={selectedFields.map(f => f.fieldId)}
                      onAddField={addField}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'variations' && showVariationsTab && (
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    Product Variations
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Create variations with different colors and sizes. Color is required, sizes are optional.
                  </p>

                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2 text-sm">
                      How Variations Work:
                    </h4>
                    <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1">
                      <li>• All variations use the same SKU: "<strong>{formData.sku || 'Enter SKU in General tab'}</strong>"</li>
                      <li>• Each <strong>color is required</strong> for a variation</li>
                      <li>• Sizes are optional - leave empty for "One Size" products</li>
                      <li>• Each color gets one set of images (shared across all sizes)</li>
                      <li>• Products named: "<strong>{formData.name || 'Product'} - Blue - M</strong>"</li>
                    </ul>
                  </div>
                </div>

                {variations.length === 0 ? (
                  <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        No Variations Yet
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">
                        Click "Add Variation" to create your first product variation
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {variations.map((variation, varIdx) => (
                      <VariationCard
                        key={variation.id}
                        variation={variation}
                        index={varIdx}
                        onUpdate={(color) => updateVariationColor(variation.id, color)}
                        onRemove={() => removeVariation(variation.id)}
                        onImageUpload={(e) => handleVariationImageChange(variation.id, e)}
                        onImageRemove={(imgIdx) => removeVariationImage(variation.id, imgIdx)}
                        onSizeAdd={() => addSize(variation.id)}
                        onSizeUpdate={(sizeIdx, value) => updateSizeValue(variation.id, sizeIdx, value)}
                        onSizeRemove={(sizeIdx) => removeSize(variation.id, sizeIdx)}
                      />
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  onClick={addVariation}
                  className="w-full py-3.5 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Plus className="w-5 h-5" />
                  Add Variation
                </button>
              </div>
            )}

            <div className="flex gap-3 mt-8 sticky bottom-0 bg-gray-50 dark:bg-gray-900 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-white dark:hover:bg-gray-800 font-medium transition-colors shadow-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-gray-900 dark:bg-white hover:bg-gray-800 dark:hover:bg-gray-100 text-white dark:text-gray-900 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </span>
                ) : isEditMode ? 'Update Product' : 'Create Product'}
              </button>
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}