import { AppState, Linking, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Application from 'expo-application';

import {
  notificationsService,
  type PushPlatform,
  type RegisterPushTokenPayload,
} from './notifications.service';
import type { UserRole } from '../types';
import { showConfirmAlert, useAppAlertStore } from '@/store/appAlertStore';


const IS_EXPO_GO = Constants.appOwnership === 'expo';
const FIREBASE_ENABLED = Constants.expoConfig?.extra?.firebaseEnabled === true;

let tokenRefreshUnsubscribe: (() => void) | null = null;
let foregroundUnsubscribe: (() => void) | null = null;
let tapUnsubscribe: (() => void) | null = null;
let appStateUnsubscribe: (() => void) | null = null;
let permissionSettingsAlertShown = false;
let tokenRegistrationInFlight = false;
let permissionOsPromptInFlight = false;

function isPermissionGranted(
  permissions: { granted?: boolean; status?: string },
): boolean {
  return permissions.granted === true || permissions.status === 'granted';
}

function getNotificationsModule() {
  return require('expo-notifications') as typeof import('expo-notifications');
}

export const CONNECTION_DAILY_PROMPT_CATEGORY = 'CONNECTION_DAILY_PROMPT';
export const CONNECTION_COLLECTION_READY_CATEGORY = 'CONNECTION_COLLECTION_READY';

const CONNECTION_ACTION_IDS = new Set([
  'ADD_SURPLUS',
  'NO_SURPLUS',
  'CONFIRM_COLLECTION',
  'CANNOT_COLLECT',
  'PAUSE',
]);

export async function registerNotificationCategories(): Promise<void> {
  try {
    const Notifications = getNotificationsModule();
    await Notifications.setNotificationCategoryAsync(CONNECTION_DAILY_PROMPT_CATEGORY, [
      {
        identifier: 'ADD_SURPLUS',
        buttonTitle: 'Add today’s surplus',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'NO_SURPLUS',
        buttonTitle: 'No surplus today',
        options: { opensAppToForeground: true },
      },
    ]);
    await Notifications.setNotificationCategoryAsync(CONNECTION_COLLECTION_READY_CATEGORY, [
      {
        identifier: 'CONFIRM_COLLECTION',
        buttonTitle: 'Confirm Collection',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'CANNOT_COLLECT',
        buttonTitle: 'Can’t collect today',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'PAUSE',
        buttonTitle: 'Pause',
        options: { opensAppToForeground: true },
      },
    ]);
  } catch (error) {
    console.log('[Push] Notification categories not registered', error);
  }
}

function notificationCategoryForData(data?: Record<string, string>): string | undefined {
  const type = String(data?.type ?? data?.notificationType ?? data?.event ?? '').toUpperCase();
  const category = String(data?.categoryId ?? '').trim();
  if (type === CONNECTION_DAILY_PROMPT_CATEGORY || category === CONNECTION_DAILY_PROMPT_CATEGORY) {
    return CONNECTION_DAILY_PROMPT_CATEGORY;
  }
  if (type === CONNECTION_COLLECTION_READY_CATEGORY || category === CONNECTION_COLLECTION_READY_CATEGORY) {
    return CONNECTION_COLLECTION_READY_CATEGORY;
  }
  return undefined;
}

function actionFromIdentifier(identifier?: string): string {
  const id = String(identifier ?? '').trim();
  if (CONNECTION_ACTION_IDS.has(id)) return id;
  return 'CHOOSE';
}

async function setupAndroidNotificationChannel(): Promise<void> {
  const Notifications = getNotificationsModule();
  await registerNotificationCategories();
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
  });
}

const NOTIFICATION_PERMISSION_MESSAGE =
  'Allow Saveful for Business to send notifications in order to provide you with prompts and information about food surplus and collections';

function showNotificationSettingsAlert(): void {
  if (permissionSettingsAlertShown) return;
  permissionSettingsAlertShown = true;

  showConfirmAlert({
    title: 'Enable notifications',
    message: NOTIFICATION_PERMISSION_MESSAGE,
    confirmLabel: 'Open Settings',
    cancelLabel: 'Not now',
    onConfirm: () => {
      Linking.openSettings();
    },
  });

  const unsubscribe = useAppAlertStore.subscribe((state, prev) => {
    if (prev.visible && !state.visible) {
      permissionSettingsAlertShown = false;
      unsubscribe();
    }
  });
}

/**
 * Requests the OS notification permission when not yet granted.
 * Only uses the system permission dialog — no custom pre-prompt.
 * On each login we try the system dialog again when still not granted.
 * Settings is never forced from the login flow.
 */
