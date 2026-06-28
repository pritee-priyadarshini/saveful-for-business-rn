import { useCallback } from 'react';
import { Platform, StatusBar as RNStatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { palette } from '@/theme/colors';

type StatusBarStyle = 'light' | 'dark';

export function useTransparentStatusBar(style: StatusBarStyle = 'light') {
  useFocusEffect(
    useCallback(() => {
      if (Platform.OS !== 'android') return;

      const barStyle = style === 'light' ? 'light-content' : 'dark-content';
      RNStatusBar.setTranslucent(true);
      RNStatusBar.setBackgroundColor('transparent', true);
      RNStatusBar.setBarStyle(barStyle, true);

      return () => {
        RNStatusBar.setTranslucent(false);
        RNStatusBar.setBackgroundColor(palette.background, true);
        RNStatusBar.setBarStyle('dark-content', true);
      };
    }, [style]),
  );
}
