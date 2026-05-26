export default {
  expo: {
    name: "SavefulBusiness",
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
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSPhotoLibraryUsageDescription: "Allow Saveful for Business to access your photo library to upload a logo.",
      },
      config: {
        googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY,
      },
    },

    android: {
      package: "com.priteepriyadarshini.savefulbusiness",
      adaptiveIcon: {
        foregroundImage: "./assets/intro/Saveful-for-Business-logo.png",
        backgroundColor: "#F6F4EE",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
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
        "expo-location",
        {
          locationWhenInUsePermission:
            "Allow Saveful for Business to access your location."
        }
      ]
    ],

     "extra": {
      "eas": {
        "projectId": "6863db47-e894-4b7e-944c-c0c66152e71d"
      },
      "googlePlacesApiKey": process.env.GOOGLE_MAPS_API_KEY
    }
  },
};