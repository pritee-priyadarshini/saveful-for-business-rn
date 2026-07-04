import { create } from 'zustand';

import { fetchAggregatedSiteImpact, mapImpactToDisplayStats } from '../utils/impactData';
import { resolveAccessibleSiteIds } from '../utils/impactSites';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

const STALE_TIME_MS = 10 * 60 * 1000;

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

export type DashboardImpact = {
  kgSaved: number;
  mealsCreated: number;
  charitiesSupported: number;
  collectionsCompleted: number;
  co2SavedKg: number;
  moneySaved: number;
  currency: string;
};

interface DashboardState {
  businessImpact: DashboardImpact | null;
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
        set({ businessImpact: null, lastFetched: Date.now() });
        return;
      }

      // Same impact API + aggregation as the Insights screen — lifetime = "so far"
      const impact = await fetchAggregatedSiteImpact(siteIds, 'lifetime');
      const stats = mapImpactToDisplayStats(impact);

      set({
        businessImpact: {
          kgSaved: stats.redistributedKg,
          mealsCreated: stats.mealsCreated,
          charitiesSupported: stats.partnersSupported,
          collectionsCompleted: stats.collectionsCompleted,
          co2SavedKg: stats.co2AvoidedKg,
          moneySaved: stats.foodSavedMoney,
          currency: 'USD',
        },
        lastFetched: Date.now(),
      });
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
