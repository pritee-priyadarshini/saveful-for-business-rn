import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Matches `RoleTabs` tab bar content height (excluding safe area). */
export const TAB_BAR_CONTENT_HEIGHT = 56;

/**
 * Bottom padding for scroll content on screens shown above the bottom tab bar,
 * including Android software navigation bar insets.
 */
export function useBottomTabPadding(extra = 0): number {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0);
  return TAB_BAR_CONTENT_HEIGHT + bottomInset + extra;
}

/** Bottom padding for full-screen stack views (no tab bar), e.g. Manage Access. */
export function useSafeBottomPadding(extra = 0): number {
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, Platform.OS === 'android' ? 6 : 0);
  return bottomInset + extra;
}
