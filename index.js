import Constants from 'expo-constants';
import { registerRootComponent } from 'expo';

import App from './App';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

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

  const { default: messaging } = require('@react-native-firebase/messaging');
  messaging().setBackgroundMessageHandler(async (remoteMessage) => {
    console.log('[Push] Background message received:', remoteMessage.messageId);
  });
}

registerRootComponent(App);
