const { existsSync } = require('fs');

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
      ...(existsSync('./GoogleService-Info.plist') && { googleServicesFile: "./GoogleService-Info.plist" }),
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
      ...(existsSync('./google-services.json') && { googleServicesFile: "./google-services.json" }),
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
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
      [
        "expo-notifications",
        {
          icon: "./assets/intro/Saveful-for-Business-logo.png",
          color: "#F6F4EE",
          defaultChannel: "default",
        },
      ],
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
    },
  },
};
