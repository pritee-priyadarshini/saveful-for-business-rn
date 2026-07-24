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

export function isListingTimeWindowClosed(listing: any): boolean {
  const now = Date.now();
  const bestBefore = listing?.bestBefore ? new Date(listing.bestBefore).getTime() : NaN;
  const pickupByTime = listing?.pickupByTime ? new Date(listing.pickupByTime).getTime() : NaN;

  if (Number.isFinite(bestBefore) && bestBefore <= now) return true;
  if (Number.isFinite(pickupByTime) && pickupByTime <= now) return true;
  return false;
}

/** Map API / claim status to a canonical listing status for UI. */
export function resolveListingStatus(listing: any): ListingStatus {
  const status = String(listing?.status || '').toUpperCase();
  const claimStatus = String(listing?.claimStatus || '').toLowerCase();

  let resolved: ListingStatus = 'ACTIVE';
  if (status === 'ACTIVE' || status === 'AVAILABLE') resolved = 'ACTIVE';
  else if (status === 'PARTIAL') resolved = 'PARTIAL';
  else if (status === 'EXPIRED') resolved = 'EXPIRED';
  else if (status === 'CANCELLED') resolved = 'CANCELLED';
  else if (status === 'CLAIMED' || status === 'COMPLETED' || status === 'COLLECTED') resolved = 'CLAIMED';
  else if (['collected', 'completed', 'verified'].includes(claimStatus)) resolved = 'CLAIMED';

  // Past pickup / best-before should display and filter as expired even before the worker flips DB status.
  if ((resolved === 'ACTIVE' || resolved === 'PARTIAL') && isListingTimeWindowClosed(listing)) {
    return 'EXPIRED';
  }

  return resolved;
}

export function getListingStatusLabel(listing: any): string {
  return LISTING_STATUS_LABELS[resolveListingStatus(listing)];
}

export function isListingExpired(listing: any): boolean {
  return resolveListingStatus(listing) === 'EXPIRED';
}

export function isListingActive(listing: any): boolean {
  const status = resolveListingStatus(listing);
  return status === 'ACTIVE' || status === 'PARTIAL';
}

export function isListingCollected(listing: any): boolean {
  return resolveListingStatus(listing) === 'CLAIMED';
}

/** True when at least one non-cancelled claim on the listing is COLLECTED. */
export function listingHasCollectedClaim(listing: any): boolean {
  const claims = Array.isArray(listing?.foodClaims) ? listing.foodClaims : [];
  if (
    claims.some((claim: any) => String(claim?.status || '').toUpperCase() === 'COLLECTED')
  ) {
    return true;
  }
  const claimStatus = String(listing?.claimStatus || '').toUpperCase();
  return claimStatus === 'COLLECTED' || claimStatus === 'COMPLETED';
}

/** Kg from COLLECTED claims only (falls back to listing food items if claim qty missing). */
export function getCollectedClaimKg(listing: any): number {
  const claims = Array.isArray(listing?.foodClaims) ? listing.foodClaims : [];
  const collected = claims.filter(
    (claim: any) => String(claim?.status || '').toUpperCase() === 'COLLECTED',
  );
  if (collected.length === 0) return 0;

  const fromClaims = collected.reduce((sum: number, claim: any) => {
    if (Number.isFinite(Number(claim?.qtyKg))) {
      return sum + Number(claim.qtyKg);
    }
    const items = Array.isArray(claim?.claimItems) ? claim.claimItems : [];
    const itemKg = items.reduce(
      (itemSum: number, item: any) => itemSum + Number(item?.qtyKg || 0),
      0,
    );
    return sum + itemKg;
  }, 0);

  if (fromClaims > 0) return fromClaims;

  return (listing?.foodItems || []).reduce(
    (sum: number, item: any) => sum + Number(item.totalQtyKg || 0),
    0,
  );
}

export function isListingCancelled(listing: any): boolean {
  return resolveListingStatus(listing) === 'CANCELLED';
}

/** Newest listings first (createdAt, then id). */
export function compareListingsByNewest(a: any, b: any): number {
  const aMs = new Date(a.createdAt || a.updatedAt || 0).getTime();
  const bMs = new Date(b.createdAt || b.updatedAt || 0).getTime();
  if (bMs !== aMs) return bMs - aMs;
  return Number(b.id || 0) - Number(a.id || 0);
}

export function sortListingsByNewest<T>(listings: T[]): T[] {
  return [...listings].sort(compareListingsByNewest);
}