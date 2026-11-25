import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import type { ModuleTheme, PlanCardCopy } from '@/screens/subscription/singleSitePlans';

/** Solid button in the module colour — the card CTA. */
export function PlanCtaButton({
  label,
  theme,
  onPress,
  disabled,
  busy,
}: {
  label: string;
  theme: ModuleTheme;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: theme.color },
        (disabled || busy) && styles.ctaDisabled,
        pressed && !disabled && styles.ctaPressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || busy) }}
    >
      {busy ? (
        <ActivityIndicator color={theme.onColor} />
      ) : (
        <AppText color={theme.onColor} style={styles.ctaText}>
          {label}
        </AppText>
      )}
    </Pressable>
  );
}

/** Filled circle tick + text, as in the design's feature lists. */
export function PlanTick({ label, color }: { label: string; color: string }) {
  return (
    <View style={styles.tickRow}>
      <View style={[styles.tickIcon, { backgroundColor: color }]}>
        <Ionicons name="checkmark" size={normalize(11)} color={palette.white} />
      </View>
      <AppText color={palette.black} style={styles.tickText}>
        {label}
      </AppText>
    </View>
  );
}

/** "1 site" / "Unlimited users" rows with outline icons. */
export function PlanAllowances({
  allowances,
  color,
}: {
  allowances: PlanCardCopy['allowances'];
  color: string;
}) {
  if (!allowances.length) return null;
  return (
    <View style={styles.list}>
      {allowances.map((row) => (
        <View key={row.label} style={styles.tickRow}>
          <Ionicons name={row.icon} size={normalize(17)} color={color} style={styles.allowanceIcon} />
          <AppText color={palette.black} style={styles.tickText}>
            {row.label}
          </AppText>
        </View>
      ))}
    </View>
  );
}

/** "A$49 /month" */
export function PlanPrice({
  amount,
  suffix,
  color = palette.black,
}: {
  amount: string;
  suffix: string;
  color?: string;
}) {
  return (
    <View style={styles.priceRow}>
      <AppText color={color} style={styles.price}>
        {amount}
      </AppText>
      <AppText color={palette.midgray} style={styles.priceSuffix}>
        {` ${suffix}`}
      </AppText>
    </View>
  );
}

/** Small rounded label: "Your plan", "Best value". */
export function PlanPill({
  label,
  background,
  color = palette.white,
}: {
  label: string;
  background: string;
  color?: string;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      <AppText color={color} style={styles.pillText}>
        {label}
      </AppText>
    </View>
  );
}

export const planCardStyles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: normalize(16),
    padding: wp(4.5),
    gap: hp(1.1),
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(19),
    textTransform: 'none',
  },
  tagline: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  description: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  estimate: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12.5),
    marginTop: -hp(0.6),
    textTransform: 'none',
  },
  closing: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  hint: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11.5),
    textAlign: 'center',
    textTransform: 'none',
  },
});

const styles = StyleSheet.create({
  cta: {
    minHeight: normalize(44),
    borderRadius: normalize(8),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.9),
  },
  ctaDisabled: {
    opacity: 0.5,
  },
  ctaPressed: {
    opacity: 0.85,
  },
  ctaText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13.5),
    textAlign: 'center',
    textTransform: 'none',
  },
  list: {
    gap: hp(0.7),
  },
  tickRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
  },
  tickIcon: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: normalize(1),
  },
  allowanceIcon: {
    width: normalize(18),
    textAlign: 'center',
  },
  tickText: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13.5),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(26),
    lineHeight: normalize(30),
    textTransform: 'none',
  },
  priceSuffix: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    marginBottom: normalize(3),
    textTransform: 'none',
  },
  pill: {
    alignSelf: 'flex-start',
    borderRadius: normalize(6),
    paddingHorizontal: wp(2.2),
    paddingVertical: hp(0.25),
  },
  pillText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10.5),
    textTransform: 'none',
  },
});

export const planListStyle = styles.list;
