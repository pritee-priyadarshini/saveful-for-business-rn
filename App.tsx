import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProvider } from './src/store/AppContext';
import { useAuthStore } from './src/store/authStore';
import { palette } from './src/theme/colors';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SplashScreen } from './src/screens/SplashScreen';
import { CircularImageCropHost } from './src/components/CircularImageCropModal';
import { AppAlertHost } from './src/components/AppAlertModal';
import { GuideProvider } from './src/components/guide';
import { registerNotificationCategories } from './src/services/pushNotifications';
import { CONSOLIDATED_PREVIEW, ConsolidatedPreviewApp, installConsolidatedFixtures } from './src/dev/consolidatedPreview';
import { bindAppStateFlush } from './src/store/makeFoodCountStore';
import { MFC_PREVIEW, MakeFoodCountPreviewApp, installMakeFoodCountFixtures } from './src/dev/makeFoodCountPreview';

// Dev-only visual preview of the Consolidated Collections screens (inert unless the env flag is set in __DEV__).
if (CONSOLIDATED_PREVIEW) installConsolidatedFixtures();
// Dev-only visual preview of Make Food Count. If both flags are set, Consolidated wins.
const SHOW_MFC_PREVIEW = MFC_PREVIEW && !CONSOLIDATED_PREVIEW;
if (SHOW_MFC_PREVIEW) installMakeFoodCountFixtures();

export default function App() {
  const [splashTimerDone, setSplashTimerDone] = useState(false);
  const isInitialLoading = useAuthStore((state) => state.isInitialLoading);

  useEffect(() => {
    const lockPortrait = async () => {
      try {
        if (Platform.OS === 'android') {
          await ScreenOrientation.lockPlatformAsync({
            screenOrientationConstantAndroid: 1, // SCREEN_ORIENTATION_PORTRAIT
          });
        } else {
          await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        }
      } catch {
        // Ignore — requires native rebuild after adding expo-screen-orientation
      }
    };
    void lockPortrait();
    void registerNotificationCategories();
  }, []);

  useEffect(() => {
    void useAuthStore.getState().restoreSession();
  }, []);

  // Make Food Count: flush the open draft when the app goes to the background (app SPEC §8.1).
  useEffect(() => bindAppStateFlush(), []);

  const [fontsLoaded, fontError] = useFonts({
    'Saveful-Bold': require('./assets/fonts/Saveful-Bold.ttf'),
    'Saveful-BoldItalic': require('./assets/fonts/Saveful-BoldItalic.ttf'),
    'Saveful-Italic': require('./assets/fonts/Saveful-Italic.ttf'),
    'Saveful-Regular': require('./assets/fonts/Saveful-Regular.ttf'),
    'Saveful-SemiBold': require('./assets/fonts/Saveful-SemiBold.ttf'),
    'Saveful-SemiBoldItalic': require('./assets/fonts/Saveful-SemiBoldItalic.ttf'),

    ...Ionicons.font,
    ...MaterialCommunityIcons.font,
    ...MaterialIcons.font,
  });

  if (fontError) {
    throw fontError;
  }

  const appReady = splashTimerDone && fontsLoaded && !isInitialLoading;

  if (!appReady) {
    return <SplashScreen onFinish={() => setSplashTimerDone(true)} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppProvider>
          <StatusBar style="dark" backgroundColor={palette.background} />
          <GuideProvider>
            {CONSOLIDATED_PREVIEW ? (
              <ConsolidatedPreviewApp />
            ) : SHOW_MFC_PREVIEW ? (
              <MakeFoodCountPreviewApp />
            ) : (
              <AppNavigator />
            )}
          </GuideProvider>
          <AppAlertHost />
          <CircularImageCropHost />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
