import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import {
  billingService,
  type ChangePlanPreview,
  type ChangePlanResponse,
} from '../services/billing.service';
import {
  subscriptionsService,
  type AvailablePlan,
  type AvailablePlansResponse,
  type Entitlements,
} from '../services/subscriptions.service';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';
import { canAccessSubscription } from '@/utils/subscriptionAccess';
import { resolveUserRole } from '@/utils/authSession';

export type SubscriptionStoreState = {
  entitlements: Entitlements | null;
  available: AvailablePlansResponse | null;
  plans: AvailablePlan[];
  isFetchingEntitlements: boolean;
  isFetchingPlans: boolean;
  isMutating: boolean;
  lastFetchedEntitlements: number | null;
  lastFetchedPlans: number | null;
  error: string | null;
  /** Soft-redirect to plans was already attempted this session. */
  planGatePrompted: boolean;
};

export type WaitForEntitlementOptions = {
  attempts?: number;
  delayMs?: number;
  /** Resolve as soon as this returns true, instead of on `entitled` alone. */
  isSatisfied?: (entitlements: Entitlements) => boolean;
};

type SubscriptionStoreActions = {
  fetchEntitlements: (force?: boolean) => Promise<Entitlements | null>;
  waitForEntitlement: (options?: WaitForEntitlementOptions) => Promise<Entitlements | null>;
  fetchAvailablePlans: (force?: boolean) => Promise<AvailablePlansResponse | null>;
  startTrial: (planId: number, billingCycle?: 'MONTHLY' | 'ANNUAL') => Promise<string>;
  startCheckout: (planId: number, billingCycle: 'MONTHLY' | 'ANNUAL') => Promise<string>;
  changePlan: (
    planId: number,
    billingCycle?: 'MONTHLY' | 'ANNUAL',
  ) => Promise<ChangePlanResponse>;
  previewPlanChange: (
    planId: number,
    billingCycle?: 'MONTHLY' | 'ANNUAL',
  ) => Promise<ChangePlanPreview>;
  cancelPendingPlanChange: () => Promise<string>;
  openPortal: () => Promise<string>;
  cancelSubscription: () => Promise<string>;
  resumeSubscription: () => Promise<string>;
  submitEnterpriseEnquiry: (
    payload: Parameters<typeof billingService.submitEnterpriseEnquiry>[0],
  ) => Promise<void>;
  markPlanGatePrompted: () => void;
  resetPlanGatePrompted: () => void;
  setupBillingRefreshOnFocus: () => void;
  teardownBillingRefreshOnFocus: () => void;
  reset: () => void;
};

const INITIAL: SubscriptionStoreState = {
  entitlements: null,
  available: null,
  plans: [],
  isFetchingEntitlements: false,
  isFetchingPlans: false,
  isMutating: false,
  lastFetchedEntitlements: null,
  lastFetchedPlans: null,
  error: null,
  planGatePrompted: false,
};

const ENTITLEMENTS_TTL_MS = 60_000;
const PLANS_TTL_MS = 5 * 60_000;

let appStateSub: { remove: () => void } | null = null;

function isStale(lastFetched: number | null, ttl: number) {
  if (!lastFetched) return true;
  return Date.now() - lastFetched > ttl;
}

function isBillableSession(): boolean {
  const { authUser, selectedRole } = useAuthStore.getState();
  if (!authUser?.accessToken) return false;
  const role = resolveUserRole(authUser, selectedRole);
  return canAccessSubscription(role);
}

