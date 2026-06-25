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