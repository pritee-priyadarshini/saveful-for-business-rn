import api from './api';

export type AssignPickupPayload = {
  claimId: number;
  listingId: number;
  driverId: number;
};

export type RespondPickupPayload = {
  accept: boolean;
};

export const driversService = {

  assignPickup: (data: AssignPickupPayload) =>
    api.post('/drivers/pickups/assign', data),

  respondToPickup: (pickupId: number, data: RespondPickupPayload) =>
    api.patch(`/drivers/pickups/${pickupId}/respond`, data),
};
