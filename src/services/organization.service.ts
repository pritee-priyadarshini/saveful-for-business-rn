import api from './api';
import { patchFormData } from './multipart';

export { patchFormData };

export const organizationService = {
  updateCoordinates: (
    organizationId: number | string,
    data: { latitude: number; longitude: number },
  ) => api.patch(`/organization/ccordinates/${organizationId}`, data),

  updateOrganisation: (organizationId: number | string, data: FormData) =>
    patchFormData(`/organization/${organizationId}`, data),
};
