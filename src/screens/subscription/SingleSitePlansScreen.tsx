import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
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
  SINGLE_SITE_CORE_FEATURES,
  SINGLE_SITE_PLANS,
  SINGLE_SITE_UPGRADE_BODY,
  SINGLE_SITE_UPGRADE_TITLE,
  getContinueLabel,
  type SingleSitePlan,
  type SingleSitePlanId,
} from './singleSitePlans';

const ACCENT = palette.kale;
const ACCENT_SOFT = `${palette.mint}66`;

type Nav = NativeStackNavigationProp<RootStackParamList, 'SingleSitePlans'>;

export function SingleSitePlansScreen() {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [selectedPlanId, setSelectedPlanId] = useState<SingleSitePlanId>('single_plus');

  const continueLabel = getContinueLabel(selectedPlanId);

  const onContinue = () => {
    navigation.navigate('SingleSiteConfirm', { selectedPlanId });
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
          Compare plans
        </AppText>
        <AppText color={palette.black} style={styles.subtitle}>
          Choose the plan that's right for you
        </AppText>

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

        {SINGLE_SITE_PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            selected={selectedPlanId === plan.id}
            onSelect={() => setSelectedPlanId(plan.id)}
          />
        ))}

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
          style={styles.continueBtn}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={continueLabel}
        >
          <AppText color={palette.white} style={styles.continueText}>
            {continueLabel}
          </AppText>
          <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
        </Pressable>

        <Pressable
          style={styles.compareBtn}
          onPress={() =>
            navigation.navigate('SingleSiteCompare', { selectedPlanId })
          }
          accessibilityRole="button"
          accessibilityLabel="Open compare plans page"
        >
          <AppText color={ACCENT} style={styles.compareBtnText}>
            Compare plans
          </AppText>
          <Ionicons name="chevron-down" size={normalize(18)} color={ACCENT} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: SingleSitePlan;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Pressable
      onPress={onSelect}
      style={[styles.planCard, selected && styles.planCardSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
    >
      {plan.badge ? (
        <View style={styles.badge}>
          <AppText color={palette.white} style={styles.badgeText}>
            {plan.badge}
          </AppText>
        </View>
      ) : null}

      <View style={styles.planHeader}>
        <AppText color={palette.black} style={styles.planName}>
          {plan.name}
        </AppText>
        <View style={[styles.radioOuter, selected && styles.radioOuterSelected]} />
      </View>

      <View style={styles.priceRow}>
        <AppText color={palette.black} style={styles.price}>
          {plan.monthlyPrice}
        </AppText>
        <AppText color={palette.black} style={styles.priceUnit}>
          {' '}/month
        </AppText>
      </View>

      <AppText color={palette.midgray} style={styles.annualLine}>
        or{' '}
        <AppText color={ACCENT} style={styles.annualPriceBold}>
          {plan.annualPrice}
        </AppText>
        {' '}annually ({plan.annualNote})
      </AppText>

      <AppText color={palette.midgray} style={styles.planDescription}>
        {plan.description}
      </AppText>

      {plan.includesLabel ? (
        <AppText color={ACCENT} style={styles.includesLabel}>
          {plan.includesLabel}
        </AppText>
      ) : null}

      <View style={styles.featureList}>
        {plan.features.map((feature) => (
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
    width: normalize(40),
    height: normalize(36),
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(30),
    lineHeight: normalize(34),
    textAlign: 'center',
    textTransform: 'none',
  },
  subtitle: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textAlign: 'center',
    textTransform: 'none',
    marginTop: -hp(0.2),
    marginBottom: hp(0.3),
  },
  coreBanner: {
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(18),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(2),
    gap: hp(1.2),
  },
  coreBannerTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textAlign: 'center',
    textTransform: 'none',
  },
  coreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  coreItem: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.55),
    paddingHorizontal: wp(0.5),
  },
  coreLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(10),
    lineHeight: normalize(12),
    textAlign: 'center',
    textTransform: 'none',
  },
  planCard: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: normalize(18),
    paddingHorizontal: wp(4),
    paddingTop: hp(2.1),
    paddingBottom: hp(1.7),
    backgroundColor: palette.white,
    gap: hp(0.55),
    marginTop: hp(0.7),
  },
  planCardSelected: {
    borderWidth: 2,
  },
  badge: {
    position: 'absolute',
    top: -normalize(11),
    left: wp(4),
    backgroundColor: ACCENT,
    paddingHorizontal: wp(2.8),
    paddingVertical: hp(0.4),
    borderRadius: normalize(8),
    zIndex: 2,
  },
  badgeText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10),
    textTransform: 'none',
  },
  planHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  planName: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(17),
    lineHeight: normalize(21),
    textTransform: 'uppercase',
  },
  radioOuter: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    borderWidth: 2,
    borderColor: ACCENT,
    backgroundColor: 'transparent',
  },
  radioOuterSelected: {
    backgroundColor: ACCENT,
    borderColor: ACCENT,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: hp(0.2),
  },
  price: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(26),
    lineHeight: normalize(30),
    textTransform: 'none',
  },
  priceUnit: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    marginBottom: hp(0.3),
    textTransform: 'none',
  },
  annualLine: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
  },
  annualPriceBold: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
  },
  planDescription: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(12),
    lineHeight: normalize(17),
    textTransform: 'none',
    marginTop: hp(0.25),
  },
  includesLabel: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
    marginTop: hp(0.4),
  },
  featureList: {
    gap: hp(0.75),
    marginTop: hp(0.5),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.2),
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
    fontSize: normalize(12),
    lineHeight: normalize(17),
    textTransform: 'none',
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.8),
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(16),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.5),
  },
  tipCopy: {
    flex: 1,
    gap: hp(0.3),
  },
  tipTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textTransform: 'none',
  },
  tipBody: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(12),
    lineHeight: normalize(17),
    textTransform: 'none',
  },
  continueBtn: {
    backgroundColor: ACCENT,
    borderRadius: normalize(14),
    minHeight: normalize(50),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
  },
  continueText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    textTransform: 'none',
  },
  compareBtn: {
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: normalize(14),
    minHeight: normalize(46),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    backgroundColor: palette.creme,
  },
  compareBtnText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    textTransform: 'none',
  },
});
