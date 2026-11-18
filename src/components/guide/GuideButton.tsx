import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

/**
 * The compass in a screen's header: replays that screen's walkthrough.
 * `tone="light"` sits on the green hero; `tone="dark"` on a light header.
 */
export function GuideButton({ onPress, tone = 'light' }: { onPress: () => void; tone?: 'light' | 'dark' }) {
  const light = tone === 'light';
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel="Guide me"
      accessibilityHint="Walks you through this screen step by step"
      style={({ pressed }) => [styles.btn, light ? styles.light : styles.dark, pressed && styles.pressed]}
    >
      <Ionicons name="compass-outline" size={normalize(20)} color={light ? palette.white : palette.kale} />
    </Pressable>
  );
}

/** Header right slot: the compass, then whatever the screen already had there. */
export function GuideHeaderRight({ onGuide, children }: { onGuide: () => void; children?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <GuideButton onPress={onGuide} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: normalize(8) },
  btn: {
    width: normalize(36),
    height: normalize(36),
    borderRadius: normalize(18),
    alignItems: 'center',
    justifyContent: 'center',
  },
  light: { backgroundColor: 'rgba(0,0,0,0.18)' },
  dark: { backgroundColor: '#EEF7F2' },
  pressed: { opacity: 0.75 },
});
