const { existsSync } = require('fs');
const path = require('path');

try {
  require('dotenv').config({ path: path.resolve(__dirname, '.env') });
} catch {
  // dotenv is provided transitively by Expo; ignore if unavailable
}

const withAndroidFirebaseNotificationManifest = require('./plugins/withAndroidFirebaseNotificationManifest');

const GOOGLE_SERVICES_ANDROID = './google-services.json';
const GOOGLE_SERVICES_IOS = './GoogleService-Info.plist';

function resolveGoogleServicesFile(defaultPath, envPath) {
  if (envPath && existsSync(envPath)) return envPath;
  if (existsSync(defaultPath)) return defaultPath;
  return undefined;
}

const androidGoogleServicesFile = resolveGoogleServicesFile(
  GOOGLE_SERVICES_ANDROID,
  process.env.GOOGLE_SERVICES_JSON,
);
const iosGoogleServicesFile = resolveGoogleServicesFile(
  GOOGLE_SERVICES_IOS,
  process.env.GOOGLE_SERVICES_PLIST,
);

function shouldIncludeFirebasePlugins() {
  const platform = process.env.EAS_BUILD_PLATFORM;
  if (platform === 'android') return Boolean(androidGoogleServicesFile);
  if (platform === 'ios') return Boolean(iosGoogleServicesFile);
  return Boolean(androidGoogleServicesFile || iosGoogleServicesFile);
}

const includeFirebase = shouldIncludeFirebasePlugins();

// Fail EAS Android builds early if Firebase client config is missing (APK + AAB).
if (
  process.env.EAS_BUILD &&
  process.env.EAS_BUILD_PLATFORM === 'android' &&
  !androidGoogleServicesFile
) {
  throw new Error(
    '[app.config] Android EAS build requires google-services.json. ' +
      'Run: eas env:create --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json --environment <env>',
  );
}

// Fail EAS iOS builds early if Firebase client config is missing (APNs/FCM).
if (
  process.env.EAS_BUILD &&
  process.env.EAS_BUILD_PLATFORM === 'ios' &&
  !iosGoogleServicesFile
) {
  throw new Error(
    '[app.config] iOS EAS build requires GoogleService-Info.plist. ' +
      'Download it from Firebase Console for bundle com.priteepriyadarshini.savefulbusiness, ' +
      'then run: eas env:create --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist --environment <env>',
  );
}

const firebasePlugins = includeFirebase
  ? ['@react-native-firebase/app', '@react-native-firebase/messaging']
  : [];

// production / store builds use production APNs; everything else uses development.
const apsEnvironment =
  process.env.EAS_BUILD_PROFILE === 'production' ? 'production' : 'development';

// When Firebase is enabled, omit defaultChannel here — the channel is created at
// runtime in pushNotifications.ts. Including defaultChannel makes expo-notifications
// emit FCM channel meta-data that conflicts with @react-native-firebase/messaging.
const expoNotificationsPlugin = [
  'expo-notifications',
  {
    ...(includeFirebase
      ? {
          icon: './assets/intro/notification_icon.png',
          color: '#9B8AFB',
        }
      : {}),
    // Required for iOS remote push (aps-environment + UIBackgroundModes).
    mode: apsEnvironment,
    enableBackgroundRemoteNotifications: true,
  },
];

export default {
  expo: {
    name: 'Saveful For Business',
    slug: 'saveful-business',
    version: '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: './assets/intro/Saveful-for-Business-logo.png',
    splash: {
      image: './assets/intro/logo.png',
      resizeMode: 'contain',
      backgroundColor: '#F6F4EE',
    },

    assetBundlePatterns: ['**/*'],

    ios: {
      supportsTablet: true,
      requireFullScreen: true,
      icon: './assets/intro/Saveful-for-Business-logo.png',
      bundleIdentifier: 'com.saveful.business.app',
      ...(iosGoogleServicesFile && { googleServicesFile: iosGoogleServicesFile }),
      entitlements: {
        'aps-environment': apsEnvironment,
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          'Allow Saveful for Business to access your photo library to upload a logo.',
        UISupportedInterfaceOrientations: ['UIInterfaceOrientationPortrait'],
        'UISupportedInterfaceOrientations~ipad': ['UIInterfaceOrientationPortrait'],
        UIBackgroundModes: ['remote-notification'],
      },
    },

    android: {
      package: 'com.saveful.business.app',
      softwareKeyboardLayoutMode: 'resize',
      ...(androidGoogleServicesFile && { googleServicesFile: androidGoogleServicesFile }),
      adaptiveIcon: {
        foregroundImage: './assets/intro/Saveful-for-Business-logo.png',
        backgroundColor: '#F6F4EE',
      },
      permissions: [
        'ACCESS_COARSE_LOCATION',
        'ACCESS_FINE_LOCATION',
        'READ_EXTERNAL_STORAGE',
        'WRITE_EXTERNAL_STORAGE',
        'POST_NOTIFICATIONS',
        'android.permission.POST_NOTIFICATIONS',
      ],
    },

    web: {
      bundler: 'metro',
    },

    plugins: [
      'expo-asset',
      '@react-native-community/datetimepicker',
      'expo-secure-store',
      'expo-font',
      [
        'expo-screen-orientation',
        {
          initialOrientation: 'PORTRAIT',
        },
      ],
      expoNotificationsPlugin,
      ...firebasePlugins,
      [
        'expo-location',
        {
          locationWhenInUsePermission:
            'Allow Saveful for Business to access your location.',
        },
      ],
      // Must be last — adds tools:replace after expo-notifications / firebase plugins.
      withAndroidFirebaseNotificationManifest,
    ],

    extra: {
      eas: {
        projectId: '6863db47-e894-4b7e-944c-c0c66152e71d',
      },
      firebaseEnabled: includeFirebase,
    },
  },
};
