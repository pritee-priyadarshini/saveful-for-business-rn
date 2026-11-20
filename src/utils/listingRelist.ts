import {
  fetchListingDetail,
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
import { useListingsStore } from '../store/listingsStore';

export type RelistAudience = 'people' | 'animal';

export async function fetchLatestListingForRelist(
  audience: RelistAudience,
): Promise<ListingDetail | null> {
  return useListingsStore.getState().fetchLatestForRelist(audience);
}

export function getPeopleRelistFormValues<T extends { name: string; qty: number; iconKey: FoodIconKey }>(
  data: ListingDetail,
  seedItems: T[],
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
    collectionNotes: String(data.collectionNotes ?? '').trim(),
    images: extractListingImages(data),
    confirmedSafe: false,
  };
}

export function getFarmRelistFormValues<T extends { name: string; qty: number; icon: any }>(
  data: ListingDetail,
  seedItems: T[],
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
    collectionNotes: String(data.collectionNotes ?? '').trim(),
    images: extractListingImages(data),
    confirmedSafe: false,
  };
}
