import { create } from 'zustand';
import {
  FoodListing,
  fetchDiscoverListings,
  fetchNearbyDiscoverListings,
  mapDiscoverListing,
  DiscoverAudience,
  isLocationRequiredError,
} from '../services/foodListing.service';
import type { AvailableFoodMode } from '../hooks/useAvailableFoodMode';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

const STALE_TIME_MS = 3 * 60 * 1000;

type MappedListing = ReturnType<typeof mapDiscoverListing>;

interface AudienceCache {
  rawListings: FoodListing[];
  listings: MappedListing[];
  lastFetched: number | null;
  isFetching: boolean;
  feedMode: AvailableFoodMode | null;
}

interface DiscoverState {
  people: AudienceCache;
  animal: AudienceCache;
  error: string | null;
  locationRequired: boolean;
}

interface DiscoverActions {
  fetchListings: (
    audience: DiscoverAudience,
    force?: boolean,
    options?: { mode?: AvailableFoodMode },
  ) => Promise<void>;
  reset: () => void;
}

function makeEmptyCache(): AudienceCache {
  return {
    rawListings: [],
    listings: [],
    lastFetched: null,
    isFetching: false,
    feedMode: null,
  };
}

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

const INITIAL: DiscoverState = {
  people: makeEmptyCache(),
  animal: makeEmptyCache(),
  error: null,
  locationRequired: false,
};

export const useDiscoverStore = create<DiscoverState & DiscoverActions>((set, get) => ({
  ...INITIAL,

  fetchListings: async (audience, force = false, options) => {
    const mode: AvailableFoodMode = options?.mode ?? 'push';
    const cache = get()[audience];

    // Mode switch should always refetch.
    const modeChanged = cache.feedMode != null && cache.feedMode !== mode;
    if (cache.isFetching || (!force && !modeChanged && !isStale(cache.lastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set((state) => ({
      [audience]: { ...state[audience], isFetching: true },
      error: null,
      locationRequired: false,
    }));

    try {
      const raw =
        mode === 'nearby_fallback'
          ? await fetchNearbyDiscoverListings({ page: 1, limit: 20, allPages: true })
          : await fetchDiscoverListings(audience, { page: 1, limit: 20 });

      const mapped = raw.map(mapDiscoverListing);

      set({
        [audience]: {
          rawListings: raw,
          listings: mapped,
          lastFetched: Date.now(),
          isFetching: false,
          feedMode: mode,
        },
        locationRequired: false,
        error: null,
      });
    } catch (error: unknown) {
      const locationRequired = mode === 'nearby_fallback' && isLocationRequiredError(error);
      const message = getUserFriendlyErrorMessage(
        error,
        locationRequired
          ? 'Set your site location to see nearby food'
          : 'Failed to load listings',
      );
      set((state) => ({
        [audience]: { ...state[audience], isFetching: false, feedMode: mode },
        error: message,
        locationRequired,
      }));
      throw Object.assign(new Error(message), {
        status: (error as any)?.status ?? (error as any)?.response?.status,
        code: (error as any)?.code,
        locationRequired,
      });
    }
  },

  reset: () => set(INITIAL),
}));
