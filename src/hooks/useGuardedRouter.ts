// hooks/useGuardedRouter.ts
import { useAuth } from '@/context/AuthContext';
import { useSubscriptionContext } from '@/context/SubscriptionContext';
import { useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Alert } from 'react-native';

/** Drop-in replacement for useRouter(). When locked, push/replace become
 * an alert instead of navigation — the screen using this hook can't lead
 * anywhere else. .back() is left alone; nothing to protect behind you. */
export function useGuardedRouter() {
  const router = useRouter();
  const { user } = useAuth();
  const { isLocked } = useSubscriptionContext();

  const guard = useCallback(<T extends any[]>(fn: (...a: T) => void) => (...args: T) => {
    if (isLocked) {
      Alert.alert(
        'Subscription Inactive',
        user?.role === 'owner'
          ? 'Renew your subscription to unlock the rest of the app.'
          : "This business's subscription is inactive. Contact your business owner.",
      );
      return;
    }
    fn(...args);
  }, [isLocked, user?.role]);

  return { ...router, push: guard(router.push), replace: guard(router.replace) };
}