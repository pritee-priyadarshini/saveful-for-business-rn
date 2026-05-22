import api from './api';

export enum CharityMemberRole {
    HEAD_OFFICE_ADMIN = 'HEAD_OFFICE_ADMIN',
    HEAD_OFFICE = 'HEAD_OFFICE',
    LOCATION_ADMIN = 'LOCATION_ADMIN',
    TEAM_MEMBER = 'TEAM_MEMBER',
    DRIVER = 'DRIVER',
}

export type AddCharityLocationPayload = {
    locationName: string;
    address: string;
    postcode: string;
    adminContactName: string;
    adminEmail: string;
    adminMobile: string;
    adminPassword: string;
    radiusKm?: number;
    latitude?: number;
    longitude?: number;
};

export type UpdateCharityLocationPayload = {
    locationName?: string;
    address?: string;
    postcode?: string;
    contactName?: string;
    contactEmail?: string;
    contactMobile?: string;
    radiusKm?: number;
    latitude?: number;
    longitude?: number;
};

export type AddCharityMemberPayload = {
    firstName: string;
    lastName: string;
    email: string;
    mobile?: string;
    role: CharityMemberRole;
    password: string;
    locationId?: number;
    canClaimPickupsDirectly?: boolean;
};

export type UpdateCharityMemberPayload = {
    firstName?: string;
    lastName?: string;
    mobile?: string;
    canClaimPickupsDirectly?: boolean;
};

export type ResendInvitePayload = {
    newPassword: string;
};

export const charityService = {
    addLocation(data: AddCharityLocationPayload) {
        return api.post('/charity/locations', data);
    },

    listLocations() {
        return api.get('/charity/locations');
    },

    getLocation(locationId: number | string) {
        return api.get(`/charity/locations/${locationId}`);
    },

    updateLocation(locationId: number | string, data: UpdateCharityLocationPayload) {
        return api.patch(`/charity/locations/${locationId}`, data);
    },

    updateOrganizationCoordinates(organizationId: number | string, data: { latitude: number; longitude: number }) {
        return api.patch(`/organization/ccordinates/${organizationId}`, data);
    },

    deactivateLocation(locationId: number) {
        return api.delete(`/charity/locations/${locationId}`);
    },

    addMember(data: AddCharityMemberPayload) {
        return api.post('/charity/users', data);
    },

    listUsers() {
        return api.get('/charity/users');
    },

    getUser(userId: number) {
        return api.get(`/charity/users/${userId}`);
    },

    updateUser(userId: number, data: UpdateCharityMemberPayload,) {
        return api.patch(`/charity/users/${userId}`, data);
    },

    deactivateUser(userId: number) {
        return api.post(`/charity/users/${userId}/deactivate`);
    },

    activateUser(userId: number) {
        return api.post(`/charity/users/${userId}/activate`);
    },

    deleteUser(userId: number) {
        return api.delete(`/charity/users/${userId}`);
    },

    resendInvite(userId: number, data: ResendInvitePayload,) {
        return api.post(`/charity/users/${userId}/resend-invite`, data,);
    },
};