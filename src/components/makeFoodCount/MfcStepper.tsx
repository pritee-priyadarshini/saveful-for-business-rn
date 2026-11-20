import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { MFC_STEPS } from '@/constants/makeFoodCount';
import { MFC } from '@/constants/makeFoodCount';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

type Props = {
  /** 0-based index of the current step (see MFC_STEP_INDEX). Steps before it show a tick. */
  activeIndex: number;
  steps?: readonly string[];
  style?: StyleProp<ViewStyle>;
};

const DOT = normalize(26);
const GREY = '#E1DCE8';

/**
 * The four-step progress row of Make Food Count: Select sources · Add quantities · Review · List.
 * Numbered dots joined by a line, like CreateListing's stepper (eggplant instead of kale).
 * Used by Sources, Record and Summary.
 */
export function MfcStepper({ activeIndex, steps = MFC_STEPS, style }: Props) {
  const current = Math.max(0, Math.min(steps.length - 1, activeIndex));

  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${current + 1} of ${steps.length}: ${steps[current]}`}
      accessibilityValue={{ min: 1, max: steps.length, now: current + 1 }}
    >
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        const on = done || active;
        return (
          <View key={label} style={styles.step}>
            <View style={styles.railRow}>
              <View style={[styles.line, index === 0 && styles.lineHidden, index <= current && index > 0 && styles.lineOn]} />
              <View style={[styles.dot, on && styles.dotOn]}>
                {done ? (
                  <Ionicons name="checkmark" size={normalize(14)} color={palette.white} />
                ) : (
                  <AppText variant="bodyBold" color={on ? palette.white : palette.stone} style={styles.dotNumber}>
                    {index + 1}
                  </AppText>
                )}
              </View>
              <View
                style={[
                  styles.line,
                  index === steps.length - 1 && styles.lineHidden,
                  index < current && styles.lineOn,
                ]}
              />
            </View>
            <AppText
              variant="bodyBold"
              color={active || done ? MFC.purple : MFC.muted}
              style={styles.label}
              numberOfLines={2}
            >
              {label}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  step: { flex: 1, alignItems: 'center', gap: 4 },
  railRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
  line: { flex: 1, height: 2, borderRadius: 2, backgroundColor: GREY },
  lineOn: { backgroundColor: MFC.purple },
  lineHidden: { backgroundColor: 'transparent' },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    borderWidth: 2,
    borderColor: GREY,
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotOn: { backgroundColor: MFC.purple, borderColor: MFC.purple },
  dotNumber: { fontSize: normalize(13), lineHeight: normalize(15), textAlign: 'center' },
  label: { textAlign: 'center', paddingHorizontal: 2, fontSize: normalize(13), lineHeight: normalize(16) },
});
