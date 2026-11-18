import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

import type { GuideIcon, JourneyStage } from './types';

const STOPS: { icon: GuideIcon; label: string }[] = [
  { icon: 'git-merge-outline', label: 'Set up' },
  { icon: 'calendar-outline', label: 'Schedule' },
  { icon: 'basket-outline', label: 'List food' },
  { icon: 'megaphone-outline', label: 'Publish' },
  { icon: 'heart-outline', label: 'Collect' },
];

/**
 * The whole Consolidated Collections journey on one line, with "you are here".
 * Stops before the current one read as done, the current one is solid kale.
 */
export function JourneyTrack({ stage }: { stage: JourneyStage }) {
  const all = stage === 'all';
  const current = all ? STOPS.length - 1 : stage;
  const dot = normalize(32);
  const fill = all ? 1 : current / (STOPS.length - 1);

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={
        all
          ? `Five stages: ${STOPS.map((stop) => stop.label).join(', ')}`
          : `Stage ${current + 1} of 5: ${STOPS[current].label}`
      }
    >
      {/* Rail runs centre-to-centre behind the stops. */}
      <View style={[styles.rail, { top: dot / 2 - 1, left: `${50 / STOPS.length}%`, right: `${50 / STOPS.length}%` }]}>
        <View style={[styles.railFill, { width: `${fill * 100}%` }]} />
      </View>

      {STOPS.map((stop, index) => {
        const active = !all && index === current;
        const done = all || index < current;
        return (
          <View key={stop.label} style={styles.stop}>
            <View
              style={[
                styles.dot,
                { width: dot, height: dot, borderRadius: dot / 2 },
                done && styles.dotDone,
                active && styles.dotActive,
              ]}
            >
              <Ionicons
                name={stop.icon}
                size={normalize(15)}
                color={active ? palette.white : done ? palette.kale : '#A8A196'}
              />
            </View>
            <AppText
              variant="meta"
              color={active ? palette.black : done ? palette.midgray : '#A8A196'}
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
              maxFontSizeMultiplier={1.25}
            >
              {stop.label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    paddingVertical: normalize(4),
  },
  rail: {
    position: 'absolute',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#E5DFD2',
    overflow: 'hidden',
  },
  railFill: { height: '100%', backgroundColor: palette.kale },
  stop: { flex: 1, alignItems: 'center', gap: 6, minWidth: 0 },
  dot: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: '#E0D9CB',
  },
  dotDone: { backgroundColor: cc.tint, borderColor: cc.tintBorder },
  dotActive: {
    backgroundColor: palette.kale,
    borderColor: palette.mint,
    borderWidth: 3,
    transform: [{ scale: 1.12 }],
  },
  label: { fontSize: normalize(12), lineHeight: normalize(15), textAlign: 'center', paddingHorizontal: 1 },
  labelActive: { fontFamily: 'Saveful-SemiBold' },
});
