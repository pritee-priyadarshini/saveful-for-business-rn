import 'react-native-gesture-handler';
import React from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { AppNavigator } from './src/navigation/AppNavigator';
import { AppProvider } from './src/store/AppContext';
import { palette } from './src/theme/colors';
import { useFonts } from 'expo-font';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

export default function App() {

  // const [fontsLoaded] = useFonts({
  //   'Saveful-Bold': require('./assets/fonts/Saveful-Bold.otf'),
  //   'Saveful-BoldItalic': require('./assets/fonts/Saveful-BoldItalic.otf'),
  //   'Saveful-Italic': require('./assets/fonts/Saveful-Italic.otf'),
  //   'Saveful-Regular': require('./assets/fonts/Saveful-Regular.otf'),
  //   'Saveful-SemiBold': require('./assets/fonts/Saveful-SemiBold.otf'),
  //   'Saveful-SemiBoldItalic': require('./assets/fonts/Saveful-SemiBoldItalic.otf'),
  // });

  // if (!fontsLoaded) {
  //   return null;
  // }

  const [fontsLoaded, fontError] = useFonts({
    'Saveful-Bold': require('./assets/fonts/Saveful-Bold.ttf'),
    'Saveful-BoldItalic': require('./assets/fonts/Saveful-BoldItalic.ttf'),
    'Saveful-Italic': require('./assets/fonts/Saveful-Italic.ttf'),
    'Saveful-Regular': require('./assets/fonts/Saveful-Regular.ttf'),
    'Saveful-SemiBold': require('./assets/fonts/Saveful-SemiBold.ttf'),
    'Saveful-SemiBoldItalic': require('./assets/fonts/Saveful-SemiBoldItalic.ttf'),

    ...Ionicons.font,
  ...MaterialCommunityIcons.font,
  });

  if (fontError) {
    throw fontError;
  }

  if (!fontsLoaded) {
    return null;
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
