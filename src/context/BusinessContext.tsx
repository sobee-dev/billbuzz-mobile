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
    } else {
      // No user (logged out, or session not yet restored) — nothing to fetch,
      // and clear out any previous user's business so it can't leak across sessions.
      setBusiness(null);
      setIsLoading(false);
    }
  }, [user]);

  const fetchBusiness = async () => {
    try {
      const data = await businessService.getMyBusiness();
      setBusiness(data);
    } catch (e) {
      console.error("Failed to load business profile", e);
      setBusiness(null);
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <BusinessContext.Provider value={{ business, isLoading, refreshBusiness: fetchBusiness }}>
      {children}
    </BusinessContext.Provider>
  );
};

export const useBusiness = () => useContext(BusinessContext);