"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import storeService from '@/services/storeService';

interface Store {
  id: number;
  name: string;
  code?: string;
}

interface StoreContextType {
  selectedStoreId: number | null;
  setSelectedStoreId: (id: number | null) => void;
  availableStores: Store[];
  isLoadingStores: boolean;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { user, isGlobal, storeId } = useAuth();
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(false);

  useEffect(() => {
    if (user) {
      // Default to assigned store
      setSelectedStoreId(storeId || null);

      if (isGlobal) {
        loadAllStores();
      }
    }
  }, [user, isGlobal, storeId]);

  const loadAllStores = async () => {
    setIsLoadingStores(true);
    try {
      const stores = await storeService.getAllStores();
      setAvailableStores(stores || []);
    } catch (error) {
      console.error('Failed to load stores:', error);
    } finally {
      setIsLoadingStores(false);
    }
  };

  return (
    <StoreContext.Provider value={{ selectedStoreId, setSelectedStoreId, availableStores, isLoadingStores }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
