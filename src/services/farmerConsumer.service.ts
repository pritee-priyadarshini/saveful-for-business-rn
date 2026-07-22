import api from './api';

export enum FarmerConsumerMemberRole {
  ADMIN = 'ADMIN',
  TEAM_MEMBER = 'TEAM_MEMBER',
  DRIVER = 'DRIVER',
}

export type AddFarmerConsumerMemberPayload = {
  firstName: string;
  lastName: string;
  email: string;
  mobile?: string;
  role: FarmerConsumerMemberRole;
  password: string;
  canClaimPickupsDirectly?: boolean;
};

export type UpdateFarmerConsumerMemberPayload = {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  canClaimPickupsDirectly?: boolean;
};

export type ResendFarmerConsumerInvitePayload = {
  newPassword: string;
};

export const farmerConsumerService = {
  addMember(data: AddFarmerConsumerMemberPayload) {
    return api.post('/farmer-consumer/users', data);
  },

  listUsers() {
    return api.get('/farmer-consumer/users');
  },

  getUser(userId: number) {
    return api.get(`/farmer-consumer/users/${userId}`);
  },

  updateUser(userId: number, data: UpdateFarmerConsumerMemberPayload) {
    return api.patch(`/farmer-consumer/users/${userId}`, data);
  },

  deactivateUser(userId: number) {
    return api.post(`/farmer-consumer/users/${userId}/deactivate`);
  },

  activateUser(userId: number) {
    return api.post(`/farmer-consumer/users/${userId}/activate`);
  },

  deleteUser(userId: number) {
    return api.delete(`/farmer-consumer/users/${userId}`);
  },

  resendInvite(userId: number, data: ResendFarmerConsumerInvitePayload) {
    return api.post(`/farmer-consumer/users/${userId}/resend-invite`, data);
  },
};
