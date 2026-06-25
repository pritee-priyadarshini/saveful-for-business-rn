import {
  fetchListingDetail,
  foodListingService,
  normalizeListingsResponse,
  type ListingDetail,
} from '../services/foodListing.service';
import { isAnimalListing, isPeopleListing } from './foodListing';
import type { FoodIconKey } from './foodListing';
import {
  extractListingImages,
  getListingPickupAddress,
  getListingPickupFrom,
  getListingPickupTo,
  inferContaminants,
  inferFarmStorage,
  inferPeopleAllergens,
  inferPeopleStorage,
  inferReheating,
  mergeFarmFoodItems,
  mergePeopleFoodItems,
  parseListingDate,
} from './listingFormPrefill';

export type RelistAudience = 'people' | 'animal';

function sortListingsNewestFirst(a: FoodListingSortable, b: FoodListingSortable) {
  const aMs = new Date(a.createdAt || a.updatedAt || 0).getTime();
  const bMs = new Date(b.createdAt || b.updatedAt || 0).getTime();
  return bMs - aMs;
}

type FoodListingSortable = {
  createdAt?: string;
  updatedAt?: string;
};

export async function fetchLatestListingForRelist(
  audience: RelistAudience,
): Promise<ListingDetail | null> {
  const res = await foodListingService.getSiteListings();
  const { listings } = normalizeListingsResponse(res);
  const matchesAudience = audience === 'animal' ? isAnimalListing : isPeopleListing;

  const candidates = listings
    .filter((listing) => {
      if (!matchesAudience(listing)) return false;
      const status = String(listing.status || '').toUpperCase();
      return status !== 'CANCELLED';
    })
    .sort(sortListingsNewestFirst);

  if (candidates.length === 0) return null;

  const latest = candidates[0];
  const hasFoodItems = Array.isArray(latest.foodItems) && latest.foodItems.length > 0;

  if (!hasFoodItems && latest.id) {
    try {
      return await fetchListingDetail(latest.id, { refresh: true });
    } catch {
      return latest as ListingDetail;
    }
  }

  return latest as ListingDetail;
}

export function getPeopleRelistFormValues(
  data: ListingDetail,
  seedItems: Array<{ name: string; qty: number; iconKey: FoodIconKey }>,
) {
  return {
    items: mergePeopleFoodItems(data.foodItems ?? [], seedItems),
    location: getListingPickupAddress(data),
    bestBeforeDate: parseListingDate(data.bestBefore),
    pickupFromDate: parseListingDate(getListingPickupFrom(data)),
    pickupToDate: parseListingDate(getListingPickupTo(data)),
    storage: inferPeopleStorage(data),
    reheating: inferReheating(data),
    selectedAllergens: inferPeopleAllergens(data),
    images: extractListingImages(data),
    confirmedSafe: false,
  };
}

export function getFarmRelistFormValues(
  data: ListingDetail,
  seedItems: Array<{ name: string; qty: number; icon: any }>,
) {
  const contaminants =
    inferContaminants(data).length > 0
      ? inferContaminants(data)
      : inferPeopleAllergens(data);

  return {
    items: mergeFarmFoodItems(data.foodItems ?? [], seedItems),
    location: getListingPickupAddress(data),
    bestBeforeDate: parseListingDate(data.bestBefore),
    pickupFromDate: parseListingDate(getListingPickupFrom(data)),
    pickupToDate: parseListingDate(getListingPickupTo(data)),
    selectedStorage: inferFarmStorage(data),
    selectedContaminants: contaminants,
    images: extractListingImages(data),
    confirmedSafe: false,
  };
}
