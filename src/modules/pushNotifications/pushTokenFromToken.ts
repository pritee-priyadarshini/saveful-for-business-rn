import Constants from 'expo-constants';
import { PushToken } from './types';
import { Platform } from 'react-native';

export function pushTokenFromToken(token: string): PushToken {
  const appBundle = Platform.select({
    ios: Constants.expoConfig?.ios?.bundleIdentifier,
    android: Constants.expoConfig?.android?.package,
    default: 'com.greenr.app',
  });
  const appBuild = Platform.select({
    ios: Constants.expoConfig?.ios?.buildNumber,
    android: Constants.expoConfig?.android?.versionCode?.toString(),
  });

  const isExpoToken = token.startsWith('ExponentPushToken[') || token.startsWith('ExpoPushToken[');

  return {
    token,
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    tokenMode: __DEV__ ? 'dev' : 'prod',
    tokenType: isExpoToken ? 'expo' : (Platform.OS === 'ios' ? 'apns' : 'fcm'),
    appBundle,
    appVersion: Constants.expoConfig?.version,
    appBuild,
  };
}

export default pushTokenFromToken;
