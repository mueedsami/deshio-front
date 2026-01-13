'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X, DollarSign, Edit2, Search } from 'lucide-react';
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
  /**
   * POS / Social Commerce often needs to override service price per order.
   * Pass false to force basePrice only.
   */
  allowManualPrice?: boolean;
}

const categoryLabel: Record<string, string> = {
  wash: 'Wash',
  repair: 'Repair',
  alteration: 'Alteration',
  custom: 'Custom',
  other: 'Other',
};

function categoryPillClass(category: string) {
  switch (category) {
    case 'wash':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800/40';
    case 'repair':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/40';
    case 'alteration':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 border border-purple-200 dark:border-purple-800/40';
    case 'custom':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300 border border-gray-200 dark:border-gray-800/40';
  }
}

export default function ServiceSelector({ onAddService, darkMode, allowManualPrice = true }: ServiceSelectorProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);

  const [serviceSearch, setServiceSearch] = useState('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [customPrice, setCustomPrice] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const list = await serviceManagementService.getAllServices();
        if (!mounted) return;
        setServices(Array.isArray(list) ? list.filter((s) => s?.isActive !== false) : []);
      } catch (e) {
        if (!mounted) return;
        setServices([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const filteredServices = useMemo(() => {
    const q = serviceSearch.trim().toLowerCase();
    if (!q) return services;

    return services.filter((s) => {
      const name = (s?.name || '').toLowerCase();
      const desc = (s?.description || '').toLowerCase();
      const cat = (s?.category || '').toLowerCase();
      return name.includes(q) || desc.includes(q) || cat.includes(q);
    });
  }, [services, serviceSearch]);

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setSelectedService(null);
    setQuantity(1);
    setCustomPrice(0);
    setServiceSearch('');
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedService(null);
    setQuantity(1);
    setCustomPrice(0);
    setServiceSearch('');
  };

  const handleSelectService = (service: Service) => {
    setSelectedService(service);
    setQuantity(1);
    setCustomPrice(Number(service?.basePrice || 0));
  };

  const handleAddService = () => {
    if (!selectedService) return;

    const finalPrice = allowManualPrice ? Number(customPrice || 0) : Number(selectedService.basePrice || 0);

    const item: ServiceItem = {
      id: Date.now(),
      serviceId: selectedService.id,
      serviceName: selectedService.name,
      quantity,
      price: finalPrice,
      amount: finalPrice * quantity,
      category: selectedService.category,
    };

    onAddService(item);
    handleCloseModal();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">Add-on Services</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">Add service items (tailoring, wash, repair, etc.)</p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="px-3 py-2 rounded-lg text-xs font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 flex items-center gap-2"
        >
          <Plus size={16} />
          Add Service
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-3xl rounded-xl shadow-xl ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200/70 dark:border-gray-800">
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Select a Service</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {loading ? 'Loading services…' : `${filteredServices.length} service(s)`}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCloseModal}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close"
              >
                <X size={18} className="text-gray-700 dark:text-gray-200" />
              </button>
            </div>

            <div className="p-4">
              {/* Search bar (NEW) */}
              <div className="mb-4">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={serviceSearch}
                    onChange={(e) => setServiceSearch(e.target.value)}
                    placeholder="Search services by name / description / category…"
                    className="w-full pl-9 pr-10 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10"
                  />
                  {serviceSearch.trim() && (
                    <button
                      type="button"
                      onClick={() => setServiceSearch('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                      aria-label="Clear search"
                    >
                      <X size={14} className="text-gray-500" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Services list */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/30 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                    <p className="text-[11px] font-semibold text-gray-800 dark:text-gray-200 uppercase tracking-wide">
                      Services
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-black text-white dark:bg-white dark:text-black font-semibold">
                      {filteredServices.length}
                    </span>
                  </div>

                  <div className="max-h-[380px] overflow-y-auto p-3 space-y-2">
                    {loading ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
                    ) : filteredServices.length === 0 ? (
                      <p className="text-sm text-gray-500 dark:text-gray-400">No services found.</p>
                    ) : (
                      filteredServices.map((service) => (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleSelectService(service)}
                          className={`w-full p-3 rounded-lg border text-left transition-colors ${
                            selectedService?.id === service.id
                              ? 'border-black dark:border-white bg-gray-50 dark:bg-gray-800/40'
                              : 'border-gray-200 dark:border-gray-800 hover:border-blue-500/60 dark:hover:border-blue-400/60'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                                {service.name}
                              </div>
                              <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                                {service.description || '—'}
                              </div>
                            </div>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-[10px] px-2 py-0.5 rounded-full ${categoryPillClass(service.category)}`}>
                                {categoryLabel[service.category] || service.category}
                              </span>
                              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                ৳{Number(service.basePrice || 0).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Selection editor */}
                <div className="border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  {!selectedService ? (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Select a service to add.</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                            {selectedService.name}
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {categoryLabel[selectedService.category] || selectedService.category}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                          ৳{Number(selectedService.basePrice || 0).toFixed(2)}
                        </span>
                      </div>

                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Quantity</label>
                          <div className="mt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center"
                            >
                              <span className="text-base text-gray-800 dark:text-gray-200">−</span>
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={quantity}
                              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value || 1)))}
                              className="w-20 text-center px-2 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => setQuantity((q) => q + 1)}
                              className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center justify-center"
                            >
                              <span className="text-base text-gray-800 dark:text-gray-200">+</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                            Price (per unit)
                          </label>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 relative">
                              <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={customPrice}
                                onChange={(e) => setCustomPrice(Number(e.target.value || 0))}
                                disabled={!allowManualPrice}
                                className={`w-full pl-9 pr-10 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                                  allowManualPrice ? '' : 'opacity-70 cursor-not-allowed'
                                }`}
                              />
                              <Edit2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                            {!allowManualPrice && (
                              <span className="text-[10px] text-gray-500 dark:text-gray-400 whitespace-nowrap">
                                fixed
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 bg-gray-50 dark:bg-gray-900/30">
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-600 dark:text-gray-400">Total</span>
                            <span className="text-lg font-extrabold text-blue-600 dark:text-blue-400">
                              ৳{(Number(customPrice || 0) * quantity).toFixed(2)}
                            </span>
                          </div>
                        </div>

                        <div className="flex gap-3 pt-1">
                          <button
                            type="button"
                            onClick={handleCloseModal}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 text-sm font-semibold text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleAddService}
                            className="flex-1 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 flex items-center justify-center gap-2"
                          >
                            <Plus size={18} />
                            Add Service
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
