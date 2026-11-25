import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { useAppContext } from '@/store/AppContext';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  COMPLETE_LIST_HEADING,
  CONFIRM_TRUST_POINTS,
  MODULE_THEME,
  planCardCopy,
  type BillingCycle,
} from './singleSitePlans';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import {
  findPlanById,
  formatPlanPrice,
  fromApiBillingCycle,
  perSiteEstimate,
  planPriceForCycle,
} from '@/utils/billingHelpers';
import { BillingCycleToggle } from '@/components/plans/BillingCycleToggle';
import { usePlanPurchase } from './usePlanPurchase';
import { showErrorAlert } from '@/utils/apiError';

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** Leaves the whole plans flow once the org is on its new plan. */
function popSubscriptionStack(navigation: Nav, flowRoutes: readonly string[]) {
  const state = navigation.getState();
  const firstSubIdx = state.routes.findIndex((navRoute) => flowRoutes.includes(navRoute.name));
  const pops = firstSubIdx >= 0 ? state.index - firstSubIdx + 1 : 1;
  navigation.pop(Math.max(1, pops));
}

/**
 * "Confirm your plan" — shared by the single- and multi-site flows so the
 * purchase, trial and proration copy cannot drift apart. Themed by the plan's
 * module; per-site plans also show what the org's sites come to.
 */
