import { create } from 'zustand';
import { BusinessImpact } from '../services/dashboard.service';
import { fetchAggregatedSiteImpact } from '../utils/impactData';
import { resolveAccessibleSiteIds } from '../utils/impactSites';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

const STALE_TIME_MS = 10 * 60 * 1000; 

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

interface DashboardState {
  businessImpact: BusinessImpact | null;
  isFetching: boolean;
  lastFetched: number | null;
  error: string | null;
}

interface DashboardActions {
  fetchBusinessImpact: (force?: boolean) => Promise<void>;
  reset: () => void;
}

const INITIAL: DashboardState = {
  businessImpact: null,
  isFetching: false,
  lastFetched: null,
  error: null,
};

export const useDashboardStore = create<DashboardState & DashboardActions>((set, get) => ({
  ...INITIAL,

  fetchBusinessImpact: async (force = false) => {
    const { isFetching, lastFetched } = get();

    if (isFetching || (!force && !isStale(lastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetching: true, error: null });
    try {
      const siteIds = await resolveAccessibleSiteIds(authUser);
      if (siteIds.length === 0) {
        set({ lastFetched: Date.now() });
        return;
      }

      const impact = await fetchAggregatedSiteImpact(siteIds, 'month');
      if (impact) {
        set({
          businessImpact: {
            kgSaved: impact.totals.redistributedKg,
            charitiesSupported: impact.totals.partnersSupported,
            collectionsCompleted: impact.totals.collectionsCompleted,
            co2SavedKg: impact.totals.co2AvoidedKg,
            moneySaved: impact.totals.totalFoodSavedUsd,
            currency: 'USD',
          },
          lastFetched: Date.now(),
        });
      }
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load impact data');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetching: false });
    }
  },

  reset: () => set(INITIAL),
}));
