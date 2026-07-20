import React from 'react';
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
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  MULTI_SITE_INTRO,
  MULTI_SITE_PLANS,
  MULTI_SITE_SUCCESS_BANNER,
  MULTI_SITE_TRUST_POINTS,
  type MultiSitePlan,
} from './multiSitePlans';

const ACCENT = palette.kale;
const ACCENT_SOFT = '#E8F6EC';

type Nav = NativeStackNavigationProp<RootStackParamList, 'MultiSitePlans'>;

export function MultiSitePlansScreen() {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  const onPlanAction = (plan: MultiSitePlan) => {
    if (plan.id === 'enterprise') {
      navigation.navigate('EnterpriseConsult');
      return;
    }
    navigation.navigate('MultiSiteConfirm');
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
          Choose your plan
        </AppText>

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

        {MULTI_SITE_PLANS.map((plan) => (
          <PlanCard key={plan.id} plan={plan} onPress={() => onPlanAction(plan)} />
        ))}

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
      </ScrollView>
    </Screen>
  );
}

function PlanCard({
  plan,
  onPress,
}: {
  plan: MultiSitePlan;
  onPress: () => void;
}) {
  const isOutline = plan.ctaVariant === 'outline';

  return (
    <View style={styles.planCard}>
      <AppText
        color={plan.nameAccent ? ACCENT : palette.black}
        style={styles.planName}
      >
        {plan.name}
      </AppText>

      {plan.customPricing ? (
        <AppText color={palette.black} style={styles.customPrice}>
          {plan.monthlyPrice}
        </AppText>
      ) : (
        <>
          <View style={styles.priceRow}>
            <AppText color={palette.black} style={styles.price}>
              {plan.monthlyPrice}
            </AppText>
            <AppText color={palette.black} style={styles.priceUnit}>
              {' '}
              {plan.monthlySuffix}
            </AppText>
          </View>
          {plan.annualPrice ? (
            <AppText color={palette.midgray} style={styles.annualLine}>
              or{' '}
              <AppText color={ACCENT} style={styles.annualPriceBold}>
                {plan.annualPrice}
              </AppText>
              {' '}
              annually ({plan.annualNote})
            </AppText>
          ) : null}
        </>
      )}

      <AppText color={palette.midgray} style={styles.description}>
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

      <Pressable
        style={({ pressed }) => [
          isOutline ? styles.outlineBtn : styles.solidBtn,
          pressed && styles.pressed,
        ]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={plan.primaryCta}
      >
        <AppText
          color={isOutline ? ACCENT : palette.white}
          style={styles.ctaText}
        >
          {plan.primaryCta}
        </AppText>
        <Ionicons
          name="arrow-forward"
          size={normalize(18)}
          color={isOutline ? ACCENT : palette.white}
        />
      </Pressable>
    </View>
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
