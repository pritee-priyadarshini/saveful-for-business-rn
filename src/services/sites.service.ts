import api from './api';

/** Matches CreateSiteDto in svforb — contact fields are set server-side. */
export type CreateSitePayload = {
  siteName: string;
  address: string;
  postcode: string;
  latitude: number;
  longitude: number;
};

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
    return api.get('/sites/organisation');
  },

  createSite(data: CreateSitePayload) {
    return api.post('/sites', data);
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
    return api.get(`/sites/${siteId}/staff`);
  },

  removeAccess(siteId: number, userId: number) {
    return api.delete(`/sites/${siteId}/access/${userId}`);
  },

  updateSite(siteId: number | string, data: UpdateSitePayload) {
    return api.patch(`/sites/${siteId}`, data);
  },

  deleteSite(siteId: number | string) {
    return api.delete(`/sites/${siteId}`);
  },
};
