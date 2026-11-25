import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import type { AvailablePlan } from '@/services/subscriptions.service';
import { planPriceForCycle } from '@/utils/billingHelpers';
import {
  COMPLETE_LIST_HEADING,
  MODULE_THEME,
  planCardCopy,
  type BillingCycle,
} from '@/screens/subscription/singleSitePlans';
import {
  PlanAllowances,
  PlanCtaButton,
  PlanPill,
  PlanPrice,
  PlanTick,
  planCardStyles,
  planListStyle,
} from './PlanCardParts';
import type { PlanCardAction } from './ModulePlanCard';

/**
 * Full-width Complete Solution card: pitch and price on the left, "Everything
 * in both modules, plus:" on the right (stacked on phones), closing line and
 * CTA underneath.
 */
export function CompletePlanCard({
  plan,
  cycle,
  action,
  isCurrent,
  twoColumn,
  estimate,
}: {
  plan: AvailablePlan;
  cycle: BillingCycle;
  action: PlanCardAction;
  isCurrent?: boolean;
  /** Side-by-side columns — tablets and wide screens. */
  twoColumn?: boolean;
  /** Per-site total for the org, e.g. "3 sites · A$297/month". */
  estimate?: string | null;
}) {
  const theme = MODULE_THEME.COMPLETE;
  const copy = planCardCopy(plan);
  const price = planPriceForCycle(plan, cycle);

  return (
    <View
      style={[
        planCardStyles.card,
        { backgroundColor: theme.tint, borderColor: isCurrent ? theme.color : theme.border },
        isCurrent && styles.current,
      ]}
    >
      <View style={[styles.columns, twoColumn && styles.columnsRow]}>
        <View style={[styles.column, styles.pitch]}>
          <View style={styles.pills}>
            {isCurrent ? <PlanPill label="Your plan" background={theme.color} /> : null}
            {plan.badge && !isCurrent ? (
              <PlanPill label={plan.badge} background={theme.color} />
            ) : null}
          </View>
          <AppText color={theme.color} style={planCardStyles.title}>
            {plan.displayName}
          </AppText>
          <AppText color={theme.color} style={planCardStyles.tagline}>
            {copy.tagline}
          </AppText>
          <PlanPrice amount={price.amount} suffix={price.suffix} color={theme.color} />
          {estimate ? (
            <AppText color={palette.stone} style={planCardStyles.estimate}>
              {estimate}
            </AppText>
          ) : null}
          <AppText color={palette.midgray} style={planCardStyles.description}>
            {copy.description}
          </AppText>
          <PlanAllowances allowances={copy.allowances} color={theme.color} />
        </View>

        <View style={styles.column}>
          <AppText color={theme.color} style={styles.listHeading}>
            {COMPLETE_LIST_HEADING}
          </AppText>
          <View style={planListStyle}>
            {copy.ticks.map((tick) => (
              <PlanTick key={tick} label={tick} color={theme.color} />
            ))}
          </View>
        </View>
      </View>

      <AppText color={theme.color} style={planCardStyles.closing}>
        {copy.closingLine}
      </AppText>

      <View style={[styles.ctaBlock, twoColumn && styles.ctaBlockWide]}>
        <PlanCtaButton
          label={action.label}
          theme={theme}
          onPress={action.onPress}
          disabled={action.disabled}
        />
        {action.hint ? (
          <AppText color={theme.color} style={planCardStyles.hint}>
            {action.hint}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    borderWidth: 2,
  },
  columns: {
    gap: hp(1.6),
  },
  columnsRow: {
    flexDirection: 'row',
    gap: wp(4),
  },
  column: {
    flex: 1,
    gap: hp(1),
  },
  pitch: {
    gap: hp(0.9),
  },
  pills: {
    flexDirection: 'row',
    gap: 6,
  },
  listHeading: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    textTransform: 'none',
  },
  ctaBlock: {
    gap: hp(0.5),
  },
  ctaBlockWide: {
    alignSelf: 'flex-end',
    minWidth: '45%',
  },
});
