import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Platform } from 'react-native';

import App from './App';

// Lock portrait before first paint. Navigators also set orientation: 'portrait'
// because react-native-screens can override a global lock.
void (async () => {
  try {
    if (Platform.OS === 'android') {
      // ActivityInfo.SCREEN_ORIENTATION_PORTRAIT = 1
      await ScreenOrientation.lockPlatformAsync({
        screenOrientationConstantAndroid: 1,
      });
    } else {
      await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    }
  } catch {
    // Native module may be missing until a rebuild; navigators still enforce portrait.
  }
})();

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const FIREBASE_ENABLED = Constants.expoConfig?.extra?.firebaseEnabled === true;

if (!IS_EXPO_GO) {
  const { setNotificationHandler } = require('expo-notifications');
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  if (FIREBASE_ENABLED) {
    try {
      const { default: messaging } = require('@react-native-firebase/messaging');
      messaging().setBackgroundMessageHandler(async (remoteMessage) => {
        console.log('[Push] Background message received:', remoteMessage.messageId);
      });
    } catch (error) {
      console.log('[Push] Firebase messaging not available', error);
    }
  }
}

registerRootComponent(App);
