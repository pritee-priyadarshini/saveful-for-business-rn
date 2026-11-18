import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useGuideStore } from '@/store/guideStore';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

import { GuideTarget } from './GuideTarget';
import { COMPASS_TARGET } from './types';

/**
 * The compass in a screen's header: replays that screen's walkthrough.
 * `tone="light"` sits on the green hero; `tone="dark"` on a light header.
 */
export function GuideButton({ onPress, tone = 'light' }: { onPress: () => void; tone?: 'light' | 'dark' }) {
  const light = tone === 'light';
  // A small "new" dot until the person has been shown what the compass does.
  const fresh = useGuideStore((state) => state.hydrated && state.enabled && !state.compassHintSeen);
  return (
    <GuideTarget id={COMPASS_TARGET}>
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel="Guide me"
        accessibilityHint="Walks you through this screen step by step"
        style={({ pressed }) => [styles.btn, light ? styles.light : styles.dark, pressed && styles.pressed]}
      >
        <Ionicons name="compass-outline" size={normalize(20)} color={light ? palette.white : palette.kale} />
        {fresh ? <View style={[styles.dot, light ? styles.dotOnDark : styles.dotOnLight]} /> : null}
      </Pressable>
    </GuideTarget>
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
  dot: {
    position: 'absolute',
    top: normalize(4),
    right: normalize(4),
    width: normalize(9),
    height: normalize(9),
    borderRadius: normalize(5),
    backgroundColor: palette.lemon,
    borderWidth: 1.5,
  },
  dotOnDark: { borderColor: '#2B4A36' },
  dotOnLight: { borderColor: palette.white },
});
