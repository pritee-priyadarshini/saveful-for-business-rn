import { create } from 'zustand';
import { isAxiosError } from 'axios';
import { BusinessImpact, dashboardService } from '../services/dashboard.service';
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
      const res = await dashboardService.getBusinessImpact();
      if (res.data) {
        set({
          businessImpact: {
            ...res.data,
            collectionsCompleted:
              res.data.collectionsCompleted ?? res.data.charitiesSupported ?? 0,
          },
          lastFetched: Date.now(),
        });
      }
    } catch (error: unknown) {
      if (isAxiosError(error) && error.response?.status === 404) {
        console.log('[Dashboard] Impact data not yet available (404)');
        set({ lastFetched: Date.now() });
      } else {
        const message = getUserFriendlyErrorMessage(error, 'Failed to load impact data');
        set({ error: message });
        throw new Error(message);
      }
    } finally {
      set({ isFetching: false });
    }
  },

  reset: () => set(INITIAL),
}));
