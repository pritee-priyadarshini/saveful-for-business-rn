import 'dotenv/config';

export default {
  expo: {
    name: "SavefulBusiness",
    slug: "saveful-business",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",

    splash: {
      backgroundColor: "#F6F4EE",
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.priteepriyadarshini.savefulbusiness",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },

    android: {
      package: "com.priteepriyadarshini.savefulbusiness",
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
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
    ],

    extra: {
      eas: {
        projectId: "2a58007e-5109-45fe-b80e-e0831772628e",
      },
    },

    owner: "pritee_priyadarshini",
  },
};