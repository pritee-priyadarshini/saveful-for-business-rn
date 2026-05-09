import api from './api';

export type FoodItem = {
  category: string;
  totalQtyKg: number;
  remainingQtyKg: number;
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
  bestBefore?: string;
  pickupFromTime?: string;
  pickupByTime?: string;
  needsRefrigeration?: boolean;
  needsReheating?: boolean;
  containsAllergens?: boolean;
  isGlutenFree?: boolean;
  isSafeForDonation?: boolean;
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