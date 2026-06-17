import api from './api';

export type FoodItem = {
  category: string;
  totalQtyKg: number;
  remainingQtyKg: number;
};

export type ListingDetail = {
  id?: number;
  pickupAddress?: string;
  address?: string;
  bestBefore?: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  pickupFrom?: string;
  pickupTo?: string;
  startTime?: string;
  endTime?: string;
  foodItems?: FoodItem[];
  needsRefrigeration?: boolean;
  needsReheating?: boolean;
  containsAllergens?: boolean;
  isGlutenFree?: boolean;
  isSafeForDonation?: boolean;
  allergens?: string[];
  allergenList?: string[];
  storage?: string | string[];
  storageOptions?: string[];
  contaminants?: string[];
  reheating?: string;
  images?: string[];
};

export type CreateListingPayload = {
  siteId: number;
  foodItems: FoodItem[];
  pickupAddress: string;
  pickupPostcode?: string;
  bestBefore: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  needsRefrigeration?: boolean;
  needsReheating?: boolean;
  isGlutenFree?: boolean;
  isSafeForDonation?: boolean;
  containsAllergens?: boolean;
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
  status?: 'ACTIVE' | 'PARTIAL' | 'CLAIMED' | 'EXPIRED' | 'CANCELLED';
  page?: number;
  limit?: number;
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

const listingDetailCache = new Map<number, ListingDetail>();

export async function fetchListingDetail(
  listingId: number,
  options?: { refresh?: boolean },
): Promise<ListingDetail> {
  if (!options?.refresh && listingDetailCache.has(listingId)) {
    return listingDetailCache.get(listingId)!;
  }

  const response = await api.get(`/listings/${listingId}`);
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
  createListing: (payload: CreateListingPayload) =>
    api.post('/listings', payload),

  getListings: (params?: GetListingsParams) =>
    api.get('/listings', { params }),

  getListingById: (id: number) =>
    api.get(`/listings/${id}`),

  relist: (listingId: number, payload: RelistPayload) =>
    api.post(`/listings/${listingId}/relist`, payload),

  updateListing: (listingId: number, payload: UpdateListingPayload) =>
    api.patch(`/listings/${listingId}`, payload),

  cancelListing: (listingId: number) =>
    api.patch(`/listings/${listingId}/cancel`),
};
