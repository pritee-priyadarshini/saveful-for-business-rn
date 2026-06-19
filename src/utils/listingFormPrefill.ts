import type { ListingDetail } from '../services/foodListing.service';
import type { FoodIconKey } from './foodListing';
import { isAnimalListing } from './foodListing';

export { isAnimalListing };

export function parseListingDate(val: unknown): Date | null {
  if (!val) return null;
  const date = new Date(val as string);
  return Number.isNaN(date.getTime()) ? null : date;
}

const normalizeName = (value: string) => value.trim().toLowerCase();

export function mergePeopleFoodItems(
  apiItems: Array<{ category?: string; totalQtyKg?: number }>,
  seedItems: Array<{ name: string; qty: number; iconKey: FoodIconKey }>,
) {
  const merged = seedItems.map((seed) => {
    const found = apiItems.find(
      (item) => normalizeName(item.category || '') === normalizeName(seed.name),
    );
    return { ...seed, qty: found?.totalQtyKg ?? 0 };
  });

  const extras = apiItems
    .filter(
      (item) =>
        !seedItems.some(
          (seed) => normalizeName(seed.name) === normalizeName(item.category || ''),
        ),
    )
    .map((item) => ({
      name: item.category || 'Other',
      qty: item.totalQtyKg ?? 0,
      iconKey: 'preparedMeals' as FoodIconKey,
    }));

  return [...merged, ...extras];
}

export function mergeFarmFoodItems(
  apiItems: Array<{ category?: string; totalQtyKg?: number }>,
  seedItems: Array<{ name: string; qty: number; icon: any }>,
) {
  const merged = seedItems.map((seed) => {
    const found = apiItems.find(
      (item) => normalizeName(item.category || '') === normalizeName(seed.name),
    );
    return { ...seed, qty: found?.totalQtyKg ?? 0 };
  });

  const extras = apiItems
    .filter(
      (item) =>
        !seedItems.some(
          (seed) => normalizeName(seed.name) === normalizeName(item.category || ''),
        ),
    )
    .map((item) => ({
      name: item.category || 'Other',
      qty: item.totalQtyKg ?? 0,
      icon: require('../../assets/placeholder/veggie_basket.png'),
    }));

  return [...merged, ...extras];
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

const PEOPLE_STORAGE = ['Fridge', 'Freezer', 'Ambient'] as const;
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
