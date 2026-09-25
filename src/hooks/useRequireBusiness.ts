import { useBusiness } from '@/context/BusinessContext';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

/**
 * Verifies the signed-in owner has a business record before any
 * (owner-tabs) screen renders. A 404 means onboarding was never
 * completed — redirect to step 1. Any other failure (network, auth)
 * is left for the screen's own error handling rather than silently
 * bouncing the user to onboarding.
 */
export function useRequireBusiness() {
  const router = useRouter();
  const { business, isLoading } = useBusiness();

  useEffect(() => {
    if (!isLoading && !business) {
      router.replace('/(onboarding-tabs)/step-1' as never);
    }
  }, [isLoading, business]);

  return isLoading;
}