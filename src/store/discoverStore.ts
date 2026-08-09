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

/** Prefer fresher remaining qty / status when the same listing appears in both feeds. */
function mergeListingsById(primary: FoodListing[], secondary: FoodListing[]): FoodListing[] {
  const byId = new Map<number, FoodListing>();

  const upsert = (item: FoodListing) => {
    const id = Number(item?.id);
    if (!Number.isFinite(id) || id <= 0) return;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, item);
      return;
    }
    const prevRemaining = Number(prev.remainingQtyKg ?? prev.totalQtyKg ?? 0);
    const nextRemaining = Number(item.remainingQtyKg ?? item.totalQtyKg ?? 0);
    // Prefer the record with a concrete remaining qty (nearby after a partial claim).
    if (
      Number.isFinite(nextRemaining) &&
      (!Number.isFinite(prevRemaining) || nextRemaining !== prevRemaining || item.status)
    ) {
      byId.set(id, { ...prev, ...item });
      return;
    }
    byId.set(id, { ...item, ...prev });
  };

  primary.forEach(upsert);
  secondary.forEach(upsert);
  return [...byId.values()];
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
      let raw =
        mode === 'nearby_fallback'
          ? await fetchNearbyDiscoverListings({ page: 1, limit: 20, allPages: true })
          : await fetchDiscoverListings(audience, { page: 1, limit: 20 });

      // Always merge nearby into push so PARTIAL leftovers (remaining qty) stay
      // visible for sibling multi-charity sites even after another site claimed.
      let feedMode: AvailableFoodMode = mode;
      if (mode === 'push') {
        try {
          const nearby = await fetchNearbyDiscoverListings({
            page: 1,
            limit: 20,
            allPages: true,
          });
          if (nearby.length > 0) {
            const hadPush = raw.length > 0;
            raw = mergeListingsById(raw, nearby);
            feedMode = hadPush ? 'push' : 'nearby_fallback';
          }
        } catch {
          // Keep push result; surface nearby errors only in nearby mode.
        }
      }

      const mapped = raw.map(mapDiscoverListing);

      set({
        [audience]: {
          rawListings: raw,
          listings: mapped,
          lastFetched: Date.now(),
          isFetching: false,
          feedMode,
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
