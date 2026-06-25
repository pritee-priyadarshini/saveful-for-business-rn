import api from './api';

export type PushPlatform = 'ios' | 'android';
export type PushTokenType = 'fcm' | 'expo' | 'apns';
export type PushTokenMode = 'prod' | 'dev';

export type RegisterPushTokenPayload = {
  token: string;
  platform: PushPlatform;
  tokenType: PushTokenType;
  tokenMode?: PushTokenMode;
  appVersion?: string;
  appBuild?: string;
  appBundle?: string;
};

export const notificationsService = {
  ping: () => api.get('/notifications/ping'),

  registerToken: (data: RegisterPushTokenPayload) =>
    api.post('/notifications/token', data),

  unregisterToken: (token: string) =>
    api.delete('/notifications/token', { data: { token } }),

  unregisterAllTokens: () => api.delete('/notifications/tokens/all'),
};
