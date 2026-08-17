import api from './api';

/** Matches CreateSiteDto in svforb — contact fields are set server-side. */
export type CreateSitePayload = {
  siteName: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
};

function toCreateSiteBody(data: CreateSitePayload) {
  return {
    siteName: String(data.siteName ?? '').trim(),
    address: String(data.address ?? '').trim(),
    postcode: String(data.postcode ?? '').trim(),
    latitude: Number(data.latitude),
    longitude: Number(data.longitude),
  };
}

export type AssignManagerPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
};

export type AddStaffPayload = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phoneNumber?: string;
};

export type UpdateSitePayload = {
  address?: string;
  siteName?: string;
  postcode?: string;
  contactName?: string;
  contactEmail?: string;
  phoneNumber?: string;
  latitude?: number;
  longitude?: number;
};

export const sitesService = {
  getOrganisation() {
    return api.get('/sites/organisation', {
      skipBillingHandler: true,
      skipUnauthorizedHandler: true,
    });
  },

  createSite(data: CreateSitePayload, options?: { skipBillingHandler?: boolean }) {
    return api.post('/sites', toCreateSiteBody(data), {
      skipBillingHandler: options?.skipBillingHandler,
      skipUnauthorizedHandler: options?.skipBillingHandler,
    });
  },

  assignManager(siteId: number, data: AssignManagerPayload) {
    return api.post(`/sites/${siteId}/assign-manager`, data);
  },

  addStaff(siteId: number, data: AddStaffPayload) {
    return api.post(`/sites/${siteId}/staff`, data);
  },

  getSiteDetails(siteId: number) {
    return api.get(`/sites/${siteId}/details`);
  },

  listStaff(siteId: number) {
    return api.get(`/sites/${siteId}/staff`, {
      skipBillingHandler: true,
      skipUnauthorizedHandler: true,
    });
  },

  removeAccess(siteId: number, userId: number) {
    return api.delete(`/sites/${siteId}/access/${userId}`);
  },

  updateSite(siteId: number | string, data: UpdateSitePayload) {
    const {
      address,
      siteName,
      postcode,
      contactName,
      contactEmail,
      phoneNumber,
      latitude,
      longitude,
    } = data;
    return api.patch(`/sites/${siteId}`, {
      ...(address != null ? { address } : {}),
      ...(siteName != null ? { siteName } : {}),
      ...(postcode != null ? { postcode } : {}),
      ...(contactName != null ? { contactName } : {}),
      ...(contactEmail != null ? { contactEmail } : {}),
      ...(phoneNumber != null ? { phoneNumber } : {}),
      ...(latitude != null ? { latitude } : {}),
      ...(longitude != null ? { longitude } : {}),
    });
  },

  deleteSite(siteId: number | string) {
    return api.delete(`/sites/${siteId}`);
  },
};
