import api from './api';
import type { FoodListingType, ListingStatus } from '../types';

export type FoodItem = {
  id?: number;
  name?: string;
  category?: string;
  totalQtyKg: number;
  remainingQtyKg?: number;
  unit?: string;
};

export type FoodListing = {
  id: number;
  siteId: number;
  organisationId: number;
  listingType: FoodListingType;
  status: ListingStatus;
  totalQtyKg?: number;
  remainingQtyKg?: number;
  pickupAddress?: string;
  pickupPostcode?: string;
  pickupLat?: number;
  pickupLng?: number;
  bestBefore?: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  needsRefrigeration?: boolean;
  needsAmbient?: boolean;
  needsFreezer?: boolean;
  needsReheating?: boolean;
  isSafeForDonation?: boolean;
  allergens?: string[];
  photoUrls?: string[];
  foodItems?: FoodItem[];
  createdAt?: string;
  updatedAt?: string;
  foodClaims?: any[];
};

export type CreateFoodItemPayload = {
  name: string;
  totalQtyKg: number;
  unit?: string;
  category?: string;
};

export type CreateListingPayload = {
  siteId: number;
  listingType: FoodListingType;
  foodItems: CreateFoodItemPayload[];
  pickupAddress: string;
  pickupPostcode?: string;
  pickupLat: number;
  pickupLng: number;
  bestBefore: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  needsRefrigeration?: boolean;
  needsAmbient?: boolean;
  needsFreezer?: boolean;
  needsReheating?: boolean;
  isSafeForDonation?: boolean;
  allergens?: string[];
  photoUrls?: string[];
};

export type UpdateListingPayload = {
  foodItems?: FoodItem[];
  pickupAddress?: string;
  bestBefore?: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  needsRefrigeration?: boolean;
  needsReheating?: boolean;
  containsAllergens?: boolean;
  isGlutenFree?: boolean;
  isSafeForDonation?: boolean;
  allergens?: string[];
  storage?: string | string[];
  contaminants?: string[];
  reheating?: string;
};

export type RelistPayload = {
  foodItems?: FoodItem[];
  bestBefore: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  pickupLat?: number;
  pickupLng?: number;
};

export type GetListingsParams = {
  status?: ListingStatus;
  page?: number;
  limit?: number;
};

export type PaginatedListingsResponse = {
  listings: FoodListing[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export type ListingDetail = FoodListing & {
  address?: string;
  pickupFrom?: string;
  pickupTo?: string;
  startTime?: string;
  endTime?: string;
  containsAllergens?: boolean;
  isGlutenFree?: boolean;
  allergenList?: string[];
  storage?: string | string[];
  storageOptions?: string[];
  contaminants?: string[];
  reheating?: string;
  images?: string[];
};

export function normalizeListingResponse(response: any): ListingDetail | null {
  const raw = response?.data;
  if (!raw) return null;

  if (raw.id != null || raw.foodItems != null || raw.pickupAddress != null) {
    return raw as ListingDetail;
  }

  const nested = raw.listing ?? raw.data;
  if (nested && typeof nested === 'object') {
    return nested as ListingDetail;
  }

  return raw as ListingDetail;
}

export function normalizeListingsResponse(response: any): PaginatedListingsResponse {
  const raw = response?.data;

  if (Array.isArray(raw)) {
    return {
      listings: raw,
      total: raw.length,
      page: 1,
      limit: raw.length,
      totalPages: 1,
    };
  }

  if (Array.isArray(raw?.listings)) {
    return {
      listings: raw.listings,
      total: raw.total ?? raw.listings.length,
      page: raw.page ?? 1,
      limit: raw.limit ?? raw.listings.length,
      totalPages: raw.totalPages ?? 1,
    };
  }

  if (Array.isArray(raw?.data?.listings)) {
    return normalizeListingsResponse({ data: raw.data });
  }

  return {
    listings: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  };
}

function normalizeCreateListingPayload(payload: CreateListingPayload): CreateListingPayload {
  const foodItems = payload.foodItems.map((item) => ({
    name: String(item.name).trim(),
    totalQtyKg: Number(item.totalQtyKg),
    unit: item.unit?.trim() || 'kg',
    category: item.category?.trim() || String(item.name).trim(),
  }));

  return {
    siteId: Number(payload.siteId),
    listingType: payload.listingType,
    pickupAddress: String(payload.pickupAddress).trim(),
    pickupPostcode: payload.pickupPostcode?.trim() || undefined,
    pickupLat: Number(payload.pickupLat),
    pickupLng: Number(payload.pickupLng),
    bestBefore: payload.bestBefore,
    pickupFromTime: payload.pickupFromTime || undefined,
    pickupByTime: payload.pickupByTime || undefined,
    needsRefrigeration: Boolean(payload.needsRefrigeration),
    needsAmbient: Boolean(payload.needsAmbient),
    needsFreezer: Boolean(payload.needsFreezer),
    needsReheating: Boolean(payload.needsReheating),
    isSafeForDonation: payload.isSafeForDonation ?? true,
    allergens: Array.isArray(payload.allergens) ? payload.allergens : [],
    photoUrls: Array.isArray(payload.photoUrls) ? payload.photoUrls : [],
    foodItems,
  };
}

const listingDetailCache = new Map<number, ListingDetail>();

export async function fetchListingDetail(
  listingId: number,
  options?: { refresh?: boolean },
): Promise<ListingDetail> {
  if (!options?.refresh && listingDetailCache.has(listingId)) {
    return listingDetailCache.get(listingId)!;
  }

  const response = await api.get(`/food-listings/${listingId}`);
  const listing = normalizeListingResponse(response);

  if (!listing) {
    throw new Error('Listing not found');
  }

  listingDetailCache.set(listingId, listing);
  return listing;
}

export function invalidateListingDetail(listingId: number) {
  listingDetailCache.delete(listingId);
}

export const foodListingService = {
  createListing: (payload: CreateListingPayload) => {
    const body = normalizeCreateListingPayload(payload);
    return api.post('/food-listings', body);
  },

  getOrgListings: (orgId: number, params?: GetListingsParams) =>
    api.get(`/food-listings/org/${orgId}`, { params }),

  getRecentListings: (params?: Pick<GetListingsParams, 'page' | 'limit'>) =>
    api.get('/food-listings/recent', { params }),

  getListingById: (id: number) =>
    api.get(`/food-listings/${id}`),

  cancelListing: (listingId: number) =>
    api.delete(`/food-listings/${listingId}`),

  relist: (listingId: number, payload: RelistPayload) =>
    api.post(`/listings/${listingId}/relist`, payload),

  updateListing: (listingId: number, payload: UpdateListingPayload) =>
    api.patch(`/listings/${listingId}`, payload),
};
