// hooks/useSubscription.ts
import { billingService, SubscriptionInfo } from '@/services/billing';
import { useCallback, useEffect, useState } from 'react';

export function useSubscription() {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    setIsLoading(true);
    return billingService.getStatus()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { subscription, isLoading, refresh };
}