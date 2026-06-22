export default {
  expo: {
    name: "Saveful For Business",
    slug: "saveful-business",
    version: "1.0.0",
    orientation: "portrait",
    userInterfaceStyle: "light",
    icon: "./assets/intro/Saveful-for-Business-logo.png",
    splash: {
      image: "./assets/intro/splash_logo.png",
      resizeMode: "cover",
      backgroundColor: "#F6F4EE",
    },

    assetBundlePatterns: ["**/*"],

    ios: {
      supportsTablet: true,
      icon: "./assets/intro/Saveful-for-Business-logo.png",
      bundleIdentifier: "com.priteepriyadarshini.savefulbusiness",
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
      package: "com.savefulbusiness.app",
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
      [
        "expo-splash-screen",
        {
          backgroundColor: "#F6F4EE",
          image: "./assets/intro/splash_logo.png",
          resizeMode: "cover",
          enableFullScreenImage_legacy: true,
          imageWidth: 200,
          ios: {
            backgroundColor: "#F6F4EE",
            image: "./assets/intro/splash_logo.png",
            resizeMode: "cover",
            enableFullScreenImage_legacy: true,
          },
          android: {
            backgroundColor: "#F6F4EE",
            image: "./assets/intro/splash_logo.png",
            resizeMode: "cover",
            imageWidth: 200,
          },
        },
      ],
      "expo-asset",
      "@react-native-community/datetimepicker",
      "expo-secure-store",
      "expo-font",
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
