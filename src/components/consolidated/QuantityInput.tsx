import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import { formatKg } from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';

type Props = {
  label?: string;
  value: number;
  max?: number;
  step?: number;
  onChange: (value: number) => void;
};

function round(value: number) {
  return Math.round(value * 100) / 100;
}

export function QuantityInput({ label, value, max, step: increment = 0.5, onChange }: Props) {
  const step = (delta: number) => {
    let next = round(value + delta);
    if (next < 0) next = 0;
    if (max != null && next > max) next = round(max);
    onChange(next);
  };
  const atMin = value <= 0;
  const atMax = max != null && value >= max;

  return (
    <View style={styles.row}>
      {label ? (
        <AppText variant="bodySmall" color={palette.midgray} style={styles.label} numberOfLines={2}>
          {label}
        </AppText>
      ) : null}
      <View style={styles.stepper}>
        <Pressable style={[styles.btn, atMin && styles.off]} onPress={() => step(-increment)} disabled={atMin} accessibilityLabel="Decrease">
          <Ionicons name="remove" size={normalize(18)} color={palette.primary} />
        </Pressable>
        <AppText variant="bodyBold" style={styles.value}>
          {formatKg(value)} kg
        </AppText>
        <Pressable style={[styles.btn, atMax && styles.off]} onPress={() => step(increment)} disabled={atMax} accessibilityLabel="Increase">
          <Ionicons name="add" size={normalize(18)} color={palette.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { flex: 1 },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cc.hairline,
    borderRadius: 999,
    backgroundColor: palette.white,
    padding: 4,
  },
  btn: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.creme3,
  },
  off: { opacity: 0.4 },
  value: { minWidth: normalize(64), textAlign: 'center' },
});
