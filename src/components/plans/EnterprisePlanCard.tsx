import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import type { AvailablePlan } from '@/services/subscriptions.service';
import { ENTERPRISE_FALLBACK_COPY } from '@/screens/subscription/multiSitePlans';
import { PlanPill, PlanTick, planCardStyles, planListStyle } from './PlanCardParts';

/**
 * Enterprise (10+ locations): quote-based, so an outline card that opens the
 * sales enquiry instead of checkout. Includes both modules.
 */
export function EnterprisePlanCard({
  plan,
  onContactSales,
  isCurrent,
  twoColumn,
}: {
  plan: AvailablePlan;
  onContactSales: () => void;
  isCurrent?: boolean;
  twoColumn?: boolean;
}) {
  const accent = palette.black;
  const features = plan.features?.length ? plan.features : ENTERPRISE_FALLBACK_COPY.features;

  return (
    <View style={[planCardStyles.card, styles.card, isCurrent && styles.current]}>
      <View style={[styles.columns, twoColumn && styles.columnsRow]}>
        <View style={styles.column}>
          {isCurrent ? <PlanPill label="Your plan" background={accent} /> : null}
          <AppText color={accent} style={planCardStyles.title}>
            {plan.displayName}
          </AppText>
          <AppText color={palette.stone} style={planCardStyles.tagline}>
            {plan.tagline ?? ENTERPRISE_FALLBACK_COPY.tagline}
          </AppText>
          <AppText color={accent} style={styles.price}>
            {ENTERPRISE_FALLBACK_COPY.price}
          </AppText>
          {plan.description ? (
            <AppText color={palette.midgray} style={planCardStyles.description}>
              {plan.description}
            </AppText>
          ) : null}
        </View>

        <View style={[styles.column, planListStyle]}>
          {features.map((feature) => (
            <PlanTick key={feature} label={feature} color={accent} />
          ))}
        </View>
      </View>

      {isCurrent ? null : (
        <Pressable
          onPress={onContactSales}
          style={({ pressed }) => [styles.cta, twoColumn && styles.ctaWide, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={ENTERPRISE_FALLBACK_COPY.cta}
        >
          <AppText color={accent} style={styles.ctaText}>
            {ENTERPRISE_FALLBACK_COPY.cta}
          </AppText>
          <Ionicons name="arrow-forward" size={normalize(16)} color={accent} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.white,
    borderColor: palette.strokecream,
  },
  current: {
    borderColor: palette.black,
    borderWidth: 2,
  },
  columns: {
    gap: hp(1.4),
  },
  columnsRow: {
    flexDirection: 'row',
    gap: wp(4),
  },
  column: {
    flex: 1,
    gap: hp(0.8),
  },
  price: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(22),
    textTransform: 'none',
  },
  cta: {
    minHeight: normalize(44),
    borderRadius: normalize(8),
    borderWidth: 1.5,
    borderColor: palette.black,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingHorizontal: wp(3),
  },
  ctaWide: {
    alignSelf: 'flex-end',
    minWidth: '45%',
  },
  ctaText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13.5),
    textTransform: 'none',
  },
  pressed: {
    opacity: 0.75,
  },
});
