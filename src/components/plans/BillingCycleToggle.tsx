import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { ANNUAL_PILL, type BillingCycle } from '@/screens/subscription/singleSitePlans';

/**
 * The "Monthly | Annual  2 MONTHS FREE" pill from the plans design. One
 * control for every plans screen so the cycle reads the same everywhere.
 */
export function BillingCycleToggle({
  value,
  onChange,
  accent = palette.kale,
}: {
  value: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  accent?: string;
}) {
  return (
    <View
      style={[styles.track, { borderColor: `${accent}33`, backgroundColor: `${accent}12` }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Billing cycle"
    >
      {(['monthly', 'annual'] as const).map((cycle) => {
        const active = value === cycle;
        return (
          <Pressable
            key={cycle}
            onPress={() => onChange(cycle)}
            style={[styles.segment, active && { backgroundColor: accent }]}
            accessibilityRole="radio"
            accessibilityState={{ checked: active }}
            accessibilityLabel={cycle === 'annual' ? `Annual, ${ANNUAL_PILL.toLowerCase()}` : 'Monthly'}
            hitSlop={4}
          >
            <AppText color={active ? palette.white : accent} style={styles.label}>
              {cycle === 'annual' ? 'Annual' : 'Monthly'}
            </AppText>
            {cycle === 'annual' ? (
              <View style={[styles.pill, { backgroundColor: active ? palette.white : accent }]}>
                <AppText color={active ? accent : palette.white} style={styles.pillText}>
                  {ANNUAL_PILL}
                </AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: normalize(10),
    padding: normalize(3),
    gap: normalize(3),
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    borderRadius: normalize(8),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.6),
  },
  label: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13),
    textTransform: 'none',
  },
  pill: {
    borderRadius: normalize(999),
    paddingHorizontal: wp(1.6),
    paddingVertical: hp(0.15),
  },
  pillText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(8.5),
    letterSpacing: 0.3,
    textTransform: 'none',
  },
});
