import type { ListingStatus } from '../types';

export type FoodIconKey =
  | 'preparedMeals'
  | 'bread'
  | 'bakedGoods'
  | 'fruitVeg'
  | 'meat'
  | 'dairy'
  | 'defaultMeal';

const FOOD_ICON_SOURCES: Record<FoodIconKey, any> = {
  preparedMeals: require('../../assets/placeholder/meal_icon.png'),
  bread: require('../../assets/placeholder/bread_icon.png'),
  bakedGoods: require('../../assets/placeholder/baked_goods_icon.png'),
  fruitVeg: require('../../assets/placeholder/fruit&veg_icon.png'),
  meat: require('../../assets/placeholder/meat_icon.png'),
  dairy: require('../../assets/placeholder/milk_icon.png'),
  defaultMeal: require('../../assets/placeholder/meal_icon.png'),
};

export type FoodListingItem = {
  name?: string;
  category?: string;
  qty?: number;
  totalQtyKg?: number;
  iconKey?: FoodIconKey;
};

export const resolveFoodIconSource = (iconKey?: FoodIconKey | null) => {
  if (!iconKey) return FOOD_ICON_SOURCES.defaultMeal;
  return FOOD_ICON_SOURCES[iconKey] || FOOD_ICON_SOURCES.defaultMeal;
};

export const estimateMealsSaved = (totalKg: number) => {
  const safeKg = Math.max(0, totalKg || 0);
  return Math.floor((safeKg * 1000) / 420);
};

/** kg CO₂ avoided ≈ kg food redistributed × 2.1 */
export const CO2_AVOIDED_FACTOR = 2.1;

export const estimateCo2AvoidedKg = (totalKg: number) => {
  const safeKg = Math.max(0, totalKg || 0);
  return Math.round(safeKg * CO2_AVOIDED_FACTOR * 10) / 10;
};

export const formatCo2AvoidedKg = (totalKg: number) => {
  const value = estimateCo2AvoidedKg(totalKg);
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

export function getListingAudience(listing: any): 'human' | 'animal' | 'both' {
  const type = String(listing?.listingType || '').toUpperCase();
  if (type === 'ANIMAL') return 'animal';
  if (type === 'HUMAN') return 'human';
  if (type === 'BOTH') return 'both';
  return listing?.isSafeForDonation === false ? 'animal' : 'human';
}

export function isAnimalListing(listing: any) {
  const audience = getListingAudience(listing);
  return audience === 'animal' || audience === 'both';
}

export function isPeopleListing(listing: any) {
  const audience = getListingAudience(listing);
  return audience === 'human' || audience === 'both';
}

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  ACTIVE: 'Active',
  PARTIAL: 'Partial',
  CLAIMED: 'Claimed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

/** Map API / claim status to a canonical listing status for UI. */
export function resolveListingStatus(listing: any): ListingStatus {
  const status = String(listing?.status || '').toUpperCase();
  const claimStatus = String(listing?.claimStatus || '').toLowerCase();

  if (status === 'ACTIVE' || status === 'AVAILABLE') return 'ACTIVE';
  if (status === 'PARTIAL') return 'PARTIAL';
  if (status === 'EXPIRED') return 'EXPIRED';
  if (status === 'CANCELLED') return 'CANCELLED';
  if (status === 'CLAIMED' || status === 'COMPLETED' || status === 'COLLECTED') return 'CLAIMED';
  if (['collected', 'completed', 'verified'].includes(claimStatus)) return 'CLAIMED';

  return 'ACTIVE';
}

export function getListingStatusLabel(listing: any): string {
  return LISTING_STATUS_LABELS[resolveListingStatus(listing)];
}

export function isListingActive(listing: any): boolean {
  const status = resolveListingStatus(listing);
  return status === 'ACTIVE' || status === 'PARTIAL';
}

export function isListingCollected(listing: any): boolean {
  return resolveListingStatus(listing) === 'CLAIMED';
}

export function isListingExpired(listing: any): boolean {
  return resolveListingStatus(listing) === 'EXPIRED';
}

export function isListingCancelled(listing: any): boolean {
  return resolveListingStatus(listing) === 'CANCELLED';
}