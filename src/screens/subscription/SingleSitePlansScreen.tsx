import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import type { AvailablePlan } from '@/services/subscriptions.service';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import { fromApiBillingCycle } from '@/utils/billingHelpers';
import { PendingPlanChangeBanner } from '@/components/PendingPlanChangeBanner';
import { CurrentPlanCard } from '@/components/CurrentPlanCard';
import { BillingCycleToggle } from '@/components/plans/BillingCycleToggle';
import { ModulePlanCard } from '@/components/plans/ModulePlanCard';
import { CompletePlanCard } from '@/components/plans/CompletePlanCard';
import { SINGLE_SITE_SCREEN_TITLE, type BillingCycle } from './singleSitePlans';
import { usePlanCardActions } from './usePlanCardActions';
import { useSubscriptionGate } from './useSubscriptionGate';

/** Below this the two module cards stack; above it they sit side by side. */
const SIDE_BY_SIDE_MIN_WIDTH = 700;

type Nav = NativeStackNavigationProp<RootStackParamList, 'SingleSitePlans'>;

/**
 * "Your Plan - Single Site": Make Food Count and Saveful Connect side by side,
 * Complete Solution full width underneath. Every card has its own CTA, which
 * opens the confirm screen for that plan and the cycle shown.
 *
 * Cards are grouped by module rather than by plan name, so the screen still
 * reads sensibly for farms (Saveful Connect only) and against a backend that
 * still lists the legacy tiers.
 */
export function SingleSitePlansScreen() {
  useTransparentStatusBar('dark');
  useSubscriptionGate('single');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { width } = useResponsiveLayout();
  const sideBySide = width >= SIDE_BY_SIDE_MIN_WIDTH;

  const plans = useSubscriptionStore((s) => s.plans);
  const isFetchingPlans = useSubscriptionStore((s) => s.isFetchingPlans);
  const fetchAvailablePlans = useSubscriptionStore((s) => s.fetchAvailablePlans);
  const plansError = useSubscriptionStore((s) => s.error);
  const available = useSubscriptionStore((s) => s.available);
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const fetchEntitlements = useSubscriptionStore((s) => s.fetchEntitlements);

  useEffect(() => {
    void fetchAvailablePlans(true);
    // A plan bought moments ago must show as current, so this cannot use the cache.
    void fetchEntitlements(true);
  }, [fetchAvailablePlans, fetchEntitlements]);

  // Open on the cycle the org is billed on; once the person picks one, keep it.
  const [cycle, setCycle] = useState<BillingCycle>(() =>
    fromApiBillingCycle(entitlements?.billingCycle),
  );
  const cycleTouched = useRef(false);
  useEffect(() => {
    if (cycleTouched.current || !entitlements?.billingCycle) return;
    setCycle(fromApiBillingCycle(entitlements.billingCycle));
  }, [entitlements?.billingCycle]);
  const onCycleChange = (next: BillingCycle) => {
    cycleTouched.current = true;
    setCycle(next);
  };

  const onChoose = useCallback(
    (plan: AvailablePlan) => navigation.navigate('SingleSiteConfirm', { planId: plan.id, cycle }),
    [cycle, navigation],
  );
  const { actionFor, isCurrentPlan, currentPlan, blockedFromBilling } = usePlanCardActions({
    cycle,
    onChoose,
  });

  const purchasable = useMemo(() => plans.filter((plan) => !plan.contactSalesOnly), [plans]);
  // Design order: Make Food Count, then Saveful Connect, then the Complete bundle.
  const moduleCards = useMemo(
    () =>
      purchasable
        .filter((plan) => plan.module !== 'COMPLETE')
        .sort((a, b) => (a.module === b.module ? 0 : a.module === 'MFC' ? -1 : 1)),
    [purchasable],
  );
  const completeCards = useMemo(
    () => purchasable.filter((plan) => plan.module === 'COMPLETE'),
    [purchasable],
  );

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

        <View style={[styles.header, sideBySide && styles.headerRow]}>
          <View style={styles.headerCopy}>
            <AppText color={palette.black} style={styles.title}>
              {SINGLE_SITE_SCREEN_TITLE}
            </AppText>
            <AppText color={palette.stone} style={styles.subtitle}>
              {currentPlan
                ? 'Review your plan, add a module or change how you are billed.'
                : "Choose the plan that's right for your kitchen."}
            </AppText>
          </View>
          <BillingCycleToggle value={cycle} onChange={onCycleChange} />
        </View>

        <CurrentPlanCard />
        <PendingPlanChangeBanner />

        {blockedFromBilling ? (
          <View style={styles.notice}>
            <Ionicons name="information-circle-outline" size={normalize(18)} color={palette.stone} />
            <AppText color={palette.stone} style={styles.noticeText}>
              Only your organisation admin can start or change a plan. Ask them to choose one here
              or on the Saveful website.
            </AppText>
          </View>
        ) : null}

        {isFetchingPlans && !purchasable.length ? (
          <ActivityIndicator color={palette.kale} style={{ marginVertical: hp(4) }} />
        ) : null}

        {moduleCards.length ? (
          <View style={[styles.moduleGrid, sideBySide && styles.moduleGridRow]}>
            {moduleCards.map((plan) => (
              <ModulePlanCard
                key={plan.id}
                plan={plan}
                cycle={cycle}
                action={actionFor(plan)}
                isCurrent={isCurrentPlan(plan)}
                style={sideBySide && moduleCards.length > 1 ? styles.moduleCardHalf : null}
              />
            ))}
          </View>
        ) : null}

        {completeCards.map((plan) => (
          <CompletePlanCard
            key={plan.id}
            plan={plan}
            cycle={cycle}
            action={actionFor(plan)}
            isCurrent={isCurrentPlan(plan)}
            twoColumn={sideBySide}
          />
        ))}

        {!isFetchingPlans && !purchasable.length ? (
          plansError ? (
            <View style={styles.errorBox}>
              <AppText color={palette.stone} style={styles.emptyText}>
                {plansError}
              </AppText>
              <Pressable
                style={styles.retryBtn}
                onPress={() => void fetchAvailablePlans(true)}
                accessibilityRole="button"
                accessibilityLabel="Retry loading plans"
              >
                <AppText color={palette.kale} style={styles.retryText}>
                  Try again
                </AppText>
              </Pressable>
            </View>
          ) : (
            <AppText color={palette.stone} style={styles.emptyText}>
              {available?.message ?? 'No plans are available for your organisation right now.'}
            </AppText>
          )
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(5),
    gap: hp(1.6),
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: hp(0.4),
  },
  header: {
    gap: hp(1.2),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerCopy: {
    flexShrink: 1,
    gap: hp(0.4),
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(24),
    textTransform: 'none',
  },
  subtitle: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    textTransform: 'none',
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.strokecream,
    borderRadius: normalize(12),
    padding: wp(3.5),
  },
  noticeText: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  moduleGrid: {
    gap: hp(1.6),
  },
  moduleGridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  moduleCardHalf: {
    flex: 1,
  },
  emptyText: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    textAlign: 'center',
    textTransform: 'none',
    marginVertical: hp(2),
  },
  errorBox: {
    alignItems: 'center',
    gap: hp(0.4),
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
});
