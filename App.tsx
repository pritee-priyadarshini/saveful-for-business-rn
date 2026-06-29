import 'react-native-gesture-handler';
import React, { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProvider } from './src/store/AppContext';
import { useAuthStore } from './src/store/authStore';
import { palette } from './src/theme/colors';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { SplashScreen } from './src/screens/SplashScreen';

export default function App() {
  const [splashTimerDone, setSplashTimerDone] = useState(false);
  const isInitialLoading = useAuthStore((state) => state.isInitialLoading);

  useEffect(() => {
    void useAuthStore.getState().restoreSession();
  }, []);

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
          <AppNavigator />
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
