import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { useAppContext } from '@/store/AppContext';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import { MULTI_SITE_TRUST_POINTS } from './multiSitePlans';
import type { BillingCycle } from './singleSitePlans';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import {
  findPlanById,
  formatPlanPrice,
  fromApiBillingCycle,
  pickDefaultPlanId,
} from '@/utils/billingHelpers';
import { usePlanPurchase } from './usePlanPurchase';
import { showErrorAlert } from '@/utils/apiError';

const ACCENT = palette.kale;

type Nav = NativeStackNavigationProp<RootStackParamList, 'MultiSiteConfirm'>;
type Route = RouteProp<RootStackParamList, 'MultiSiteConfirm'>;

function popSubscriptionStack(navigation: Nav) {
  const state = navigation.getState();
  const firstSubIdx = state.routes.findIndex(
    (navRoute) =>
      navRoute.name === 'MultiSitePlans' ||
      navRoute.name === 'MultiSiteConfirm' ||
      navRoute.name === 'RestaurantPlan',
  );
  const pops = firstSubIdx >= 0 ? state.index - firstSubIdx + 1 : 1;
  navigation.pop(Math.max(1, pops));
}

export function MultiSiteConfirmScreen() {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { selectPlan } = useAppContext();

  const plans = useSubscriptionStore((s) => s.plans);
  const fetchAvailablePlans = useSubscriptionStore((s) => s.fetchAvailablePlans);
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const purchasable = useMemo(
    () => plans.filter((p) => !p.contactSalesOnly),
    [plans],
  );
  const planId = route.params?.planId ?? pickDefaultPlanId(purchasable);
  const plan = useMemo(() => findPlanById(purchasable, planId), [purchasable, planId]);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>(() =>
    fromApiBillingCycle(entitlements?.billingCycle),
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

  const afterAmount =
    billingCycle === 'annual'
      ? formatPlanPrice(plan?.priceAnnual, plan?.currency)
      : formatPlanPrice(plan?.priceMonthly, plan?.currency);
  const afterSuffix =
    billingCycle === 'annual'
      ? plan?.isPerSite
        ? '/year per site'
        : '/year'
      : plan?.isPerSite
        ? '/month per site'
        : '/month';

  // A switch is prorated against the plan already paid for, so the list price
  // is not what gets charged today — only Stripe's quote is.
  const todayAmount = previewLoading
    ? '…'
    : preview
      ? formatPlanPrice(preview.amountDueToday, preview.currency)
      : trialAvailable
        ? formatPlanPrice(0, plan?.currency)
        : afterAmount;

  const onPrimary = async () => {
    if (planId == null || !plan) {
      showErrorAlert(null, 'Plan unavailable', 'Please go back and choose a plan.');
      return;
    }

    await purchase({
      plan,
      billingCycle,
      onSettled: () => {
        selectPlan(String(plan.id));
        popSubscriptionStack(navigation);
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
        >
          <Ionicons name="arrow-back" size={normalize(22)} color={palette.black} />
        </Pressable>

        <AppText color={palette.black} style={styles.title}>
          Confirm your plan
        </AppText>
        <AppText color={palette.stone} style={styles.subtitle}>
          Please confirm your plan and billing cycle
        </AppText>

        {!plan ? (
          <ActivityIndicator color={ACCENT} style={{ marginVertical: hp(4) }} />
        ) : (
          <>
            <AppText color={palette.midgray} style={styles.sectionLabel}>
              Your plan
            </AppText>

            <View style={styles.planCard}>
              <AppText color={ACCENT} style={styles.planName}>
                {plan.displayName}
              </AppText>

              <View style={styles.priceRow}>
                <AppText color={palette.black} style={styles.price}>
                  {formatPlanPrice(plan.priceMonthly, plan.currency)}
                </AppText>
                <AppText color={palette.black} style={styles.priceUnit}>
                  {' '}
                  {plan.isPerSite ? '/month per site' : '/month'}
                </AppText>
              </View>

              {plan.priceAnnual != null ? (
                <AppText color={palette.midgray} style={styles.annualLine}>
                  or{' '}
                  <AppText color={ACCENT} style={styles.annualPriceBold}>
                    {formatPlanPrice(plan.priceAnnual, plan.currency)}
                  </AppText>
                  {' '}
                  annually
                </AppText>
              ) : null}

              {plan.description ? (
                <AppText color={palette.midgray} style={styles.description}>
                  {plan.description}
                </AppText>
              ) : null}

              <View style={styles.featureList}>
                {(plan.features ?? []).map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <View style={styles.checkIcon}>
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

            <View style={styles.billingRow}>
              <Pressable
                style={[
                  styles.billingBtn,
                  billingCycle === 'monthly' ? styles.billingBtnActive : styles.billingBtnIdle,
                ]}
                onPress={() => setBillingCycle('monthly')}
              >
                <AppText
                  color={billingCycle === 'monthly' ? palette.white : ACCENT}
                  style={styles.billingText}
                >
                  Monthly
                </AppText>
              </Pressable>

              <Pressable
                style={[
                  styles.billingBtn,
                  billingCycle === 'annual' ? styles.billingBtnActive : styles.billingBtnIdle,
                ]}
                onPress={() => setBillingCycle('annual')}
              >
                <AppText
                  color={billingCycle === 'annual' ? palette.white : ACCENT}
                  style={styles.billingText}
                >
                  Annual
                </AppText>
                <AppText
                  color={billingCycle === 'annual' ? palette.white : ACCENT}
                  style={styles.billingSubText}
                >
                  2 months free
                </AppText>
              </Pressable>
            </View>

            <View style={styles.trialCard}>
              <View style={styles.trialRow}>
                <View style={styles.trialLabelWrap}>
                  <AppText color={palette.black} style={styles.trialLabel}>
                    Today
                  </AppText>
                </View>
                <AppText color={ACCENT} style={styles.trialValue}>
                  {todayAmount}
                </AppText>
              </View>

              <View style={styles.trialDivider} />

              <View style={styles.trialRow}>
                <View style={styles.trialLabelWrap}>
                  <AppText color={palette.black} style={styles.trialLabel}>
                    {trialAvailable
                      ? 'After 30 day free Trial'
                      : isPlanChange && !isCurrentSelection
                        ? 'Then'
                        : 'Billed'}
                  </AppText>
                </View>
                <View style={styles.trialValueWrap}>
                  <AppText color={ACCENT} style={styles.trialValue}>
                    {afterAmount}
                  </AppText>
                  <AppText color={ACCENT} style={styles.trialSuffix}>
                    {afterSuffix}
                  </AppText>
                </View>
              </View>
            </View>

            <View style={styles.trustRow}>
              {MULTI_SITE_TRUST_POINTS.map((point) => (
                <View key={point.key} style={styles.trustItem}>
                  <View style={styles.trustIconWrap}>
                    <Ionicons name={point.icon} size={normalize(22)} color={ACCENT} />
                  </View>
                  <AppText color={ACCENT} style={styles.trustLabel}>
                    {point.label}
                  </AppText>
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.ctaBtn, (busy || isCurrentSelection) && styles.pressed]}
              onPress={() => void onPrimary()}
              disabled={busy || isCurrentSelection}
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
    borderColor: ACCENT,
    borderRadius: normalize(16),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    gap: hp(0.4),
  },
  planName: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(21),
    textTransform: 'uppercase',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    flexWrap: 'wrap',
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
    fontSize: normalize(14),
    lineHeight: normalize(22),
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
  featureList: {
    gap: hp(0.8),
    marginTop: hp(0.5),
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
    backgroundColor: ACCENT,
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
    backgroundColor: ACCENT,
  },
  billingBtnIdle: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: ACCENT,
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
    alignItems: 'flex-start',
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
    flexShrink: 1,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    maxWidth: '58%',
    gap: wp(1),
  },
  trialValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
    textAlign: 'right',
  },
  trialSuffix: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
    textAlign: 'right',
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
    borderColor: ACCENT,
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
    backgroundColor: ACCENT,
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
