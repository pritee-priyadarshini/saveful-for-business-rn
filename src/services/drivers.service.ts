import api from './api';

export type AssignPickupPayload = {
  claimId: number;
  listingId: number;
  driverId: number;
};

export type RespondPickupPayload = {
  accept: boolean;
};

export type LiveDriver = {
  id: number;
  name: string;
  phone: string;
  online: boolean;
  vehicleType: string | null;
  lat: number;
  lng: number;
};

export const driversService = {
  getLiveDriversForSite: async (siteId: number): Promise<LiveDriver[]> => {
    const response = await api.get(`/drivers/site/${siteId}/live`);
    return response.data.drivers ?? [];
  },

  assignPickup: (data: AssignPickupPayload) =>
    api.post('/drivers/pickups/assign', data),

  respondToPickup: (pickupId: number, data: RespondPickupPayload) =>
    api.patch(`/drivers/pickups/${pickupId}/respond`, data),
};
