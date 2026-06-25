import { Alert, AppState, Linking, Platform } from 'react-native';
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
const FIREBASE_ENABLED = Constants.expoConfig?.extra?.firebaseEnabled === true;

let tokenRefreshUnsubscribe: (() => void) | null = null;
let foregroundUnsubscribe: (() => void) | null = null;
let tapUnsubscribe: (() => void) | null = null;
let appStateUnsubscribe: (() => void) | null = null;
let permissionSettingsAlertShown = false;
let tokenRegistrationInFlight = false;

function isPermissionGranted(
  permissions: { granted?: boolean; status?: string },
): boolean {
  return permissions.granted === true || permissions.status === 'granted';
}

function getNotificationsModule() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  const Notifications = getNotificationsModule();
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

function showNotificationSettingsAlert(): void {
  if (permissionSettingsAlertShown) return;
  permissionSettingsAlertShown = true;

  Alert.alert(
    'Enable notifications',
    'Allow notifications to receive pickup updates, claims, and nearby listing alerts.',
    [
      {
        text: 'Not now',
        style: 'cancel',
        onPress: () => {
          permissionSettingsAlertShown = false;
        },
      },
      {
        text: 'Open Settings',
        onPress: () => {
          permissionSettingsAlertShown = false;
          Linking.openSettings();
        },
      },
    ],
  );
}

/**
 * Requests the OS notification permission when not yet granted.
 * Shows the system dialog on first ask; directs to Settings if permanently denied.
 */
export async function ensureNotificationPermission(
  options: { prompt?: boolean } = {},
): Promise<boolean> {
  const { prompt = true } = options;
  const Notifications = getNotificationsModule();

  await setupAndroidNotificationChannel();

  let permissions = await Notifications.getPermissionsAsync();

  if (!isPermissionGranted(permissions) && prompt) {
    console.log('[Push] Requesting notification permission');
    permissions = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: true,
        allowSound: true,
      },
    });
  }

  if (!isPermissionGranted(permissions)) {
    console.log('[Push] Notification permission not granted', {
      status: permissions.status,
      canAskAgain: permissions.canAskAgain,
    });
    if (prompt && permissions.canAskAgain === false) {
      showNotificationSettingsAlert();
    }
    return false;
  }

  if (Platform.OS === 'ios' && FIREBASE_ENABLED && !IS_EXPO_GO) {
    const {
      default: messaging,
      AuthorizationStatus,
    } = require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === AuthorizationStatus.AUTHORIZED ||
      authStatus === AuthorizationStatus.PROVISIONAL;
    if (!enabled) {
      console.log('[Push] iOS remote notification permission not granted');
      if (prompt) showNotificationSettingsAlert();
      return false;
    }
  }

  return true;
}

export function setupPushPermissionRetryOnAppFocus(): void {
  if (IS_EXPO_GO || !FIREBASE_ENABLED || appStateUnsubscribe) return;

  appStateUnsubscribe = AppState.addEventListener('change', (nextState) => {
    if (nextState === 'active') {
      // Re-check silently after user may have enabled notifications in Settings.
      void registerDeviceToken({ prompt: false });
    }
  }).remove;
}

export function teardownPushPermissionRetryOnAppFocus(): void {
  appStateUnsubscribe?.();
  appStateUnsubscribe = null;
}

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

export async function registerDeviceToken(
  options: { prompt?: boolean } = {},
): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  if (IS_EXPO_GO) {
    console.log('[Push] Skipped - remote push removed from Expo Go (SDK 53+). Use a dev build.');
    return;
  }

  if (!FIREBASE_ENABLED) {
    console.log(
      '[Push] Skipped — Firebase not configured (google-services.json missing). ' +
        'Add google-services.json and rebuild the dev client to enable FCM push.',
      { expoGo: IS_EXPO_GO, firebaseEnabled: FIREBASE_ENABLED },
    );
    return;
  }

  if (tokenRegistrationInFlight) {
    console.log('[Push] Token registration already in progress, skipping duplicate call');
    return;
  }

  tokenRegistrationInFlight = true;
  try {
    const { default: messaging } =
      require('@react-native-firebase/messaging') as typeof import('@react-native-firebase/messaging');

    const permitted = await ensureNotificationPermission({ prompt: options.prompt !== false });
    if (!permitted) return;

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
  } finally {
    tokenRegistrationInFlight = false;
  }
}

export async function unregisterDeviceToken(): Promise<void> {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;

  if (tokenRefreshUnsubscribe) {
    tokenRefreshUnsubscribe();
    tokenRefreshUnsubscribe = null;
  }

  if (!FIREBASE_ENABLED) {
    console.log('[Push] Logout — skipped token unregister (Firebase not configured, no FCM token was registered)');
    return;
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
  if (IS_EXPO_GO || !FIREBASE_ENABLED) return;
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
          // Stamp so addNotificationResponseReceivedListener can tell this apart from
          // a Firebase remote notification tap (which goes through onNotificationOpenedApp).
          data: { ...(remoteMessage.data ?? {}), _localNotif: '1' },
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
    console.log('[Push] Skipped - notification tap handler not available in Expo Go (SDK 53+).');
    return;
  }

  if (!FIREBASE_ENABLED) {
    console.log('[Push] Skipped - Firebase not configured for notification tap handling.');
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
  // Guard: only process locally-scheduled notifications (_localNotif marker).
  // Firebase background/killed taps are handled exclusively by onNotificationOpenedApp above.
  const localNotifSub = Notifications.addNotificationResponseReceivedListener((response) => {
    const data = (response.notification.request.content.data ?? {}) as Record<string, string>;
    if (!data._localNotif) return; // not a locally scheduled notification — ignore
    console.log('[Push] Foreground notification tapped:', response.notification.request.identifier);
    onOpen({
      messageId: response.notification.request.identifier,
      data,
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
