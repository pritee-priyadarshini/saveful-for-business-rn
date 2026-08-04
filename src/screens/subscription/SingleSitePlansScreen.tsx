import React, { useEffect, useMemo, useState } from 'react';
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
  SINGLE_SITE_CORE_FEATURES,
  SINGLE_SITE_UPGRADE_BODY,
  SINGLE_SITE_UPGRADE_TITLE,
} from './singleSitePlans';
import { useSubscriptionGate } from './useSubscriptionGate';
import { useSubscriptionStore } from '@/store/subscriptionStore';
import type { AvailablePlan } from '@/services/subscriptions.service';
import {
  findPlanById,
  formatPlanAnnualLabel,
  formatPlanPrice,
  fromApiBillingCycle,
  getPlanRelation,
  pickDefaultPlanId,
  planRelationLabel,
  type PlanRelation,
} from '@/utils/billingHelpers';
import { PendingPlanChangeBanner } from '@/components/PendingPlanChangeBanner';
import { CurrentPlanCard } from '@/components/CurrentPlanCard';

const ACCENT = palette.kale;
const ACCENT_SOFT = `${palette.mint}66`;

type Nav = NativeStackNavigationProp<RootStackParamList, 'SingleSitePlans'>;

export function SingleSitePlansScreen() {
  useTransparentStatusBar('dark');
  useSubscriptionGate('single');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const plans = useSubscriptionStore((s) => s.plans);
  const isFetchingPlans = useSubscriptionStore((s) => s.isFetchingPlans);
  const fetchAvailablePlans = useSubscriptionStore((s) => s.fetchAvailablePlans);
  const plansError = useSubscriptionStore((s) => s.error);
  const available = useSubscriptionStore((s) => s.available);
  const entitlements = useSubscriptionStore((s) => s.entitlements);
  const fetchEntitlements = useSubscriptionStore((s) => s.fetchEntitlements);

  const purchasablePlans = useMemo(
    () => plans.filter((plan) => !plan.contactSalesOnly),
    [plans],
  );

  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);

  useEffect(() => {
    void fetchAvailablePlans(true);
    // A plan bought moments ago must show as current, so this cannot use the cache.
    void fetchEntitlements(true);
  }, [fetchAvailablePlans, fetchEntitlements]);

  const currentPlanId = entitlements?.entitled ? entitlements.planId : null;
  const currentPlan = findPlanById(purchasablePlans, currentPlanId);
  const currentCycle = fromApiBillingCycle(entitlements?.billingCycle);

  // Open on the plan the org already holds so the screen reads as "manage",
  // not as a fresh purchase.
  useEffect(() => {
    if (selectedPlanId != null) return;
    setSelectedPlanId(currentPlanId ?? pickDefaultPlanId(purchasablePlans));
  }, [currentPlanId, purchasablePlans, selectedPlanId]);

  const selectedPlan = findPlanById(purchasablePlans, selectedPlanId);
  const selectedRelation = selectedPlan
    ? getPlanRelation({
        plan: selectedPlan,
        currentPlan,
        targetCycle: currentCycle,
        currentCycle,
      })
    : 'NEW';
  const continueLabel = selectedPlan
    ? planRelationLabel(selectedRelation, selectedPlan.displayName)
    : 'Continue';

  const onContinue = () => {
    if (selectedPlanId == null) return;
    navigation.navigate('SingleSiteConfirm', { planId: selectedPlanId });
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
          {currentPlan ? 'Your plan' : 'Compare plans'}
        </AppText>
        <AppText color={palette.black} style={styles.subtitle}>
          {currentPlan
            ? 'Review your subscription or move to a different plan'
            : "Choose the plan that's right for you"}
        </AppText>

        <CurrentPlanCard />

        <View style={styles.coreBanner}>
          <AppText color={ACCENT} style={styles.coreBannerTitle}>
            All plans include our core features
          </AppText>
          <View style={styles.coreRow}>
            {SINGLE_SITE_CORE_FEATURES.map((feature) => (
              <View key={feature.key} style={styles.coreItem}>
                <Ionicons name={feature.icon} size={normalize(26)} color={ACCENT} />
                <AppText color={ACCENT} style={styles.coreLabel}>
                  {feature.label}
                </AppText>
              </View>
            ))}
          </View>
        </View>

        <PendingPlanChangeBanner />

        {isFetchingPlans && !purchasablePlans.length ? (
          <ActivityIndicator color={ACCENT} style={{ marginVertical: hp(4) }} />
        ) : null}

        {purchasablePlans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlanId === plan.id}
            isCurrent={plan.id === currentPlanId}
            relation={getPlanRelation({
              plan,
              currentPlan,
              targetCycle: currentCycle,
              currentCycle,
            })}
            onSelect={() => setSelectedPlanId(plan.id)}
          />
        ))}

        {!isFetchingPlans && !purchasablePlans.length ? (
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
                <AppText color={ACCENT} style={styles.retryText}>
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

        <View style={styles.tipBox}>
          <Ionicons name="bulb-outline" size={normalize(24)} color={ACCENT} />
          <View style={styles.tipCopy}>
            <AppText color={ACCENT} style={styles.tipTitle}>
              {SINGLE_SITE_UPGRADE_TITLE}
            </AppText>
            <AppText color={palette.black} style={styles.tipBody}>
              {SINGLE_SITE_UPGRADE_BODY}
            </AppText>
          </View>
        </View>

        <Pressable
          style={[styles.continueBtn, selectedPlanId == null && styles.continueBtnDisabled]}
          onPress={onContinue}
          disabled={selectedPlanId == null}
          accessibilityRole="button"
          accessibilityLabel={continueLabel}
        >
          <AppText color={palette.white} style={styles.continueText}>
            {continueLabel}
          </AppText>
          <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
        </Pressable>

        {purchasablePlans.length >= 2 ? (
          <Pressable
            style={styles.compareBtn}
            onPress={() =>
              navigation.navigate('SingleSiteCompare', {
                planId: selectedPlanId ?? undefined,
              })
            }
            accessibilityRole="button"
            accessibilityLabel="Open compare plans page"
          >
            <AppText color={ACCENT} style={styles.compareBtnText}>
              Compare plans
            </AppText>
            <Ionicons name="chevron-down" size={normalize(18)} color={ACCENT} />
          </Pressable>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  plan,
  selected,
  isCurrent,
  relation,
  onSelect,
}: {
  plan: AvailablePlan;
  selected: boolean;
  isCurrent: boolean;
  relation: PlanRelation;
  onSelect: () => void;
}) {
  const monthly = formatPlanPrice(plan.priceMonthly, plan.currency);
  const annual = formatPlanAnnualLabel(plan);

  return (
    <Pressable
      style={[
        styles.planCard,
        selected && styles.planCardSelected,
        isCurrent && styles.planCardCurrent,
      ]}
      onPress={onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View style={styles.planHeader}>
        <AppText color={palette.black} style={styles.planName}>
          {plan.displayName}
        </AppText>
        {isCurrent ? (
          <View style={[styles.badge, styles.badgeCurrent]}>
            <AppText color={palette.white} style={styles.badgeText}>
              Current plan
            </AppText>
          </View>
        ) : plan.isMostPopular ? (
          <View style={styles.badge}>
            <AppText color={palette.white} style={styles.badgeText}>
              Most Popular
            </AppText>
          </View>
        ) : null}
      </View>

      {!isCurrent && relation !== 'NEW' ? (
        <AppText color={ACCENT} style={styles.relationHint}>
          {relation === 'UPGRADE' ? 'Upgrade — applies today' : 'Applies at your next renewal'}
        </AppText>
      ) : null}

      <View style={styles.priceRow}>
        <AppText color={palette.black} style={styles.price}>
          {monthly}
        </AppText>
        <AppText color={palette.black} style={styles.priceUnit}>
          {' '}
          /month
        </AppText>
      </View>
      {annual ? (
        <AppText color={palette.midgray} style={styles.annualLine}>
          or {annual}
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
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(5),
    gap: hp(1.4),
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: hp(0.4),
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(28),
    textTransform: 'none',
  },
  subtitle: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(15),
    textTransform: 'none',
    marginBottom: hp(0.6),
  },
  coreBanner: {
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(14),
    padding: wp(3.5),
    gap: hp(1),
  },
  coreBannerTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    textTransform: 'none',
  },
  coreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(1),
  },
  coreItem: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.4),
  },
  coreLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    textAlign: 'center',
    textTransform: 'none',
  },
  planCard: {
    borderWidth: normalize(1.5),
    borderColor: '#D6D6D0',
    borderRadius: normalize(14),
    padding: wp(4),
    backgroundColor: palette.white,
    gap: hp(0.6),
  },
  planCardSelected: {
    borderColor: ACCENT,
    backgroundColor: '#F4FBF5',
  },
  planCardCurrent: {
    borderColor: ACCENT,
    borderWidth: 2,
  },
  relationHint: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(11),
    textTransform: 'none',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
  },
  planName: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    textTransform: 'uppercase',
    flex: 1,
  },
  badge: {
    backgroundColor: ACCENT,
    borderRadius: normalize(999),
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.3),
  },
  badgeCurrent: {
    backgroundColor: palette.eggplant,
  },
  badgeText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10),
    textTransform: 'none',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  price: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(28),
    textTransform: 'none',
  },
  priceUnit: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    marginBottom: hp(0.4),
    textTransform: 'none',
  },
  annualLine: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    textTransform: 'none',
  },
  description: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    textTransform: 'none',
    marginTop: hp(0.3),
  },
  featureList: {
    marginTop: hp(0.6),
    gap: hp(0.5),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
  },
  checkIcon: {
    width: normalize(16),
    height: normalize(16),
    borderRadius: normalize(8),
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.15),
  },
  featureText: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    textTransform: 'none',
  },
  tipBox: {
    flexDirection: 'row',
    gap: wp(3),
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(12),
    padding: wp(3.5),
    alignItems: 'flex-start',
  },
  tipCopy: {
    flex: 1,
    gap: hp(0.3),
  },
  tipTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    textTransform: 'none',
  },
  tipBody: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(12),
    textTransform: 'none',
  },
  continueBtn: {
    marginTop: hp(0.6),
    backgroundColor: ACCENT,
    borderRadius: normalize(12),
    minHeight: hp(6),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    textTransform: 'none',
  },
  compareBtn: {
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingVertical: hp(0.8),
  },
  compareBtnText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    textTransform: 'none',
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
