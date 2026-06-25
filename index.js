import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';

import App from './App';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

if (!IS_EXPO_GO) {
  // expo-notifications remote push APIs were removed from Expo Go in SDK 53.
  // Only load these modules in native (development / production) builds.

  // Configure how foreground notifications are displayed.
  const { setNotificationHandler } = require('expo-notifications');
  setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  // Register the Firebase background handler before any component mounts.
  const { default: messaging } = require('@react-native-firebase/messaging');
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[Push] Background message received:', remoteMessage.messageId);
  });
}

registerRootComponent(App);
