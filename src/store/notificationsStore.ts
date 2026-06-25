import { create } from 'zustand';

import {
  openNotificationSystemSettings,
  readNotificationPermissionState,
  registerDeviceToken as registerDeviceTokenService,
  requestNotificationPermissionFromSettings,
  setupForegroundNotificationHandler,
  setupPushPermissionRetryOnAppFocus,
  teardownForegroundNotificationHandler,
  teardownPushPermissionRetryOnAppFocus,
  unregisterDeviceToken as unregisterDeviceTokenService,
  type NotificationPermissionState,
} from '../services/pushNotifications';
import { getUserFriendlyErrorMessage } from '../utils/apiError';

export type { NotificationPermissionState };

interface NotificationsState {
  permission: NotificationPermissionState | null;
  isFetchingPermission: boolean;
  isUpdatingPermission: boolean;
  isRegisteringToken: boolean;
  error: string | null;
}

interface NotificationsActions {
  fetchPermission: () => Promise<void>;
  enableNotifications: () => Promise<void>;
  openSystemSettings: () => void;
  registerDeviceToken: (options?: { prompt?: boolean }) => Promise<void>;
  unregisterDeviceToken: () => Promise<void>;
  setupPushHandlers: () => void;
  teardownPushHandlers: () => void;
  reset: () => void;
}

const INITIAL: NotificationsState = {
  permission: null,
  isFetchingPermission: false,
  isUpdatingPermission: false,
  isRegisteringToken: false,
  error: null,
};

export const useNotificationsStore = create<NotificationsState & NotificationsActions>(
  (set, get) => ({
    ...INITIAL,

    fetchPermission: async () => {
      if (get().isFetchingPermission) return;

      set({ isFetchingPermission: true, error: null });
      try {
        const permission = await readNotificationPermissionState();
        set({ permission });
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Failed to load notification settings'),
        });
      } finally {
        set({ isFetchingPermission: false });
      }
    },

    enableNotifications: async () => {
      if (get().isUpdatingPermission) return;

      set({ isUpdatingPermission: true, error: null });
      try {
        const permission = await requestNotificationPermissionFromSettings();
        set({ permission });
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Failed to update notification permission'),
        });
      } finally {
        set({ isUpdatingPermission: false });
      }
    },

    openSystemSettings: () => {
      openNotificationSystemSettings();
    },

    registerDeviceToken: async (options = {}) => {
      if (get().isRegisteringToken) return;

      set({ isRegisteringToken: true, error: null });
      try {
        await registerDeviceTokenService(options);
        const permission = await readNotificationPermissionState();
        set({ permission });
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Failed to register device for notifications'),
        });
      } finally {
        set({ isRegisteringToken: false });
      }
    },

    unregisterDeviceToken: async () => {
      set({ error: null });
      try {
        await unregisterDeviceTokenService();
      } catch (error: unknown) {
        set({
          error: getUserFriendlyErrorMessage(error, 'Failed to unregister notification token'),
        });
      }
    },

    setupPushHandlers: () => {
      setupForegroundNotificationHandler();
      setupPushPermissionRetryOnAppFocus();
    },

    teardownPushHandlers: () => {
      teardownForegroundNotificationHandler();
      teardownPushPermissionRetryOnAppFocus();
    },

    reset: () => {
      get().teardownPushHandlers();
      set({ ...INITIAL });
    },
  }),
);
