import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

import {
  notificationsService,
  type PushPlatform,
  type RegisterPushTokenPayload,
} from './notifications.service';

/**
 * True when running inside Expo Go.
 *
 * expo-notifications remote push APIs (getExpoPushTokenAsync, addPushTokenListener, etc.)
 * were removed from Expo Go in SDK 53. Importing the module at the top level or calling
 * any of those APIs inside Expo Go throws "runtime not ready" and crashes the app.
 *
 * All push-notification code is guarded by this flag and loaded via require() at
 * call-time so the problematic modules are never resolved in Expo Go.
 * Use a development build to test push notifications end-to-end.
 */
const IS_EXPO_GO = Constants.appOwnership === 'expo';

let tokenRefreshUnsubscribe: (() => void) | null = null;
let foregroundUnsubscribe: (() => void) | null = null;
let tapUnsubscribe: (() => void) | null = null;

function getAppBundle(): string | undefined {
  if (Platform.OS === 'ios') return Constants.expoConfig?.ios?.bundleIdentifier;
  if (Platform.OS === 'android') return Constants.expoConfig?.android?.package;
  return undefined;
}

function buildTokenPayload(
  token: string,
  tokenType: RegisterPushTokenPayload['tokenType'],
): RegisterPushTokenPayload {
  return {
    token,
    platform: Platform.OS as PushPlatform,
    tokenType,
    tokenMode: __DEV__ ? 'dev' : 'prod',
    appVersion: Application.nativeApplicationVersion ?? undefined,
    appBuild: Application.nativeBuildVersion ?? undefined,
    appBundle: getAppBundle(),
  };
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ register / unregister â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function registerDeviceToken(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  if (IS_EXPO_GO) {
    console.log('[Push] Skipped â€” remote push removed from Expo Go (SDK 53+). Use a dev build.');
    return;
  }

  try {
    const {
      default: messaging,
      AuthorizationStatus,
    } = require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');

    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;

    if (!enabled) {
      console.log('[Push] Notification permission not granted');
      return;
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      console.log('[Push] No FCM token available');
      return;
    }

    await notificationsService.registerToken(buildTokenPayload(fcmToken, 'fcm'));
    console.log('[Push] FCM token registered');

    if (!tokenRefreshUnsubscribe) {
      tokenRefreshUnsubscribe = messaging().onTokenRefresh(async (newToken) => {
        try {
          await notificationsService.registerToken(buildTokenPayload(newToken, 'fcm'));
          console.log('[Push] FCM token refreshed and re-registered');
        } catch (error) {
          console.log('[Push] Token refresh registration failed', error);
        }
      });
    }
  } catch (error) {
    console.log('[Push] Device token registration failed', error);
  }
}

export async function unregisterDeviceToken(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  // Tear down the token-refresh listener so it cannot fire with a stale JWT after logout.
  if (tokenRefreshUnsubscribe) {
    tokenRefreshUnsubscribe();
    tokenRefreshUnsubscribe = null;
  }

  try {
    await notificationsService.unregisterAllTokens();
    console.log('[Push] All tokens unregistered');
  } catch (error) {
    console.log('[Push] Token unregister failed', error);
  }

  if (!IS_EXPO_GO) {
    try {
      const { default: messaging } =
        require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
      await messaging().deleteToken();
    } catch (error) {
      console.log('[Push] FCM deleteToken failed', error);
    }
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ foreground handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function setupForegroundNotificationHandler(): void {
  if (IS_EXPO_GO) {
    console.log('[Push] Skipped â€” foreground handler not available in Expo Go (SDK 53+).');
    return;
  }
  if (foregroundUnsubscribe) return;

  const Notifications =
    require('expo-notifications') as typeof import('expo-notifications');
  const { default: messaging } =
    require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');

  foregroundUnsubscribe = messaging().onMessage(async (remoteMessage) => {
    console.log('[Push] Foreground message received:', remoteMessage.messageId, remoteMessage.notification?.title);
    // Firebase does not auto-display notifications when the app is in the foreground.
    // Schedule a local notification via expo-notifications so the user sees a banner.
    if (remoteMessage.notification?.title || remoteMessage.notification?.body) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title ?? '',
          body: remoteMessage.notification.body ?? '',
          data: remoteMessage.data,
          sound: true,
        },
        trigger: null,
      });
    }
  });
}

export function teardownForegroundNotificationHandler(): void {
  foregroundUnsubscribe?.();
  foregroundUnsubscribe = null;
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ notification-tap handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

/** Normalized payload passed to the onOpen callback regardless of environment. */
export type NotificationPayload = {
  messageId?: string;
  data?: Record<string, string>;
  notification?: { title?: string; body?: string };
};

export async function setupNotificationOpenedHandler(
  onOpen: (payload: NotificationPayload) => void,
): Promise<void> {
  if (IS_EXPO_GO) {
    console.log('[Push] Skipped â€” notification tap handler not available in Expo Go (SDK 53+).');
    return;
  }

  const Notifications =
    require('expo-notifications') as typeof import('expo-notifications');
  const { default: messaging } =
    require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');

  // Background tap: app was in background state when the notification was tapped.
  const firebaseUnsub = messaging().onNotificationOpenedApp((remoteMessage) => {
    console.log('[Push] Notification opened app from background:', remoteMessage.messageId);
    onOpen({
      messageId: remoteMessage.messageId,
      data: remoteMessage.data as Record<string, string> | undefined,
      notification: remoteMessage.notification,
    });
  });

  // Foreground tap: tap on a banner we displayed via scheduleNotificationAsync.
  const localNotifSub = Notifications.addNotificationResponseReceivedListener((response) => {
    console.log('[Push] Foreground notification tapped:', response.notification.request.identifier);
    onOpen({
      messageId: response.notification.request.identifier,
      data: (response.notification.request.content.data ?? {}) as Record<string, string>,
      notification: {
        title: response.notification.request.content.title ?? undefined,
        body: response.notification.request.content.body ?? undefined,
      },
    });
  });

  tapUnsubscribe = () => {
    firebaseUnsub();
    localNotifSub.remove();
  };

  // Kill-state tap: app was killed when the notification was tapped.
  const initialMessage = await messaging().getInitialNotification();
  if (initialMessage) {
    console.log('[Push] App opened from killed state via notification:', initialMessage.messageId);
    onOpen({
      messageId: initialMessage.messageId,
      data: initialMessage.data as Record<string, string> | undefined,
      notification: initialMessage.notification,
    });
  }
}

export function teardownNotificationOpenedHandler(): void {
  tapUnsubscribe?.();
  tapUnsubscribe = null;
}
