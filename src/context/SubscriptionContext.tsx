// context/SubscriptionContext.tsx
import { useSubscription } from '@/hooks/useSubscription';
import { SubscriptionInfo } from '@/services/billing';
import { createContext, ReactNode, useContext } from 'react';

interface SubscriptionContextValue {
  subscription: SubscriptionInfo | null;
  isLoading: boolean;
  isLocked: boolean; // true only once we KNOW it's inactive — never flashes locked mid-fetch
  refresh: () => Promise<void> | void;
}

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { subscription, isLoading, refresh } = useSubscription();
  const isLocked = !isLoading && subscription !== null && !subscription.isActiveOrGrace;

  return (
    <SubscriptionContext.Provider value={{ subscription, isLoading, isLocked, refresh }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscriptionContext must be used within a SubscriptionProvider');
  return ctx;
}