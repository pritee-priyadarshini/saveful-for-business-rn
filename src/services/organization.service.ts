import api from './api';

export const organizationService = {
  updateCoordinates: (
    organizationId: number | string,
    data: { latitude: number; longitude: number },
  ) => api.patch(`/organization/ccordinates/${organizationId}`, data),
};
