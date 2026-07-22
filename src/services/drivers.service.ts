import api from './api';
import { isAxiosError } from 'axios';

export type AssignPickupPayload = {
  claimId: number;
  listingId: number;
  driverId: number;
};

export type RespondPickupPayload = {
  accept: boolean;
};

/** Driver belonging to a site (online or offline). */
export type SiteDriver = {
  id: number;
  name: string;
  phone: string;
  online: boolean;
  vehicleType: string | null;
  lat: number | null;
  lng: number | null;
};

/** @deprecated Prefer SiteDriver — kept for existing call sites. */
export type LiveDriver = SiteDriver & {
  lat: number;
  lng: number;
};

export type UnclaimedClaim = {
  claimId: number;
  listingId: number;
  status: string;
  claimMode: string;
  qtyKg: number;
  createdAt: string;
  listing: {
    id: number;
    pickupAddress: string;
    pickupFromTime: string | null;
    pickupByTime: string | null;
    totalQtyKg: number;
    remainingQtyKg: number;
    organisation: { id: number; name: string; logoUrl: string | null };
  };
};

function unwrapDrivers(data: any): SiteDriver[] {
  const list = Array.isArray(data?.drivers)
    ? data.drivers
    : Array.isArray(data?.data?.drivers)
      ? data.data.drivers
      : Array.isArray(data)
        ? data
        : [];

  return list.map((driver: any) => ({
    id: Number(driver.id),
    name: String(driver.name ?? ''),
    phone: String(driver.phone ?? ''),
    online: driver.online === true,
    vehicleType: driver.vehicleType ?? null,
    lat: driver.lat == null ? null : Number(driver.lat),
    lng: driver.lng == null ? null : Number(driver.lng),
  })).filter((driver: SiteDriver) => Number.isFinite(driver.id) && driver.id > 0);
}

function unwrapClaims(data: any): UnclaimedClaim[] {
  const list = Array.isArray(data?.claims)
    ? data.claims
    : Array.isArray(data?.data?.claims)
      ? data.data.claims
      : Array.isArray(data)
        ? data
        : [];

  return list
    .map((claim: any) => {
      const listing = claim.listing ?? {};
      const listingId = Number(claim.listingId ?? listing.id);
      const claimId = Number(claim.claimId ?? claim.id);
      return {
        claimId,
        listingId,
        status: String(claim.status ?? ''),
        claimMode: String(claim.claimMode ?? ''),
        qtyKg: Number(claim.qtyKg ?? listing.totalQtyKg ?? 0) || 0,
        createdAt: String(claim.createdAt ?? ''),
        listing: {
          id: Number(listing.id ?? listingId),
          pickupAddress: String(listing.pickupAddress ?? ''),
          pickupFromTime: listing.pickupFromTime ?? null,
          pickupByTime: listing.pickupByTime ?? null,
          totalQtyKg: Number(listing.totalQtyKg ?? 0) || 0,
          remainingQtyKg: Number(listing.remainingQtyKg ?? 0) || 0,
          organisation: {
            id: Number(listing.organisation?.id ?? 0),
            name: String(listing.organisation?.name ?? 'Food provider'),
            logoUrl: listing.organisation?.logoUrl ?? null,
          },
        },
      } as UnclaimedClaim;
    })
    .filter((claim: UnclaimedClaim) => claim.claimId > 0 && claim.listingId > 0);
}

export function getAssignPickupErrorMessage(error: unknown, fallback = 'Could not assign pickup') {
  if (isAxiosError(error)) {
    const status = error.response?.status;
    const message =
      (error.response?.data as any)?.message ||
      (Array.isArray((error.response?.data as any)?.message)
        ? (error.response?.data as any).message[0]
        : null);
    if (typeof message === 'string' && message.trim()) return message;
    if (status === 400) return 'Driver must be live to assign a pickup.';
    if (status === 409) return 'This pickup was already assigned. Refresh and try again.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export const driversService = {
  /** All drivers for a site (online + offline). */
  getDriversForSite: async (siteId: number): Promise<SiteDriver[]> => {
    const response = await api.get(`/drivers/site/${siteId}/drivers`);
    return unwrapDrivers(response.data);
  },

  /** Live-only drivers (legacy). Prefer getDriversForSite for home Drivers. */
  getLiveDriversForSite: async (siteId: number): Promise<LiveDriver[]> => {
    const response = await api.get(`/drivers/site/${siteId}/live`);
    return unwrapDrivers(response.data).map((driver) => ({
      ...driver,
      lat: driver.lat ?? 0,
      lng: driver.lng ?? 0,
    }));
  },

  getUnclaimedClaims: async (): Promise<UnclaimedClaim[]> => {
    const response = await api.get('/drivers/unclaimed-claims');
    return unwrapClaims(response.data);
  },

  assignPickup: (data: AssignPickupPayload) =>
    api.post('/drivers/pickups/assign', data),

  respondToPickup: (pickupId: number, data: RespondPickupPayload) =>
    api.patch(`/drivers/pickups/${pickupId}/respond`, data),
};
