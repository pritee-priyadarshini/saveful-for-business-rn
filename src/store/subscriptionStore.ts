import { AppState, type AppStateStatus } from 'react-native';
import { create } from 'zustand';

import { billingService } from '../services/billing.service';
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

type SubscriptionStoreActions = {
  fetchEntitlements: (force?: boolean) => Promise<Entitlements | null>;
  fetchAvailablePlans: (force?: boolean) => Promise<AvailablePlansResponse | null>;
  startTrial: (planId: number) => Promise<void>;
  startCheckout: (planId: number, billingCycle: 'MONTHLY' | 'ANNUAL') => Promise<string>;
  openPortal: () => Promise<string>;
  cancelSubscription: () => Promise<string>;
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

    startTrial: async (planId) => {
      set({ isMutating: true, error: null });
      try {
        await billingService.startTrial(planId);
        await get().fetchEntitlements(true);
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

export function selectCanManageBilling(): boolean {
  const orgRole = useAuthStore.getState().authUser?.orgRole?.toUpperCase() ?? '';
  return orgRole === 'SUPER_ADMIN';
}