export function PlanConfirmView({
  planId,
  initialCycle,
  flowRoutes,
  siteCount,
}: {
  planId: number | null | undefined;
  /** The cycle the person was looking at on the plans screen. */
  initialCycle?: BillingCycle;
  /** Route names of this plans flow, popped together after purchase. */
  flowRoutes: readonly string[];
  /** Billable sites, for per-site plans. */
  siteCount?: number;
}) {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selectPlan } = useAppContext();

  const plans = useSubscriptionStore((s) => s.plans);
  const fetchAvailablePlans = useSubscriptionStore((s) => s.fetchAvailablePlans);
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const plan = useMemo(() => findPlanById(plans, planId), [plans, planId]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(
    () => initialCycle ?? fromApiBillingCycle(entitlements?.billingCycle),
  );

  const {
    purchase,
    primaryLabel,
    trialAvailable,
    busy,
    isPlanChange,
    isCurrentSelection,
    preview,
    previewLoading,
  } = usePlanPurchase({ plan, billingCycle });

  useEffect(() => {
    void fetchAvailablePlans();
  }, [fetchAvailablePlans]);

  const theme = MODULE_THEME[plan?.module ?? 'CONNECT'];
  const accent = theme.color;
  const copy = plan ? planCardCopy(plan) : null;
  const trialDays = plan?.trialDays ?? 0;

  const { amount: unitAmount, suffix: unitSuffix } = plan
    ? planPriceForCycle(plan, billingCycle)
    : { amount: '—', suffix: '' };
  // Per-site plans bill price × sites; the confirm shows the total it comes to.
  const estimate = plan && siteCount != null ? perSiteEstimate(plan, billingCycle, siteCount) : null;
  const afterAmount = estimate ? estimate.total : unitAmount;
  const afterSuffix = estimate ? estimate.suffix : unitSuffix;

  // A switch is prorated against the plan already paid for, so the list price
  // is not what gets charged today — only Stripe's quote is.
  const todayAmount = previewLoading
    ? '…'
    : preview
      ? formatPlanPrice(preview.amountDueToday, preview.currency)
      : trialAvailable
        ? formatPlanPrice(0, plan?.currency)
        : afterAmount;

  // "30 Day Free Trial" only where this plan actually offers one.
  const trustPoints = CONFIRM_TRUST_POINTS.filter(
    (point) => point.key !== 'trial' || trialAvailable,
  ).map((point) =>
    point.key === 'trial' ? { ...point, label: `${trialDays} Day Free Trial` } : point,
  );

  const onPrimary = async () => {
    if (planId == null || !plan) {
      showErrorAlert(null, 'Plan unavailable', 'Please go back and choose a plan.');
      return;
    }
    if (plan.contactSalesOnly) {
      navigation.navigate('EnterpriseConsult');
      return;
    }

    await purchase({
      plan,
      billingCycle,
      onSettled: () => {
        selectPlan(String(plan.id));
        popSubscriptionStack(navigation, flowRoutes);
      },
    });
  };

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, hp(1.2)),
            paddingBottom: Math.max(insets.bottom, hp(2)) + hp(2),
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={normalize(22)} color={palette.black} />
        </Pressable>

        <AppText color={palette.black} style={styles.title}>
          Confirm your plan
        </AppText>
        <AppText color={palette.stone} style={styles.subtitle}>
          Please confirm your plan and billing cycle
        </AppText>

        {!plan || !copy ? (
          <ActivityIndicator color={accent} style={{ marginVertical: hp(4) }} />
        ) : (
          <>
            <AppText color={palette.midgray} style={styles.sectionLabel}>
              Your plan
            </AppText>

            <View style={[styles.planCard, { borderColor: theme.border, backgroundColor: theme.tint }]}>
              <AppText color={accent} style={styles.planName}>
                {plan.displayName}
              </AppText>
              <AppText color={accent} style={styles.tagline}>
                {copy.tagline}
              </AppText>

              <View style={styles.priceRow}>
                <AppText color={accent} style={styles.price}>
                  {unitAmount}
                </AppText>
                <AppText color={palette.black} style={styles.priceUnit}>
                  {` ${unitSuffix}`}
                </AppText>
              </View>

              {estimate ? (
                <AppText color={palette.stone} style={styles.siteBreakdown}>
                  {`${estimate.unit} × ${estimate.sites} ${estimate.sites === 1 ? 'site' : 'sites'} = ${estimate.total} ${estimate.suffix}`}
                </AppText>
              ) : null}

              <AppText color={palette.midgray} style={styles.description}>
                {copy.description}
              </AppText>

              {plan.module === 'COMPLETE' ? (
                <AppText color={accent} style={styles.includesLabel}>
                  {COMPLETE_LIST_HEADING}
                </AppText>
              ) : null}

              <View style={styles.featureList}>
                {[...copy.allowances.map((row) => row.label), ...copy.ticks].map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <View style={[styles.checkIcon, { backgroundColor: accent }]}>
                      <Ionicons name="checkmark" size={normalize(11)} color={palette.white} />
                    </View>
                    <AppText color={palette.black} style={styles.featureText}>
                      {feature}
                    </AppText>
                  </View>
                ))}
              </View>
            </View>

            <AppText color={palette.midgray} style={styles.sectionLabel}>
              Billing cycle
            </AppText>

            <BillingCycleToggle value={billingCycle} onChange={setBillingCycle} accent={accent} />

            <View style={styles.trialCard}>
              <View style={styles.trialRow}>
                <View style={styles.trialLabelWrap}>
                  <AppText color={palette.black} style={styles.trialLabel}>
                    Today
                  </AppText>
                </View>
                <AppText color={accent} style={styles.trialValue}>
                  {todayAmount}
                </AppText>
              </View>

              <View style={styles.trialDivider} />

              <View style={styles.trialRow}>
                <View style={styles.trialLabelWrap}>
                  <AppText color={palette.black} style={styles.trialLabel}>
                    {trialAvailable
                      ? `After ${trialDays} day free trial`
                      : isPlanChange && !isCurrentSelection
                        ? 'Then'
                        : 'Billed'}
                  </AppText>
                </View>
                <View style={styles.trialValueWrap}>
                  <AppText color={accent} style={styles.trialValue}>
                    {afterAmount}
                  </AppText>
                  <AppText color={accent} style={styles.trialSuffix}>
                    {afterSuffix}
                  </AppText>
                </View>
              </View>

              <AppText color={palette.midgray} style={styles.taxNote}>
                Applicable local taxes will be added at checkout.
              </AppText>
            </View>

            {trialAvailable ? (
              <AppText color={palette.midgray} style={styles.remindText}>
                {`No card needed to start. Your free trial lasts ${trialDays} days — add payment details before it ends to keep your plan active. Cancel any time and you pay nothing.`}
              </AppText>
            ) : null}

            {isCurrentSelection ? (
              <AppText color={palette.midgray} style={styles.remindText}>
                This is your current plan and billing cycle. Pick a different cycle above, or
                go back to choose another plan.
              </AppText>
            ) : null}

            <View style={styles.trustRow}>
              {trustPoints.map((point) => (
                <View key={point.key} style={styles.trustItem}>
                  <View style={[styles.trustIconWrap, { borderColor: accent }]}>
                    <Ionicons name={point.icon} size={normalize(22)} color={accent} />
                  </View>
                  <AppText color={accent} style={styles.trustLabel}>
                    {point.label}
                  </AppText>
                </View>
              ))}
            </View>

            <Pressable
              style={[
                styles.ctaBtn,
                { backgroundColor: accent },
                (busy || isCurrentSelection) && styles.pressed,
              ]}
              onPress={() => void onPrimary()}
              disabled={busy || isCurrentSelection}
              accessibilityRole="button"
              accessibilityLabel={primaryLabel}
            >
              {busy ? (
                <ActivityIndicator color={palette.white} />
              ) : (
                <>
                  <AppText color={palette.white} style={styles.ctaText}>
                    {primaryLabel}
                  </AppText>
                  {isCurrentSelection ? null : (
                    <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
                  )}
                </>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(5),
    gap: hp(1.25),
  },
  backBtn: {
    width: normalize(40),
    height: normalize(36),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(28),
    lineHeight: normalize(34),
    textAlign: 'center',
    textTransform: 'none',
  },
  subtitle: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(20),
    textAlign: 'center',
    textTransform: 'none',
    marginTop: -hp(0.45),
    marginBottom: hp(0.35),
  },
  sectionLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textTransform: 'none',
    marginTop: hp(0.2),
  },
  planCard: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.kale,
    borderRadius: normalize(16),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    gap: hp(0.4),
  },
  planName: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(17),
    lineHeight: normalize(22),
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: hp(0.2),
  },
  price: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(30),
    lineHeight: normalize(36),
    textTransform: 'none',
  },
  priceUnit: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(24),
    marginBottom: hp(0.35),
    textTransform: 'none',
  },
  annualLine: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  annualPriceBold: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  description: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(12),
    lineHeight: normalize(17),
    textTransform: 'none',
    marginTop: hp(0.4),
  },
  siteBreakdown: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13),
    textTransform: 'none',
  },
  tagline: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  includesLabel: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
    marginTop: hp(0.55),
  },
  featureList: {
    gap: hp(0.8),
    marginTop: hp(0.4),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.2),
  },
  checkIcon: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.1),
  },
  featureText: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  billingRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  billingBtn: {
    flex: 1,
    minHeight: normalize(56),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: hp(1),
    paddingHorizontal: wp(2),
    gap: hp(0.15),
  },
  billingBtnActive: {
    backgroundColor: palette.kale,
  },
  billingBtnIdle: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: palette.kale,
  },
  billingText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  billingSubText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    lineHeight: normalize(14),
    textTransform: 'none',
  },
  trialCard: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: normalize(14),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
    gap: hp(1),
  },
  trialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  trialDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.strokecream,
  },
  trialLabelWrap: {
    flex: 1,
    minWidth: 0,
    paddingRight: wp(2),
  },
  trialLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  trialValueWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexShrink: 0,
    flexGrow: 0,
    gap: wp(1),
  },
  trialValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    textTransform: 'none',
  },
  trialSuffix: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    textTransform: 'none',
  },
  taxNote: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(11),
    lineHeight: normalize(15),
    textTransform: 'none',
  },
  remindText: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textAlign: 'center',
    textTransform: 'none',
    marginTop: hp(0.35),
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
    marginBottom: hp(0.35),
  },
  trustItem: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.55),
  },
  trustIconWrap: {
    width: normalize(46),
    height: normalize(46),
    borderRadius: normalize(12),
    borderWidth: 1.5,
    borderColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  trustLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    lineHeight: normalize(13),
    textAlign: 'center',
    textTransform: 'none',
  },
  ctaBtn: {
    backgroundColor: palette.kale,
    borderRadius: normalize(14),
    minHeight: normalize(54),
    paddingHorizontal: wp(4.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ctaText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    textTransform: 'none',
    flex: 1,
    paddingRight: wp(2),
  },
  pressed: {
    opacity: 0.88,
  },
});