export const useSubscriptionStore = create<SubscriptionStoreState & SubscriptionStoreActions>(
  (set, get) => ({
    ...INITIAL,

    fetchEntitlements: async (force = false) => {
      if (!useAuthStore.getState().authUser?.accessToken) return null;
      if (get().isFetchingEntitlements) return get().entitlements;
      if (!force && !isStale(get().lastFetchedEntitlements, ENTITLEMENTS_TTL_MS)) {
        return get().entitlements;
      }

      set({ isFetchingEntitlements: true, error: null });
      try {
        const entitlements = await subscriptionsService.getEntitlements();
        set({
          entitlements,
          lastFetchedEntitlements: Date.now(),
        });
        return entitlements;
      } catch (error: unknown) {
        const message = getUserFriendlyErrorMessage(error, 'Failed to load subscription status');
        set({ error: message });
        return null;
      } finally {
        set({ isFetchingEntitlements: false });
      }
    },

    /**
     * Stripe confirms a purchase through a webhook, so entitlement can lag the
     * browser closing by a second or two. Poll until it lands or we give up.
     */
    waitForEntitlement: async (options = {}) => {
      const attempts = Math.max(1, options.attempts ?? 6);
      const delayMs = Math.max(250, options.delayMs ?? 2500);
      const isSatisfied = options.isSatisfied ?? ((ent: Entitlements) => ent.entitled);

      let latest: Entitlements | null = null;

      for (let attempt = 0; attempt < attempts; attempt += 1) {
        latest = await get().fetchEntitlements(true);
        if (latest && isSatisfied(latest)) return latest;
        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      return latest;
    },

    fetchAvailablePlans: async (force = false) => {
      if (!useAuthStore.getState().authUser?.accessToken) return null;
      if (get().isFetchingPlans) return get().available;
      if (!force && !isStale(get().lastFetchedPlans, PLANS_TTL_MS) && get().plans.length) {
        return get().available;
      }

      set({ isFetchingPlans: true, error: null });
      try {
        const available = await subscriptionsService.getAvailable();
        set({
          available,
          plans: available.plans,
          lastFetchedPlans: Date.now(),
        });
        return available;
      } catch (error: unknown) {
        const message = getUserFriendlyErrorMessage(error, 'Failed to load plans');
        set({ error: message });
        return null;
      } finally {
        set({ isFetchingPlans: false });
      }
    },

    /**
     * The trial is a Checkout session now — the card is captured up front so it
     * converts automatically, so this returns a URL to open rather than
     * activating anything locally.
     */
    startTrial: async (planId, billingCycle) => {
      set({ isMutating: true, error: null });
      try {
        const session = await billingService.startTrial(planId, billingCycle);
        if (!session.checkoutUrl) {
          throw new Error('Checkout URL was not returned');
        }
        return session.checkoutUrl;
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not start free trial'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    startCheckout: async (planId, billingCycle) => {
      set({ isMutating: true, error: null });
      try {
        const session = await billingService.createCheckout(planId, billingCycle);
        if (!session.checkoutUrl) {
          throw new Error('Checkout URL was not returned');
        }
        return session.checkoutUrl;
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not start checkout'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    /**
     * Switching plans never leaves the app: upgrades charge the prorated
     * difference on the card Stripe already holds, downgrades are scheduled.
     */
    changePlan: async (planId, billingCycle) => {
      set({ isMutating: true, error: null });
      try {
        const result = await billingService.changePlan(planId, billingCycle);
        await get().fetchEntitlements(true);
        return result;
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not change your plan'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    previewPlanChange: async (planId, billingCycle) => {
      set({ error: null });
      try {
        return await billingService.previewChangePlan(planId, billingCycle);
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not preview this change'),
        });
        throw error;
      }
    },

    cancelPendingPlanChange: async () => {
      set({ isMutating: true, error: null });
      try {
        const result = await billingService.cancelPendingChange();
        await get().fetchEntitlements(true);
        return result.message;
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not cancel the scheduled change'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    openPortal: async () => {
      set({ isMutating: true, error: null });
      try {
        const session = await billingService.createPortal();
        if (!session.portalUrl) {
          throw new Error('Billing portal URL was not returned');
        }
        return session.portalUrl;
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not open billing portal'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    resumeSubscription: async () => {
      set({ isMutating: true, error: null });
      try {
        const result = await billingService.resumeSubscription();
        await get().fetchEntitlements(true);
        return result.message;
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not resume your plan'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    cancelSubscription: async () => {
      set({ isMutating: true, error: null });
      try {
        const result = await billingService.cancelSubscription();
        await get().fetchEntitlements(true);
        return result.message;
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not cancel subscription'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    submitEnterpriseEnquiry: async (payload) => {
      set({ isMutating: true, error: null });
      try {
        await billingService.submitEnterpriseEnquiry(payload);
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Could not submit enquiry'),
        });
        throw error;
      } finally {
        set({ isMutating: false });
      }
    },

    markPlanGatePrompted: () => set({ planGatePrompted: true }),
    resetPlanGatePrompted: () => set({ planGatePrompted: false }),

    setupBillingRefreshOnFocus: () => {
      if (appStateSub) return;
      appStateSub = AppState.addEventListener('change', (next: AppStateStatus) => {
        if (next !== 'active') return;
        if (!isBillableSession()) return;
        void get().fetchEntitlements(true);
      });
    },

    teardownBillingRefreshOnFocus: () => {
      appStateSub?.remove();
      appStateSub = null;
    },

    reset: () => {
      get().teardownBillingRefreshOnFocus();
      set({ ...INITIAL });
    },
  }),
);

export function selectNeedsPlan(state: SubscriptionStoreState): boolean {
  const ent = state.entitlements;
  if (!ent) return false;
  return ent.billingRequired && !ent.entitled;
}

/** Statuses where a billing relationship is still live with Stripe. */
const LIVE_STATUSES = ['TRIALING', 'ACTIVE', 'PAST_DUE'];

/**
 * Whether the org should switch plans rather than start a new checkout. Only a
 * hint for choosing the CTA — the backend is the authority and answers with a
 * 409 either way, which both flows recover from.
 */
export function selectHasLiveSubscription(state: SubscriptionStoreState): boolean {
  const status = String(state.entitlements?.status ?? '').toUpperCase();
  return LIVE_STATUSES.includes(status);
}

export function selectPendingPlanChange(state: SubscriptionStoreState) {
  const ent = state.entitlements;
  if (!ent?.pendingPlanId) return null;
  return {
    planId: ent.pendingPlanId,
    planDisplayName: ent.pendingPlanDisplayName,
    billingCycle: ent.pendingBillingCycle,
    effectiveAt: ent.pendingChangeEffectiveAt,
  };
}

export function selectCanManageBilling(): boolean {
  const orgRole = useAuthStore.getState().authUser?.orgRole?.toUpperCase() ?? '';
  return orgRole === 'SUPER_ADMIN';
}

/**
 * Backend is the authority on who may pay (`SUPER_ADMIN` only). Block locally
 * only when the role is known and is not an admin — when the profile carries no
 * org role we let the request through rather than locking an admin out.
 */
export function selectIsKnownNonBillingAdmin(): boolean {
  const orgRole = useAuthStore.getState().authUser?.orgRole?.toUpperCase() ?? '';
  return orgRole.length > 0 && orgRole !== 'SUPER_ADMIN';
}
