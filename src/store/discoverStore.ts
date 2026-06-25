import { create } from 'zustand';
import {
  FoodListing,
  fetchDiscoverListings,
  mapDiscoverListing,
  DiscoverAudience,
} from '../services/foodListing.service';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';


const STALE_TIME_MS = 3 * 60 * 1000;

type MappedListing = ReturnType<typeof mapDiscoverListing>;

interface AudienceCache {
  rawListings: FoodListing[];
  listings: MappedListing[];
  lastFetched: number | null;
  isFetching: boolean;
}

interface DiscoverState {
  people: AudienceCache;
  animal: AudienceCache;
  error: string | null;
}

interface DiscoverActions {
  fetchListings: (audience: DiscoverAudience, force?: boolean) => Promise<void>;
  reset: () => void;
}

function makeEmptyCache(): AudienceCache {
  return {
    rawListings: [],
    listings: [],
    lastFetched: null,
    isFetching: false,
  };
}

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

const INITIAL: DiscoverState = {
  people: makeEmptyCache(),
  animal: makeEmptyCache(),
  error: null,
};

export const useDiscoverStore = create<DiscoverState & DiscoverActions>((set, get) => ({
  ...INITIAL,

  fetchListings: async (audience, force = false) => {
    const cache = get()[audience];

    if (cache.isFetching || (!force && !isStale(cache.lastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set((state) => ({
      [audience]: { ...state[audience], isFetching: true },
      error: null,
    }));

    try {
      const raw = await fetchDiscoverListings(audience, { page: 1, limit: 20 });
      const mapped = raw.map(mapDiscoverListing);

      set({
        [audience]: {
          rawListings: raw,
          listings: mapped,
          lastFetched: Date.now(),
          isFetching: false,
        },
      });
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load listings');
      set((state) => ({
        [audience]: { ...state[audience], isFetching: false },
        error: message,
      }));
      throw new Error(message);
    }
  },

  reset: () => set(INITIAL),
}));
