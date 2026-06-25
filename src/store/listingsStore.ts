import { create } from 'zustand';
import {
  FoodListing,
  foodListingService,
  normalizeListingsResponse,
  fetchListingDetail,
  type ListingDetail,
} from '../services/foodListing.service';
import { useAuthStore } from './authStore';
import { getUserFriendlyErrorMessage } from '../utils/apiError';
import { isAnimalListing, isPeopleListing } from '../utils/foodListing';
import type { RelistAudience } from '../utils/listingRelist';


const STALE_TIME_MS = 5 * 60 * 1000; 

function isStale(lastFetched: number | null): boolean {
  return !lastFetched || Date.now() - lastFetched > STALE_TIME_MS;
}

interface ListingsState {
  siteListings: FoodListing[];
  orgListings: FoodListing[];

  isFetchingSite: boolean;
  isFetchingOrg: boolean;

  siteLastFetched: number | null;
  orgLastFetched: number | null;

  error: string | null;
}

interface ListingsActions {
  fetchSiteListings: (force?: boolean) => Promise<void>;
  fetchOrgListings: (force?: boolean) => Promise<void>;
  fetchLatestForRelist: (audience: RelistAudience) => Promise<ListingDetail | null>;
  cancelListing: (id: number) => Promise<void>;
  invalidateSite: () => void;
  reset: () => void;
}

const INITIAL: ListingsState = {
  siteListings: [],
  orgListings: [],
  isFetchingSite: false,
  isFetchingOrg: false,
  siteLastFetched: null,
  orgLastFetched: null,
  error: null,
};

export const useListingsStore = create<ListingsState & ListingsActions>((set, get) => ({
  ...INITIAL,

  fetchSiteListings: async (force = false) => {
    const { isFetchingSite, siteLastFetched } = get();

    if (isFetchingSite || (!force && !isStale(siteLastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    set({ isFetchingSite: true, error: null });
    try {
      const res = await foodListingService.getSiteListings();
      const { listings: all } = normalizeListingsResponse(res);
      set({
        siteListings: all.filter((l: FoodListing) => l.status !== 'CANCELLED'),
        siteLastFetched: Date.now(),
      });
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load listings');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetchingSite: false });
    }
  },

  fetchOrgListings: async (force = false) => {
    const { isFetchingOrg, orgLastFetched } = get();

    if (isFetchingOrg || (!force && !isStale(orgLastFetched))) return;

    const { authUser } = useAuthStore.getState();
    if (!authUser?.accessToken) return;

    const orgId = authUser?.profile?.organisation?.id;
    if (!orgId) return;

    set({ isFetchingOrg: true, error: null });
    try {
      const res = await foodListingService.getOrgListings(Number(orgId), {
        page: 1,
        limit: 200,
      });
      const { listings: all } = normalizeListingsResponse(res);
      set({ orgListings: all, orgLastFetched: Date.now() });
    } catch (error: unknown) {
      const message = getUserFriendlyErrorMessage(error, 'Failed to load listing history');
      set({ error: message });
      throw new Error(message);
    } finally {
      set({ isFetchingOrg: false });
    }
  },

  cancelListing: async (id: number) => {
    await foodListingService.cancelListing(id);
    set({ siteLastFetched: null });
    await get().fetchSiteListings(true);
  },

  fetchLatestForRelist: async (audience) => {
    await get().fetchSiteListings();
    const { siteListings } = get();

    const matchesAudience = audience === 'animal' ? isAnimalListing : isPeopleListing;
    const candidates = siteListings
      .filter((listing) => {
        if (!matchesAudience(listing)) return false;
        const status = String(listing.status || '').toUpperCase();
        return status !== 'CANCELLED';
      })
      .sort((a, b) => {
        const aMs = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const bMs = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return bMs - aMs;
      });

    if (candidates.length === 0) return null;

    const latest = candidates[0];
    const hasFoodItems =
      Array.isArray(latest.foodItems) && latest.foodItems.length > 0;

    if (!hasFoodItems && latest.id) {
      try {
        return await fetchListingDetail(latest.id, { refresh: true });
      } catch {
        return latest as ListingDetail;
      }
    }

    return latest as ListingDetail;
  },

  invalidateSite: () => set({ siteLastFetched: null }),

  reset: () => set(INITIAL),
}));
