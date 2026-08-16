import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { businessService } from '../services/business';

/**
 * Verifies the signed-in owner has a business record before any
 * (owner-tabs) screen renders. A 404 means onboarding was never
 * completed — redirect to step 1. Any other failure (network, auth)
 * is left for the screen's own error handling rather than silently
 * bouncing the user to onboarding.
 */
export function useRequireBusiness() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    businessService.getMyBusiness()
      .then(() => {
        if (!cancelled) setChecking(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 404) {
          router.replace('/(onboarding-tabs)/step-1' as never);
        } else {
          setChecking(false);
        }
      });

    return () => { cancelled = true; };
  }, []);

  return checking;
}