const { existsSync } = require('fs');

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

if (includeFirebase) {
  console.log('[app.config] Firebase enabled', {
    android: Boolean(androidGoogleServicesFile),
    ios: Boolean(iosGoogleServicesFile),
    platform: process.env.EAS_BUILD_PLATFORM ?? 'local',
  });
}

const firebasePlugins = includeFirebase
  ? ['@react-native-firebase/app', '@react-native-firebase/messaging']
  : [];

if (!includeFirebase && process.env.EAS_BUILD) {
  console.warn(
    '[app.config] Firebase config plugins skipped — add google-services.json to enable FCM push. ' +
      'Manifest merge fix still applied for autolinked firebase modules.',
  );
}

// When Firebase is enabled, omit defaultChannel here — the channel is created at
// runtime in pushNotifications.ts. Including defaultChannel makes expo-notifications
// emit FCM channel meta-data that conflicts with @react-native-firebase/messaging.
const expoNotificationsPlugin = includeFirebase
  ? [
      'expo-notifications',
      {
        icon: './assets/intro/notification_icon.png',
        color: '#9B8AFB',
      },
    ]
  : ['expo-notifications'];

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
      icon: './assets/intro/Saveful-for-Business-logo.png',
      bundleIdentifier: 'com.priteepriyadarshini.savefulbusiness',
      ...(iosGoogleServicesFile && { googleServicesFile: iosGoogleServicesFile }),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          'Allow Saveful for Business to access your photo library to upload a logo.',
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },

    android: {
      package: 'com.saveful.business.app',
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
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },

    web: {
      bundler: 'metro',
    },

    plugins: [
      'expo-asset',
      '@react-native-community/datetimepicker',
      'expo-secure-store',
      'expo-font',
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
      googlePlacesApiKey: process.env.GOOGLE_MAPS_API_KEY,
      firebaseEnabled: includeFirebase,
    },
  },
};
