import api from './api';

export type PushPlatform = 'ios' | 'android';
export type PushTokenType = 'fcm' | 'expo' | 'apns';
export type PushTokenMode = 'prod' | 'dev';
export type PushTargetApp = 'business' | 'driver';

export type RegisterPushTokenPayload = {
  token: string;
  platform: PushPlatform;
  tokenType: PushTokenType;
  tokenMode?: PushTokenMode;
  appVersion?: string;
  appBuild?: string;
  appBundle?: string;
  targetApp?: PushTargetApp;
};

// Admin — send
export type SendNotificationPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
  deepLink?: string;
  imageUrl?: string;
  priority?: 'low' | 'normal' | 'high';
  targetUserIds?: string[];
  isBroadcast?: boolean;
  targetPlatform?: 'all' | 'ios' | 'android';
  scheduledAt?: string;
};

// Admin — list
export type NotificationListParams = {
  page?: number;
  limit?: number;
  status?: 'queued' | 'processing' | 'sent' | 'partially_sent' | 'failed';
};

export const notificationsService = {
  // ── User-facing ──────────────────────────────────────────────────────────

  /** Verify the notification service is reachable. No auth required. */
  ping: () =>
    api.get('/notifications/ping'),

  /** Register or refresh a push token for the current device. */
  registerToken: (data: RegisterPushTokenPayload) =>
    api.post('/notifications/token', data),

  /** Unregister a single device token (per-device logout). */
  unregisterToken: (token: string) =>
    api.delete('/notifications/token', { data: { token } }),

  /** Unregister all tokens for the current user on this app (logout). */
  unregisterAllTokens: (targetApp: PushTargetApp = 'business') =>
    api.delete('/notifications/tokens/all', { params: { targetApp } }),

  /** Queue a notification for delivery. Platform admin only. */
  send: (data: SendNotificationPayload) =>
    api.post('/notifications/send', data),

  /** Re-dispatch an already-created notification record. Platform admin only. */
  dispatch: (id: number) =>
    api.post(`/notifications/dispatch/${id}`),

  /** Aggregate stats: token counts, queue depths, sent-today. Platform admin only. */
  getStats: () =>
    api.get('/notifications/stats'),

  /** Raw BullMQ queue counts only. Platform admin only. */
  getQueueStats: () =>
    api.get('/notifications/queue/stats'),

  /** Re-queue all failed jobs. Platform admin only. */
  retryFailed: () =>
    api.post('/notifications/queue/retry-failed'),

  /** Remove all pending jobs (emergency drain). Platform admin only. */
  drain: () =>
    api.post('/notifications/queue/drain'),

  /** Paginated notification history. Platform admin only. */
  list: (params?: NotificationListParams) =>
    api.get('/notifications', { params }),

  /** Single notification record by ID. Platform admin only. */
  getById: (id: number) =>
    api.get(`/notifications/${id}`),
};
