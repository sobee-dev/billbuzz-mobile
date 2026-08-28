// services/billing.ts
import api from '../lib/axios';

export type PlanTier = 'trial' | 'basic' | 'pro';
export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'incomplete_expired';

export interface SubscriptionInfo {
  planTier:           PlanTier;
  status:              SubscriptionStatus;
  trialEndsAt:         string | null;
  currentPeriodEnd:    string | null;
  cancelAtPeriodEnd:   boolean;
  isActiveOrGrace:     boolean;
}

export const billingService = {
  async getStatus(): Promise<SubscriptionInfo> {
    const { data } = await api.get<SubscriptionInfo>('/api/billing/status/');
    return data;
  },
};