export async function ensureNotificationPermission(
  options: { prompt?: boolean; openSettingsIfDenied?: boolean } = {},
): Promise<boolean> {
  const { prompt = true, openSettingsIfDenied = false } = options;
  const Notifications = getNotificationsModule();

  await setupAndroidNotificationChannel();

  let permissions = await Notifications.getPermissionsAsync();

  if (!isPermissionGranted(permissions) && prompt) {
    if (permissionOsPromptInFlight) {
      console.log('[Push] OS permission prompt already in progress, skipping duplicate');
      return false;
    }

    // Always ask the OS. If the platform still allows a dialog, it shows.
    // If permanently blocked, this returns denied without a dialog (no Settings push here).
    permissionOsPromptInFlight = true;
    try {
      console.log('[Push] Requesting notification permission (system dialog)');
      permissions = await Notifications.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });
    } finally {
      permissionOsPromptInFlight = false;
    }
  }

  if (!isPermissionGranted(permissions)) {
    console.log('[Push] Notification permission not granted', {
      status: permissions.status,
      canAskAgain: permissions.canAskAgain,
    });
    if (
      prompt &&
      openSettingsIfDenied &&
      permissions.canAskAgain === false
    ) {
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
      if (prompt && openSettingsIfDenied) {
        showNotificationSettingsAlert();
      }
      return false;
    }
  }

  return true;
}

export type NotificationPermissionStatus = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export type NotificationPermissionState = {
  supported: boolean;
  firebaseEnabled: boolean;
  granted: boolean;
  status: NotificationPermissionStatus;
  canAskAgain: boolean;
};

export function isPushSupportedOnDevice(): boolean {
  return (Platform.OS === 'ios' || Platform.OS === 'android') && !IS_EXPO_GO;
}

export async function readNotificationPermissionState(): Promise<NotificationPermissionState> {
  if (!isPushSupportedOnDevice()) {
    return {
      supported: false,
      firebaseEnabled: FIREBASE_ENABLED,
      granted: false,
      status: 'unavailable',
      canAskAgain: false,
    };
  }

  const Notifications = getNotificationsModule();
  const permissions = await Notifications.getPermissionsAsync();
  const granted = isPermissionGranted(permissions);

  let status: NotificationPermissionStatus = 'undetermined';
  if (granted) {
    status = 'granted';
  } else if (permissions.status === 'denied') {
    status = 'denied';
  }

  return {
    supported: true,
    firebaseEnabled: FIREBASE_ENABLED,
    granted,
    status,
    canAskAgain: permissions.canAskAgain !== false,
  };
}

/** True only when OS notification permission is granted (primary push Available Food flow). */
export async function areDeviceNotificationsOn(): Promise<boolean> {
  const state = await readNotificationPermissionState();
  return state.granted === true;
}

export async function requestNotificationPermissionFromSettings(): Promise<NotificationPermissionState> {
  if (!isPushSupportedOnDevice()) {
    return readNotificationPermissionState();
  }

  const current = await readNotificationPermissionState();
  // Profile "Turn on" — try system dialog first; only offer Settings if OS blocks re-prompt.
  const granted = await ensureNotificationPermission({
    prompt: true,
    openSettingsIfDenied: !current.canAskAgain,
  });
  if (granted) {
    await registerDeviceToken({ prompt: false });
  }

  return readNotificationPermissionState();
}

