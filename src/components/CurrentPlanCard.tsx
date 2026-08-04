import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { selectCanManageBilling, useSubscriptionStore } from '@/store/subscriptionStore';
import { billingCycleLabel, formatBillingDate } from '@/utils/billingHelpers';
import { usePlanCancellation } from '@/hooks/usePlanCancellation';

const ACCENT = palette.kale;

function statusPill(status: string | null, trialEndsAt: string | null) {
  const upper = String(status ?? '').toUpperCase();
  if (upper === 'TRIALING') {
    const ends = formatBillingDate(trialEndsAt);
    return { label: 'Free trial', tone: '#E8F6EC', text: ACCENT, detail: ends ? `Trial ends ${ends}` : null };
  }
  if (upper === 'PAST_DUE') {
    return {
      label: 'Payment due',
      tone: '#FDECEC',
      text: palette.danger,
      detail: 'Update your card to keep your plan active.',
    };
  }
  return { label: 'Active', tone: '#E8F6EC', text: ACCENT, detail: null };
}

/**
 * The plan the organisation is already on. Without this the plans screen reads
 * as a fresh purchase flow to someone who has already bought.
 */
export function CurrentPlanCard({ showActions = true }: { showActions?: boolean }) {
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const canManageBilling = selectCanManageBilling();
  const { cancelPlan, resumePlan, canCancel, canResume, busy } = usePlanCancellation();

  if (!entitlements?.entitled || !entitlements.billingRequired) return null;

  const name =
    entitlements.planDisplayName || entitlements.planName || 'Your plan';
  const pill = statusPill(entitlements.status, entitlements.trialEndsAt);

  const meta: string[] = [];
  if (entitlements.billingCycle) {
    meta.push(`Billed ${billingCycleLabel(entitlements.billingCycle)}`);
  }
  if (entitlements.quantity != null && entitlements.quantity > 0) {
    meta.push(`${entitlements.quantity} ${entitlements.quantity === 1 ? 'site' : 'sites'}`);
  }

  const periodEnd = formatBillingDate(entitlements.currentPeriodEnd);
  const renewLine = entitlements.cancelAtPeriodEnd
    ? periodEnd
      ? `Access ends ${periodEnd}`
      : 'Cancels at the end of this period'
    : periodEnd
      ? `Renews ${periodEnd}`
      : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.headRow}>
        <View style={styles.iconWrap}>
          <Ionicons name="checkmark-circle" size={normalize(20)} color={ACCENT} />
        </View>
        <View style={styles.headCopy}>
          <AppText color={palette.stone} style={styles.eyebrow}>
            Your current plan
          </AppText>
          <AppText color={palette.black} style={styles.planName}>
            {name}
          </AppText>
        </View>
        <View style={[styles.pill, { backgroundColor: pill.tone }]}>
          <AppText style={[styles.pillText, { color: pill.text }]}>{pill.label}</AppText>
        </View>
      </View>

      {pill.detail ? (
        <AppText color={pill.text} style={styles.detail}>
          {pill.detail}
        </AppText>
      ) : null}

      {meta.length || renewLine ? (
        <AppText color={palette.midgray} style={styles.meta}>
          {[...meta, renewLine].filter(Boolean).join(' · ')}
        </AppText>
      ) : null}

      <AppText color={palette.midgray} style={styles.hint}>
        {entitlements.cancelAtPeriodEnd
          ? 'Resume below to keep your plan, or choose a different plan to start again.'
          : 'Choose a different plan below to upgrade or change your subscription.'}
      </AppText>

      {showActions && canManageBilling && (canCancel || canResume) ? (
        <Pressable
          style={styles.actionBtn}
          onPress={canResume ? resumePlan : cancelPlan}
          disabled={busy}
          accessibilityRole="button"
        >
          <AppText
            style={[styles.actionText, canResume ? styles.resumeText : styles.cancelText]}
          >
            {canResume ? 'Resume plan' : 'Cancel plan'}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: normalize(16),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.6),
    marginBottom: hp(1.6),
    gap: hp(0.6),
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
  },
  iconWrap: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    backgroundColor: '#E8F6EC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headCopy: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10.5),
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  planName: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(17),
  },
  pill: {
    borderRadius: normalize(20),
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.4),
  },
  pillText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10.5),
  },
  detail: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
  },
  meta: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
  },
  hint: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11.5),
    lineHeight: normalize(16),
  },
  actionBtn: {
    alignSelf: 'flex-start',
    minHeight: normalize(32),
    justifyContent: 'center',
    paddingVertical: hp(0.3),
  },
  actionText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    textTransform: 'none',
  },
  cancelText: {
    color: palette.danger,
  },
  resumeText: {
    color: ACCENT,
  },
});
