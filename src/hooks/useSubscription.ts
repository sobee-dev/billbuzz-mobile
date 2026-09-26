// hooks/useSubscription.ts
import { useAuth } from '@/context/AuthContext';
import { billingService, SubscriptionInfo } from '@/services/billing';
import { useCallback, useEffect, useState } from 'react';

export function useSubscription() {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(() => {
    if (!user) {
      // No session -> nothing to check, and no point hitting a protected
      // endpoint we already know will 401. This also protects against any
      // stray caller invoking refresh() manually after logout/session
      // expiry (e.g. a screen re-checking subscription status on focus),
      // the same class of bug that previously kept unread_count polling
      // for over an hour against a dead session.
      setSubscription(null);
      setIsLoading(false);
      return Promise.resolve();
    }
    setIsLoading(true);
    return billingService.getStatus()
      .then(setSubscription)
      .catch(() => setSubscription(null))
      .finally(() => setIsLoading(false));
  }, [user]);

  // refresh's identity changes whenever `user` changes (see the dependency
  // array on useCallback above), so this effect automatically re-fires on
  // login and logout/session-expiry — no separate `[user]` effect needed.
  useEffect(() => { refresh(); }, [refresh]);

  return { subscription, isLoading, refresh };
}