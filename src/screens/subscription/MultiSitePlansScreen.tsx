import React, { useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  MULTI_SITE_INTRO,
  MULTI_SITE_SUCCESS_BANNER,
  MULTI_SITE_TRUST_POINTS,
} from './multiSitePlans';
import { useSubscriptionGate } from './useSubscriptionGate';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import type { AvailablePlan } from '@/services/subscriptions.service';
import {
  findPlanById,
  formatPlanMonthlyLabel,
  formatPlanAnnualLabel,
  fromApiBillingCycle,
  getPlanRelation,
} from '@/utils/billingHelpers';
import { selectHasLiveSubscription } from '@/store/subscriptionStore';
import { PendingPlanChangeBanner } from '@/components/PendingPlanChangeBanner';
import { CurrentPlanCard } from '@/components/CurrentPlanCard';

const ACCENT = palette.kale;
const ACCENT_SOFT = '#E8F6EC';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MultiSitePlans'>;

export function MultiSitePlansScreen() {
  useTransparentStatusBar('dark');
  useSubscriptionGate('multi');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const plans = useSubscriptionStore((s) => s.plans);
  const isFetchingPlans = useSubscriptionStore((s) => s.isFetchingPlans);
  const fetchAvailablePlans = useSubscriptionStore((s) => s.fetchAvailablePlans);
  const plansError = useSubscriptionStore((s) => s.error);
  const available = useSubscriptionStore((s) => s.available);
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const fetchEntitlements = useSubscriptionStore((s) => s.fetchEntitlements);
  const hasLiveSubscription = useSubscriptionStore(selectHasLiveSubscription);
  const trialAvailable = Boolean(entitlements?.freeTrialAvailable) && !hasLiveSubscription;
  const currentPlanId = entitlements?.entitled ? entitlements.planId : null;

  useEffect(() => {
    void fetchAvailablePlans(true);
    // A plan bought moments ago must show as current, so this cannot use the cache.
    void fetchEntitlements(true);
  }, [fetchAvailablePlans, fetchEntitlements]);

  const sortedPlans = useMemo(() => {
    return [...plans].sort((a, b) => {
      if (a.contactSalesOnly === b.contactSalesOnly) return 0;
      return a.contactSalesOnly ? 1 : -1;
    });
  }, [plans]);

  const currentPlan = findPlanById(plans, currentPlanId);
  const currentCycle = fromApiBillingCycle(entitlements?.billingCycle);

  const onPlanAction = (plan: AvailablePlan) => {
    if (plan.contactSalesOnly) {
      navigation.navigate('EnterpriseConsult');
      return;
    }
    navigation.navigate('MultiSiteConfirm', { planId: plan.id });
  };

  const ctaLabel = (plan: AvailablePlan) => {
    if (plan.contactSalesOnly) return 'Talk to Sales Team';
    // Still actionable — the cycle can change even when the tier does not.
    if (plan.id === currentPlanId) return 'Change billing cycle';
    if (!hasLiveSubscription) {
      return trialAvailable ? 'Start Free 30 Day Trial' : 'Choose this plan';
    }
    const relation = getPlanRelation({
      plan,
      currentPlan,
      targetCycle: currentCycle,
      currentCycle,
    });
    return relation === 'UPGRADE' ? 'Upgrade to this plan' : 'Switch to this plan';
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
          {currentPlanId != null ? 'Your plan' : 'Choose your plan'}
        </AppText>

        <CurrentPlanCard />

        <View style={styles.successBanner}>
          <View style={styles.bannerIconWrap}>
            <Ionicons name="sparkles" size={normalize(18)} color={ACCENT} />
          </View>
          <AppText color={ACCENT} style={styles.successText}>
            {MULTI_SITE_SUCCESS_BANNER}
          </AppText>
        </View>

        <AppText color={palette.stone} style={styles.intro}>
          {MULTI_SITE_INTRO}
        </AppText>

        <PendingPlanChangeBanner />

        {isFetchingPlans && !sortedPlans.length ? (
          <ActivityIndicator color={ACCENT} style={{ marginVertical: hp(3) }} />
        ) : null}

        {!isFetchingPlans && !sortedPlans.length ? (
          <View style={styles.emptyBox}>
            <AppText color={palette.stone} style={styles.emptyText}>
              {plansError ??
                available?.message ??
                'No plans are available for your organisation right now.'}
            </AppText>
            {plansError ? (
              <Pressable
                style={styles.retryBtn}
                onPress={() => void fetchAvailablePlans(true)}
                accessibilityRole="button"
                accessibilityLabel="Retry loading plans"
              >
                <AppText color={ACCENT} style={styles.retryText}>
                  Try again
                </AppText>
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {sortedPlans.map((plan) => {
          const isEnterprise = plan.contactSalesOnly;
          return (
            <View
              key={plan.id}
              style={[styles.planCard, plan.id === currentPlanId && styles.planCardCurrent]}
            >
              <View style={styles.planHeaderRow}>
                <AppText
                  color={isEnterprise ? palette.black : ACCENT}
                  style={styles.planName}
                >
                  {plan.displayName}
                </AppText>
                {plan.id === currentPlanId ? (
                  <View style={styles.currentBadge}>
                    <AppText color={palette.white} style={styles.currentBadgeText}>
                      Current plan
                    </AppText>
                  </View>
                ) : null}
              </View>

              <AppText color={palette.black} style={isEnterprise ? styles.customPrice : styles.price}>
                {formatPlanMonthlyLabel(plan)}
              </AppText>
              {formatPlanAnnualLabel(plan) ? (
                <AppText color={palette.midgray} style={styles.annualLine}>
                  or {formatPlanAnnualLabel(plan)}
                </AppText>
              ) : null}

              {plan.description ? (
                <AppText color={palette.midgray} style={styles.description}>
                  {plan.description}
                </AppText>
              ) : null}

              {plan.inheritsFrom ? (
                <AppText color={ACCENT} style={styles.includesLabel}>
                  Includes everything in {plan.inheritsFrom}, plus;
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

              <Pressable
                style={
                  isEnterprise || plan.id === currentPlanId
                    ? styles.outlineBtn
                    : styles.solidBtn
                }
                onPress={() => onPlanAction(plan)}
              >
                <AppText
                  color={isEnterprise || plan.id === currentPlanId ? ACCENT : palette.white}
                  style={styles.ctaText}
                >
                  {ctaLabel(plan)}
                </AppText>
                <Ionicons
                  name="arrow-forward"
                  size={normalize(18)}
                  color={isEnterprise || plan.id === currentPlanId ? ACCENT : palette.white}
                />
              </Pressable>
            </View>
          );
        })}

        <View style={styles.trustRow}>
          {MULTI_SITE_TRUST_POINTS.map((point) => (
            <View key={point.key} style={styles.trustItem}>
              <View style={styles.trustIconWrap}>
                <Ionicons name={point.icon} size={normalize(20)} color={ACCENT} />
              </View>
              <AppText color={ACCENT} style={styles.trustLabel}>
                {point.label}
              </AppText>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}


const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(5),
    gap: hp(1.4),
  },
  emptyBox: {
    alignItems: 'center',
    gap: hp(0.4),
    marginVertical: hp(2),
  },
  emptyText: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    textAlign: 'center',
    textTransform: 'none',
  },
  retryBtn: {
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(4),
  },
  retryText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    textTransform: 'none',
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(14),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.5),
  },
  bannerIconWrap: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.1),
  },
  successText: {
    flex: 1,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  intro: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(19),
    textAlign: 'center',
    textTransform: 'none',
  },
  planCard: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: normalize(16),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    gap: hp(0.45),
  },
  planCardCurrent: {
    borderWidth: 2,
    backgroundColor: '#F4FBF5',
  },
  planHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  planName: {
    flexShrink: 1,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(21),
    textTransform: 'uppercase',
  },
  currentBadge: {
    backgroundColor: palette.eggplant,
    borderRadius: normalize(999),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
  },
  currentBadgeText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10),
    textTransform: 'none',
  },
  disabledBtn: {
    opacity: 0.5,
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
  customPrice: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(26),
    lineHeight: normalize(32),
    textTransform: 'none',
    marginTop: hp(0.2),
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
    marginTop: hp(0.35),
  },
  includesLabel: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
    marginTop: hp(0.45),
  },
  featureList: {
    gap: hp(0.8),
    marginTop: hp(0.4),
    marginBottom: hp(0.6),
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
  solidBtn: {
    backgroundColor: ACCENT,
    borderRadius: normalize(14),
    minHeight: normalize(50),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.4),
  },
  outlineBtn: {
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: normalize(14),
    minHeight: normalize(50),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.4),
  },
  ctaText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
    flex: 1,
    paddingRight: wp(2),
  },
  trustRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
    marginTop: hp(0.4),
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
  pressed: {
    opacity: 0.88,
  },
});