export function openNotificationSystemSettings(): void {
  Linking.openSettings();
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
    targetApp: 'business',
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
    const missingConfig =
      Platform.OS === 'ios'
        ? 'GoogleService-Info.plist missing — download from Firebase Console for this iOS app and rebuild.'
        : 'google-services.json missing — add it and rebuild the dev client to enable FCM push.';
    console.log(`[Push] Skipped — Firebase not configured (${missingConfig})`, {
      expoGo: IS_EXPO_GO,
      firebaseEnabled: FIREBASE_ENABLED,
      platform: Platform.OS,
    });
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

    const permitted = await ensureNotificationPermission({
      prompt: options.prompt !== false,
      openSettingsIfDenied: false,
    });
    if (!permitted) return;

    // iOS must be registered with APNs before FCM can issue a token.
    if (Platform.OS === 'ios' && !messaging().isDeviceRegisteredForRemoteMessages) {
      await messaging().registerDeviceForRemoteMessages();
      console.log('[Push] iOS registered for remote messages (APNs)');
    }

    const fcmToken = await messaging().getToken();
    if (!fcmToken) {
      console.log('[Push] No FCM token available');
      return;
    }

    await notificationsService.registerToken(buildTokenPayload(fcmToken, 'fcm'));
    console.log('[Push] FCM token registered', { platform: Platform.OS });

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
    await notificationsService.unregisterAllTokens('business');
    console.log('[Push] Business app tokens unregistered');
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

    const payload: NotificationPayload = {
      messageId: remoteMessage.messageId,
      data: remoteMessage.data as Record<string, string> | undefined,
      notification: remoteMessage.notification,
    };
    emitNotificationReceived(payload);

    // Firebase does not auto-display notifications when the app is in the foreground.
    // Schedule a local notification via expo-notifications so the user sees a banner.
    if (remoteMessage.notification?.title || remoteMessage.notification?.body) {
      const data = { ...(remoteMessage.data ?? {}), _localNotif: '1' } as Record<string, string>;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: remoteMessage.notification.title ?? '',
          body: remoteMessage.notification.body ?? '',
          // Stamp so addNotificationResponseReceivedListener can tell this apart from
          // a Firebase remote notification tap (which goes through onNotificationOpenedApp).
          data,
          sound: true,
          categoryIdentifier: notificationCategoryForData(data),
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

  void registerNotificationCategories();

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
    const action = actionFromIdentifier(response.actionIdentifier);
    const isConnectionAction = CONNECTION_ACTION_IDS.has(action);
    // Local banners we scheduled, plus iOS category buttons on the remote reminder.
    if (!data._localNotif && !isConnectionAction) return;
    console.log('[Push] Foreground notification tapped:', response.notification.request.identifier);
    onOpen({
      messageId: response.notification.request.identifier,
      data: { ...data, _action: action },
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

type NotificationListener = (payload: NotificationPayload) => void;

const notificationListeners = new Set<NotificationListener>();

export function subscribeNotificationReceived(listener: NotificationListener): () => void {
  notificationListeners.add(listener);
  return () => notificationListeners.delete(listener);
}

export function emitNotificationReceived(payload: NotificationPayload): void {
  notificationListeners.forEach((listener) => {
    try {
      listener(payload);
    } catch (error) {
      console.log('[Push] Notification listener error', error);
    }
  });
}

function normalizeNotificationValue(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

export function isCollectionNotification(payload: NotificationPayload): boolean {
  const data = payload.data ?? {};
  const type = normalizeNotificationValue(data.type ?? data.notificationType ?? data.event);
  const deepLink = normalizeNotificationValue(data.deepLink ?? data.deep_link ?? data.link);
  const screen = normalizeNotificationValue(data.screen ?? data.targetScreen);

  if (
    type.includes('collect') ||
    type.includes('provider') ||
    type.includes('feedback') ||
    type.includes('rating') ||
    type.includes('driver_rejected') ||
    type.includes('driver_declined') ||
    type.includes('driver_accepted')
  ) {
    return true;
  }
  if (deepLink.includes('updates') || deepLink.includes('available') || screen === 'updates') {
    return true;
  }
  return false;
}

export function isFoodListingNotification(payload: NotificationPayload): boolean {
  const data = payload.data ?? {};
  const type = normalizeNotificationValue(data.type ?? data.notificationType ?? data.event);
  const deepLink = normalizeNotificationValue(data.deepLink ?? data.deep_link ?? data.link);
  const screen = normalizeNotificationValue(data.screen ?? data.targetScreen);

  if (type.includes('listing') || type.includes('surplus') || type.includes('food')) {
    return true;
  }
  if (deepLink.includes('available') || deepLink.includes('discover') || deepLink.includes('listing')) {
    return true;
  }
  if (screen === 'available' || screen === 'charitymap' || screen === 'discover') {
    return true;
  }
  return Boolean(data.listingId || data.foodListingId);
}

export type NotificationNavigationTarget =
  | { name: 'DriverTracking'; params: { trackingId: string; source: 'restaurant' | 'charity' | 'farmer' } }
  | { name: 'Tabs'; params?: { screen: string; params?: Record<string, unknown> } }
  | { name: 'ManageSites'; params?: undefined }
  | { name: 'Connections'; params?: { siteId?: number } }
  | { name: 'CharityConnections' }
  | { name: 'AddDailySurplus'; params: { dayId: number; connectionId?: number; charityName?: string } };

export type DailyPromptDecision = {
  dayId: number;
  connectionId?: number;
  charityName?: string;
  action: 'ADD_SURPLUS' | 'NO_SURPLUS' | 'CHOOSE';
  title?: string;
  body?: string;
};

export type CollectionReadyDecision = {
  connectionId: number;
  dayId?: number;
  listingId?: number;
  donorName?: string;
  action: 'CONFIRM_COLLECTION' | 'CANNOT_COLLECT' | 'PAUSE' | 'CHOOSE';
  title?: string;
  body?: string;
};

export function resolveCollectionReadyDecision(
  payload: NotificationPayload,
): CollectionReadyDecision | null {
  const data = payload.data ?? {};
  const rawType = String(data.type ?? data.notificationType ?? data.event ?? '').toUpperCase();
  if (rawType !== CONNECTION_COLLECTION_READY_CATEGORY) return null;

  const connectionId = Number(data.connectionId);
  if (!Number.isFinite(connectionId) || connectionId <= 0) return null;

  const rawAction = String(data._action ?? '').toUpperCase();
  const action =
    rawAction === 'CONFIRM_COLLECTION' ||
    rawAction === 'CANNOT_COLLECT' ||
    rawAction === 'PAUSE'
      ? rawAction
      : 'CHOOSE';

  const dayId = Number(data.connectionDayId);
  const listingId = Number(data.listingId);

  return {
    connectionId,
    dayId: Number.isFinite(dayId) && dayId > 0 ? dayId : undefined,
    listingId: Number.isFinite(listingId) && listingId > 0 ? listingId : undefined,
    donorName: data.donorName ? String(data.donorName) : undefined,
    action,
    title: payload.notification?.title,
    body: payload.notification?.body,
  };
}

export function resolveDailyPromptDecision(
  payload: NotificationPayload,
): DailyPromptDecision | null {
  const data = payload.data ?? {};
  const rawType = String(data.type ?? data.notificationType ?? data.event ?? '').toUpperCase();
  if (rawType !== CONNECTION_DAILY_PROMPT_CATEGORY) return null;

  const dayId = Number(data.connectionDayId);
  if (!Number.isFinite(dayId) || dayId <= 0) return null;

  const rawAction = String(data._action ?? '').toUpperCase();
  const action =
    rawAction === 'NO_SURPLUS' || rawAction === 'ADD_SURPLUS' ? rawAction : 'CHOOSE';

  return {
    dayId,
    connectionId: Number(data.connectionId) > 0 ? Number(data.connectionId) : undefined,
    charityName: data.charityName ? String(data.charityName) : undefined,
    action,
    title: payload.notification?.title,
    body: payload.notification?.body,
  };
}

export function resolveNotificationTarget(
  payload: NotificationPayload,
  role: UserRole,
): NotificationNavigationTarget {
  const data = payload.data ?? {};

  if (data.trackingId && data.source) {
    return {
      name: 'DriverTracking',
      params: {
        trackingId: String(data.trackingId),
        source: data.source as 'restaurant' | 'charity' | 'farmer',
      },
    };
  }

  const type = normalizeNotificationValue(data.type ?? data.notificationType ?? data.event);
  const deepLink = normalizeNotificationValue(data.deepLink ?? data.deep_link ?? data.link);
  const rawType = String(data.type ?? data.notificationType ?? data.event ?? '').toUpperCase();

  if (
    rawType === 'CONNECTION_DAILY_PROMPT' ||
    rawType === 'CONNECTION_CUTOFF'
  ) {
    const dayId = Number(data.connectionDayId);
    if (Number.isFinite(dayId) && dayId > 0 && rawType === 'CONNECTION_DAILY_PROMPT') {
      return {
        name: 'AddDailySurplus',
        params: {
          dayId,
          connectionId: Number(data.connectionId) || undefined,
          charityName: data.charityName ? String(data.charityName) : undefined,
        },
      };
    }
    return { name: 'Tabs', params: { screen: 'Listings', params: { screen: 'Surplus' } } };
  }

  if (
    rawType === 'CONNECTION_INVITATION' ||
    rawType === 'CONNECTION_COLLECTION_READY' ||
    rawType === 'CONNECTION_NO_SURPLUS' ||
    rawType === 'CONNECTION_NO_RESPONSE'
  ) {
    if (rawType === 'CONNECTION_COLLECTION_READY' || rawType === 'CONNECTION_NO_RESPONSE') {
      const connId = Number(data.connectionId);
      if (Number.isFinite(connId) && connId > 0) {
        return { name: 'CharityConnectionDetail', params: { connectionId: connId } };
      }
      return { name: 'CharityConnections' };
    }
    return { name: 'CharityConnections' };
  }

  if (
    rawType === 'CONNECTION_ACCEPTED' ||
    rawType === 'CONNECTION_DECLINED' ||
    rawType === 'CONNECTION_RELEASED'
  ) {
    return { name: 'Connections' };
  }

  // Driver declined — charity should re-assign or self-collect from Available.
  if (
    type.includes('driver_rejected') ||
    type.includes('driver_declined') ||
    deepLink === 'available'
  ) {
    if (role === 'charity_single' || role === 'charity_multi' || role === 'farmer') {
      return { name: 'Tabs', params: { screen: 'Available' } };
    }
  }

  if (isCollectionNotification(payload)) {
    return { name: 'Tabs', params: { screen: 'Updates' } };
  }

  if (isFoodListingNotification(payload)) {
    if (role === 'charity_single' || role === 'charity_multi' || role === 'farmer') {
      return { name: 'Tabs', params: { screen: 'Available' } };
    }
  }

  if (role === 'restaurant_multi') {
    return { name: 'Tabs' };
  }

  return { name: 'Tabs' };
}
