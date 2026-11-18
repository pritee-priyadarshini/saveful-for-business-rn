import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { MFC } from '@/constants/makeFoodCount';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

type Props = {
  /** Announced to screen readers; the deck's bar shows no visible title. */
  title?: string;
  /** Current site, shown on the right ("◉ Compass Kitchen ▾"). */
  siteName?: string | null;
  /** Opens the site switcher. Without it the site name is plain text. */
  onSitePress?: () => void;
};

/**
 * The deck's Make Food Count bar: flat purple, site switcher on the right.
 * Going back lives in the page ("‹ Back"), as in the mock-ups.
 */
export function MfcHeader({ title = 'Make Food Count', siteName, onSitePress }: Props) {
  const insets = useSafeAreaInsets();
  const site = siteName?.trim();

  const label = (
    <>
      <View style={styles.dot}>
        <View style={styles.dotInner} />
      </View>
      <AppText variant="bodySmall" color={palette.white} numberOfLines={1} style={styles.siteText}>
        {site}
      </AppText>
      {onSitePress ? <Ionicons name="caret-down" size={normalize(12)} color={palette.white} /> : null}
    </>
  );

  return (
    <>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <View style={[styles.bar, { paddingTop: insets.top }]} accessibilityRole="header" accessibilityLabel={title}>
        <View style={styles.row}>
          {site && onSitePress ? (
            <Pressable
              onPress={onSitePress}
              accessibilityRole="button"
              accessibilityLabel={`Site: ${site}. Change site`}
              hitSlop={10}
              style={({ pressed }) => [styles.site, pressed && styles.pressed]}
            >
              {label}
            </Pressable>
          ) : site ? (
            <View style={styles.site} accessible accessibilityLabel={`Site: ${site}`}>
              {label}
            </View>
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: MFC.purple },
  row: {
    minHeight: normalize(52),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: normalize(18),
  },
  site: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '75%', minHeight: 44 },
  siteText: { flexShrink: 1, fontFamily: 'Saveful-SemiBold' },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.white },
  pressed: { opacity: 0.75 },
});
