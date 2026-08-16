import { BusinessProfile, businessService } from '@/services/business';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface BusinessContextType {
  business: BusinessProfile | null;
  isLoading: boolean;
  refreshBusiness: () => Promise<void>;
}

const BusinessContext = createContext<BusinessContextType>({} as BusinessContextType);

export const BusinessProvider = ({ children }: { children: React.ReactNode }) => {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuth();

useEffect(() => {
  if (user) {
    fetchBusiness(); // Only fetch business profile once we know who the user is
  }
}, [user]);

  const fetchBusiness = async () => {
    try {
      const data = await businessService.getMyBusiness();
      setBusiness(data);
    } catch (e) {
      console.error("Failed to load business profile", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchBusiness(); }, []);

  return (
    <BusinessContext.Provider value={{ business, isLoading, refreshBusiness: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => useContext(BusinessContext);