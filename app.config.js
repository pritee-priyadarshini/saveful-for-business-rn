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

const firebasePlugins = includeFirebase
  ? ['@react-native-firebase/app', '@react-native-firebase/messaging']
  : [];

if (!includeFirebase && process.env.EAS_BUILD) {
  console.warn(
    '[app.config] Firebase plugins skipped — add google-services.json (Android) and/or GoogleService-Info.plist (iOS) to enable push.',
  );
}

export default {
  expo: {
    name: "Saveful For Business",
    slug: "saveful-business",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/intro/Saveful-for-Business-logo.png",
    splash: {
      backgroundColor: "#F6F4EE",
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
      icon: "./assets/intro/Saveful-for-Business-logo.png",
      bundleIdentifier: "com.priteepriyadarshini.savefulbusiness",
      ...(iosGoogleServicesFile && { googleServicesFile: iosGoogleServicesFile }),
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription:
          "Allow Saveful for Business to access your photo library to upload a logo.",
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },

    android: {
      package: "com.saveful.business.app",
      ...(androidGoogleServicesFile && { googleServicesFile: androidGoogleServicesFile }),
      adaptiveIcon: {
        foregroundImage: "./assets/intro/Saveful-for-Business-logo.png",
        backgroundColor: "#F6F4EE",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "POST_NOTIFICATIONS",
        "android.permission.POST_NOTIFICATIONS",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },

    web: {
      bundler: "metro",
    },

    plugins: [
      "expo-asset",
      "@react-native-community/datetimepicker",
      "expo-secure-store",
      "expo-font",
      [
        "expo-notifications",
        {
          icon: "./assets/intro/Saveful-for-Business-logo.png",
          color: "#F6F4EE",
          defaultChannel: "default",
        },
      ],
      ...firebasePlugins,
      ...(includeFirebase ? [withAndroidFirebaseNotificationManifest] : []),
      [
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow Saveful for Business to access your location.",
        },
      ],
    ],

    extra: {
      eas: {
        projectId: "6863db47-e894-4b7e-944c-c0c66152e71d",
      },
      googlePlacesApiKey: process.env.GOOGLE_MAPS_API_KEY,
      firebaseEnabled: includeFirebase,
    },
  },
};
