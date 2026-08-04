import api from './api';

export type SubscriptionStatus =
  | 'TRIALING'
  | 'ACTIVE'
  | 'PAST_DUE'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'INCOMPLETE'
  | string;

export type PlanComparisonFeature = {
  key: string;
  category: string;
  label: string;
  included: boolean;
  value: string | null;
};

export type AvailablePlan = {
  id: number;
  name: string;
  displayName: string;
  description: string | null;
  priceMonthly: number | null;
  priceAnnual: number | null;
  currency: string;
  isPerSite: boolean;
  contactSalesOnly: boolean;
  isMostPopular: boolean;
  maxSites: number | null;
  maxUserPerSite: number | null;
  features: string[];
  inheritsFrom: string | null;
  comparison: PlanComparisonFeature[];
};

export type AvailablePlansResponse = {
  billingRequired: boolean;
  currency?: string;
  message?: string;
  plans: AvailablePlan[];
};

export type BillingCycleApi = 'MONTHLY' | 'ANNUAL';

export type Entitlements = {
  billingRequired: boolean;
  entitled: boolean;
  status: SubscriptionStatus | null;
  planId: number | null;
  planName: string | null;
  planDisplayName: string | null;
  /** Which cycle the org is billed on — drives the monthly/annual toggle. */
  billingCycle: BillingCycleApi | null;
  /** Billed site count on per-site plans. */
  quantity: number | null;
  maxSites: number | null;
  maxUserPerSite: number | null;
  features: string[];
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  /** false once the org has consumed its one trial. */
  freeTrialAvailable: boolean;
  /** Set while a downgrade waits for the current period to close. */
  pendingPlanId: number | null;
  pendingPlanDisplayName: string | null;
  pendingBillingCycle: BillingCycleApi | null;
  pendingChangeEffectiveAt: string | null;
};

function unwrapData<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as object)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export const subscriptionsService = {
  async getAvailable(): Promise<AvailablePlansResponse> {
    const res = await api.get('/subscriptions/available');
    const data = unwrapData<AvailablePlansResponse>(res.data);
    return {
      billingRequired: Boolean(data?.billingRequired),
      currency: data?.currency,
      message: data?.message,
      plans: Array.isArray(data?.plans) ? data.plans : [],
    };
  },

  async getEntitlements(): Promise<Entitlements> {
    const res = await api.get('/subscriptions/me');
    const data = unwrapData<Entitlements>(res.data);
    return {
      billingRequired: Boolean(data?.billingRequired),
      entitled: Boolean(data?.entitled),
      status: data?.status ?? null,
      planId: data?.planId ?? null,
      planName: data?.planName ?? null,
      planDisplayName: data?.planDisplayName ?? null,
      billingCycle: data?.billingCycle ?? null,
      quantity: data?.quantity ?? null,
      maxSites: data?.maxSites ?? null,
      maxUserPerSite: data?.maxUserPerSite ?? null,
      features: Array.isArray(data?.features) ? data.features : [],
      trialEndsAt: data?.trialEndsAt ?? null,
      currentPeriodEnd: data?.currentPeriodEnd ?? null,
      cancelAtPeriodEnd: Boolean(data?.cancelAtPeriodEnd),
      // Older backends omit this; assume no trial rather than offering one that
      // the server will reject.
      freeTrialAvailable: Boolean(data?.freeTrialAvailable),
      pendingPlanId: data?.pendingPlanId ?? null,
      pendingPlanDisplayName: data?.pendingPlanDisplayName ?? null,
      pendingBillingCycle: data?.pendingBillingCycle ?? null,
      pendingChangeEffectiveAt: data?.pendingChangeEffectiveAt ?? null,
    };
  },
};
