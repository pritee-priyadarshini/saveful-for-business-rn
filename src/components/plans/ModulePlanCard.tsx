import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp } from '@/utils/responsive';
import type { AvailablePlan } from '@/services/subscriptions.service';
import { planPriceForCycle } from '@/utils/billingHelpers';
import {
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

export type PlanCardAction = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  /** Small line under the CTA, e.g. "Applies at your next renewal". */
  hint?: string | null;
};

/**
 * Make Food Count or Saveful Connect card from the plans design: title,
 * tagline, price, description, CTA, site/user rows, ticks, closing line, CTA.
 * The CTA appears top and bottom so it is in reach however far you scroll.
 */
export function ModulePlanCard({
  plan,
  cycle,
  action,
  isCurrent,
  estimate,
  style,
}: {
  plan: AvailablePlan;
  cycle: BillingCycle;
  action: PlanCardAction;
  isCurrent?: boolean;
  /** Per-site total for the org, e.g. "3 sites · A$207/month". */
  estimate?: string | null;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = MODULE_THEME[plan.module];
  const copy = planCardCopy(plan);
  const price = planPriceForCycle(plan, cycle);

  const cta = (
    <View style={styles.ctaBlock}>
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
  );

  return (
    <View
      style={[
        planCardStyles.card,
        { backgroundColor: theme.tint, borderColor: isCurrent ? theme.color : theme.border },
        isCurrent && styles.current,
        style,
      ]}
    >
      <View style={styles.header}>
        <AppText color={theme.color} style={[planCardStyles.title, styles.title]}>
          {plan.displayName}
        </AppText>
        {isCurrent ? <PlanPill label="Your plan" background={theme.color} /> : null}
      </View>

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

      {cta}

      <PlanAllowances allowances={copy.allowances} color={theme.color} />

      <View style={planListStyle}>
        {copy.ticks.map((tick) => (
          <PlanTick key={tick} label={tick} color={theme.color} />
        ))}
      </View>

      <View style={styles.spacer} />

      <AppText color={theme.color} style={planCardStyles.closing}>
        {copy.closingLine}
      </AppText>

      {cta}
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    borderWidth: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  title: {
    textAlign: 'center',
  },
  ctaBlock: {
    gap: hp(0.5),
  },
  // Pushes the closing line and bottom CTA down so side-by-side cards line up.
  spacer: {
    flexGrow: 1,
  },
});
