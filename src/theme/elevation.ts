import { Platform, type ViewStyle } from 'react-native';

import { palette } from './colors';

/**
 * Shared surface elevation — keep cards quiet and border-led.
 * Prefer `flat` when a card already has a border; use `card` sparingly.
 */
export const elevation = {
  flat: Platform.select<ViewStyle>({
    ios: {
      shadowColor: 'transparent',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
    },
    android: { elevation: 0 },
    default: {},
  })!,

  card: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.04,
      shadowRadius: 4,
    },
    android: { elevation: 1 },
    default: {},
  })!,

  soft: Platform.select<ViewStyle>({
    ios: {
      shadowColor: palette.black,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
    },
    android: { elevation: 1 },
    default: {},
  })!,
} as const;
