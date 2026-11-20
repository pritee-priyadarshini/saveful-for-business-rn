import type { ListingDetail } from '../services/foodListing.service';
import type { FoodIconKey } from './foodListing';
import { isAnimalListing } from './foodListing';
import { mergeSavedFoodItems } from '../constants/listingFoodCatalogue';

export { isAnimalListing };

export function parseListingDate(val: unknown): Date | null {
  if (!val) return null;
  const date = new Date(val as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Saved items back onto the form's rows, matched by item name (a group such as
 * "Meat" is now the category of several items, so category can't be the key).
 * Nothing is dropped: an item without a row comes back as an extra row.
 */
export function mergePeopleFoodItems<T extends { name: string; qty: number; iconKey: FoodIconKey }>(
  apiItems: Array<{ name?: string; category?: string; totalQtyKg?: number }>,
  seedItems: T[],
): T[] {
  return mergeSavedFoodItems('people', apiItems, seedItems, (name, qty) => ({
    name,
    qty,
    iconKey: 'preparedMeals' as FoodIconKey,
  }) as T);
}

export function mergeFarmFoodItems<T extends { name: string; qty: number; icon: any }>(
  apiItems: Array<{ name?: string; category?: string; totalQtyKg?: number }>,
  seedItems: T[],
): T[] {
  return mergeSavedFoodItems('farm', apiItems, seedItems, (name, qty) => ({
    name,
    qty,
    icon: require('../../assets/placeholder/veggie_basket.png'),
  }) as T);
}

export function getListingPickupFrom(data: ListingDetail): string | undefined {
  return data.pickupFromTime ?? data.pickupFrom ?? data.startTime;
}

export function getListingPickupTo(data: ListingDetail): string | undefined {
  return data.pickupByTime ?? data.pickupTo ?? data.endTime;
}

export function getListingPickupAddress(data: ListingDetail): string {
  if (data.pickupAddress?.trim()) return data.pickupAddress.trim();
  if (data.address?.trim()) return data.address.trim();
  const siteAddress = (data as { site?: { address?: string } }).site?.address;
  if (siteAddress?.trim()) return siteAddress.trim();
  return '';
}

export function extractListingImages(data: ListingDetail): string[] {
  if (Array.isArray(data.images)) {
    return data.images.filter((uri): uri is string => typeof uri === 'string' && uri.length > 0);
  }
  return [];
}

const PEOPLE_STORAGE = ['Fridge', 'Freezer', 'Ambient', 'Hot'] as const;
type PeopleStorage = (typeof PEOPLE_STORAGE)[number];

export function inferPeopleStorage(data: ListingDetail): PeopleStorage {
  const raw = data.storage;
  if (typeof raw === 'string' && PEOPLE_STORAGE.includes(raw as PeopleStorage)) {
    return raw as PeopleStorage;
  }
  if (Array.isArray(raw)) {
    const match = raw.find((s) => PEOPLE_STORAGE.includes(s as PeopleStorage));
    if (match) return match as PeopleStorage;
  }
  if (data.needsHot) return 'Hot';
  if (data.needsAmbient) return 'Ambient';
  if (data.needsFreezer) return 'Freezer';
  if (data.needsRefrigeration) return 'Fridge';
  return 'Freezer';
}

export function inferReheating(data: ListingDetail): 'Yes' | 'No' | 'Not sure' {
  if (data.reheating === 'Yes' || data.reheating === 'No' || data.reheating === 'Not sure') {
    return data.reheating;
  }
  if (data.needsReheating === true) return 'Yes';
  if (data.needsReheating === false) return 'No';
  return 'No';
}

export function inferPeopleAllergens(data: ListingDetail): string[] {
  if (Array.isArray(data.allergens) && data.allergens.length > 0) return data.allergens;
  if (Array.isArray(data.allergenList) && data.allergenList.length > 0) return data.allergenList;
  return [];
}

export function inferFarmStorage(data: ListingDetail): string[] {
  const raw = data.storage ?? data.storageOptions;
  if (Array.isArray(raw)) return raw.filter(Boolean);
  if (typeof raw === 'string' && raw.trim()) return [raw.trim()];
  if (data.needsRefrigeration) return ['Fridge'];
  return [];
}

export function inferContaminants(data: ListingDetail): string[] {
  if (Array.isArray(data.contaminants)) return data.contaminants.filter(Boolean);
  return [];
}
