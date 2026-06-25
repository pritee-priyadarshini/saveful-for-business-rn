import * as Device from 'expo-device';
import { PermissionStatus } from 'expo-modules-core';
import * as Notifications from 'expo-notifications';
import { AndroidNotificationPriority } from 'expo-notifications';
import Constants from 'expo-constants';
import { CurrentUser } from '../../models/Session';
import TokenManagerBase, {
  TokenManagerEvents,
  TokenManagerPermissionStatus,
} from './TokenManagerBase';
import {
  AppState,
  AppStateStatus,
  NativeEventSubscription,
  Platform,
} from 'react-native';

function isRunningInExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

function getEasProjectId(): string | undefined {
  return Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
}

async function getPushToken(): Promise<string> {
  if (isRunningInExpoGo()) {
    throw new Error(
      'Remote push is not available in Expo Go (SDK 53+). Use a development build.',
    );
  }

  if (Platform.OS === 'ios') {
    const projectId = getEasProjectId();
    const result = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined,
    );
    console.log('[PushToken] Got Expo push token:', result.data.substring(0, 30) + '...');
    return result.data;
  }

  const result = await Notifications.getDevicePushTokenAsync();
  console.log('[PushToken] Got device push token (FCM):', result.data.substring(0, 20) + '...');
  return result.data;
}

type ExpoPermissionResult = Notifications.NotificationPermissionsStatus & {
  status?: PermissionStatus;
  granted?: boolean;
  canAskAgain?: boolean;
};

function resolvePermissionStatus(
  permissions: Notifications.NotificationPermissionsStatus,
): PermissionStatus {
  const result = permissions as ExpoPermissionResult;

  if (result.status != null) {
    return result.status;
  }

  if (result.granted) {
    return PermissionStatus.GRANTED;
  }

  if (result.canAskAgain === false) {
    return PermissionStatus.DENIED;
  }

  return PermissionStatus.UNDETERMINED;
}

function expoPermissionStatusToTokenManagerPermissionStatus(
  status: PermissionStatus,
): TokenManagerPermissionStatus {
  switch (status) {
    case PermissionStatus.DENIED:
      return TokenManagerPermissionStatus.DENIED;
    case PermissionStatus.GRANTED:
      return TokenManagerPermissionStatus.GRANTED;
    case PermissionStatus.UNDETERMINED:
      return TokenManagerPermissionStatus.UNDETERMINED;
  }
}

class TokenManager extends TokenManagerBase {
  static shared = new TokenManager();

  private token?: string = undefined;

  private permission: TokenManagerPermissionStatus =
    TokenManagerPermissionStatus.UNDETERMINED;

  private appStateListener?: NativeEventSubscription;

  initialize = async () => {
    if (isRunningInExpoGo()) {
      console.log('[PushToken] Skipped — remote push not available in Expo Go (SDK 53+).');
      return;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
      });
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
          priority: AndroidNotificationPriority.DEFAULT,
        }),
      });
    }

    this.appStateListener?.remove();
    this.appStateListener = AppState.addEventListener(
      'change',
      this.appStateChanged,
    );

    const permissions = await Notifications.getPermissionsAsync();
    this.setPermission(
      expoPermissionStatusToTokenManagerPermissionStatus(
        resolvePermissionStatus(permissions),
      ),
    );

    if (this.permission === TokenManagerPermissionStatus.GRANTED) {
      try {
        const token = await getPushToken();
        this.setToken(token);
      } catch (e) {
        console.warn('[PushToken] Failed to get device push token:', e);
      }
    }
  };

  appStateChanged = (appStateStatus: AppStateStatus) => {
    if (appStateStatus === 'active') {
      this.checkNotificationPermissions();
    }
  };

  checkNotificationPermissions = async () => {
    const permissions = await Notifications.getPermissionsAsync();
    this.setPermission(
      expoPermissionStatusToTokenManagerPermissionStatus(
        resolvePermissionStatus(permissions),
      ),
    );

    if (this.permission === 'granted') {
      try {
        this.setToken(await getPushToken());
      } catch (e) {
        console.warn('[PushToken] Failed to refresh device push token:', e);
      }
    } else {
      this.setToken(undefined);
    }
  };

  registerForPushNotifications = async () => {
    if (isRunningInExpoGo()) {
      console.log('[PushToken] Skipped — remote push not available in Expo Go (SDK 53+).');
      return;
    }

    const existingPermissions = await Notifications.getPermissionsAsync();
    let finalStatus = resolvePermissionStatus(existingPermissions);
    if (finalStatus !== PermissionStatus.GRANTED) {
      const requestedPermissions = await Notifications.requestPermissionsAsync();
      finalStatus = resolvePermissionStatus(requestedPermissions);
    }
    if (finalStatus !== PermissionStatus.GRANTED) {
      console.error('Failed to get push token for push notification!');
      return;
    }
    this.setPermission(TokenManagerPermissionStatus.GRANTED);
    try {
      this.setToken(await getPushToken());
    } catch (e) {
      console.warn('[PushToken] Failed to get device push token after permission grant:', e);
    }
  };

  canAskForPermission = () => {
    if (this.permission === 'granted') {
      return false;
    }

    if (Platform.OS === 'android' && Number(Device.osVersion) >= 13) {
      return true;
    } else {
      return this.permission !== 'denied';
    }
  };

  setToken = (token?: string) => {
    this.token = token;
    this.emit(TokenManagerEvents.TokenChanged, this.token);
  };

  getToken = () => this.token;

  setPermission = (permission: TokenManagerPermissionStatus) => {
    this.permission = permission;
    this.emit(TokenManagerEvents.PermissionChanged, this.permission);
  };

  getPermission = () => this.permission;

  identifyUser = (_user: CurrentUser) => {};
}

export default TokenManager;
