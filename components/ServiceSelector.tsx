'use client';

import { useState, useEffect } from 'react';
import { Plus, X, DollarSign, Edit2 } from 'lucide-react';
import serviceManagementService, { Service } from '@/services/serviceManagementService';

export interface ServiceItem {
  id: number;
  serviceId: number;
  serviceName: string;
  quantity: number;
  price: number;
  amount: number;
  category: string;
}

interface ServiceSelectorProps {
  onAddService: (item: ServiceItem) => void;
  darkMode: boolean;
  allowManualPrice?: boolean; // For POS/Social Commerce
}

export default function ServiceSelector({ onAddService, darkMode, allowManualPrice = true }: ServiceSelectorProps) {
  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    const data = await serviceManagementService.getActiveServices();
    setServices(data);
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setCustomPrice(service.basePrice);
    setQuantity(1);
    setIsModalOpen(true);
  };

  const handleAddService = () => {
    if (!selectedService) return;

    const finalPrice = (allowManualPrice && selectedService.allowManualPrice) 
      ? customPrice 
      : selectedService.basePrice;

    const serviceItem: ServiceItem = {
      id: Date.now(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      quantity,
      price: finalPrice,
      amount: finalPrice * quantity,
      category: selectedService.category,
    };

    onAddService(serviceItem);
    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setQuantity(1);
    setCustomPrice(0);
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      wash: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      repair: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      alteration: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      custom: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[category as keyof typeof colors] || colors.other;
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
          <DollarSign size={20} />
          Add-on Services
        </h3>
        
        {services.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
            No services available
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {services.map((service) => (
              <button
                key={service.id}
                onClick={() => handleSelectService(service)}
                className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 dark:hover:border-blue-400 transition-colors text-left"
              >
                <div className="font-medium text-gray-900 dark:text-white text-sm mb-1">
                  {service.name}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {service.description}
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${getCategoryColor(service.category)}`}>
                    {service.category}
                  </span>
                  <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                    ৳{service.basePrice}
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Service Details Modal */}
      {isModalOpen && selectedService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedService.name}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedService.description}
                  </p>
                  <span className={`inline-block mt-2 text-xs px-2 py-1 rounded-full ${getCategoryColor(selectedService.category)}`}>
                    {selectedService.category.charAt(0).toUpperCase() + selectedService.category.slice(1)}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Quantity
                  </label>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Price (৳)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(parseFloat(e.target.value) || 0)}
                      min="0"
                      step="0.01"
                      disabled={!allowManualPrice || !selectedService.allowManualPrice}
                      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                        (!allowManualPrice || !selectedService.allowManualPrice) ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    />
                    {(!allowManualPrice || !selectedService.allowManualPrice) && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Fixed</span>
                      </div>
                    )}
                  </div>
                  {allowManualPrice && selectedService.allowManualPrice && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Base price: ৳{selectedService.basePrice}
                    </p>
                  )}
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Total Amount:
                    </span>
                    <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      ৳{(customPrice * quantity).toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddService}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    Add Service
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
