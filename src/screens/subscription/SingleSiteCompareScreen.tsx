import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { Screen } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import type { RootStackParamList } from '@/navigation/AppNavigator';
import {
  SINGLE_SITE_COMPARE_SECTIONS,
  SINGLE_SITE_COMPARE_UPGRADE_POINTS,
  SINGLE_SITE_PLANS,
  SINGLE_SITE_UPGRADE_TITLE,
  getContinueLabel,
  type CompareCell,
  type SingleSitePlanId,
} from './singleSitePlans';

const ACCENT = palette.kale;
const ACCENT_SOFT = '#D8F0E0';
const ACCENT_SOFT_ALT = '#E8F6EC';
const BORDER = '#C7E4D1';

type Nav = NativeStackNavigationProp<RootStackParamList, 'SingleSiteCompare'>;
type Route = RouteProp<RootStackParamList, 'SingleSiteCompare'>;

export function SingleSiteCompareScreen() {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();

  const [selectedPlanId, setSelectedPlanId] = useState<SingleSitePlanId>(
    route.params?.selectedPlanId ?? 'single_plus',
  );

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
        <AppText color={palette.stone} style={styles.subtitle}>
          See what's included in each plan
        </AppText>

        <View style={styles.toggleWrap}>
          <Pressable
            style={[
              styles.toggleBtn,
              selectedPlanId === 'single' ? styles.toggleBtnActive : styles.toggleBtnIdle,
            ]}
            onPress={() => setSelectedPlanId('single')}
          >
            <AppText
              color={selectedPlanId === 'single' ? palette.white : palette.black}
              style={styles.toggleText}
            >
              Single Site
            </AppText>
          </Pressable>
          <Pressable
            style={[
              styles.toggleBtn,
              selectedPlanId === 'single_plus' ? styles.toggleBtnActive : styles.toggleBtnIdle,
            ]}
            onPress={() => setSelectedPlanId('single_plus')}
          >
            <AppText
              color={selectedPlanId === 'single_plus' ? palette.white : palette.black}
              style={styles.toggleText}
            >
              Single Site +
            </AppText>
          </Pressable>
        </View>

        <View style={styles.compareCard}>
          <View style={styles.priceHeader}>
            <View style={styles.storeIconWrap}>
              <Ionicons name="storefront-outline" size={normalize(30)} color={ACCENT} />
            </View>

            <View style={styles.priceColumns}>
              {SINGLE_SITE_PLANS.map((plan) => {
                const isSelected = selectedPlanId === plan.id;
                return (
                  <View
                    key={plan.id}
                    style={[styles.priceCol, isSelected && styles.priceColSelected]}
                  >
                    {plan.badge ? (
                      <View style={styles.mostPopularBadge}>
                        <AppText color={palette.white} style={styles.mostPopularText}>
                          {plan.badge}
                        </AppText>
                      </View>
                    ) : (
                      <View style={styles.badgeSpacer} />
                    )}
                    <AppText color={ACCENT} style={styles.pricePlanName}>
                      {plan.name}
                    </AppText>
                    <AppText color={ACCENT} style={styles.priceAmount}>
                      {plan.monthlyPrice}
                      <AppText color={ACCENT} style={styles.priceUnit}>
                        {' '}
                        /month
                      </AppText>
                    </AppText>
                  </View>
                );
              })}
            </View>
          </View>

          {SINGLE_SITE_COMPARE_SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <AppText color={palette.midgray} style={styles.sectionTitle}>
                {section.title}
              </AppText>

              {section.rows.map((row) => (
                <View key={row.label} style={styles.featureRow}>
                  <AppText color={palette.black} style={styles.featureLabel}>
                    {row.label}
                  </AppText>
                  <View
                    style={[
                      styles.featureValue,
                      selectedPlanId === 'single' && styles.featureValueSelected,
                    ]}
                  >
                    <CompareValue value={row.single} />
                  </View>
                  <View
                    style={[
                      styles.featureValue,
                      selectedPlanId === 'single_plus' && styles.featureValueSelected,
                    ]}
                  >
                    <CompareValue value={row.plus} />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.upgradeBox}>
          <AppText color={ACCENT} style={styles.upgradeTitle}>
            {SINGLE_SITE_UPGRADE_TITLE}
          </AppText>
          {SINGLE_SITE_COMPARE_UPGRADE_POINTS.map((point) => (
            <View key={point} style={styles.upgradeRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={normalize(12)} color={palette.white} />
              </View>
              <AppText color={palette.black} style={styles.upgradePoint}>
                {point}
              </AppText>
            </View>
          ))}
        </View>

        <Pressable
          style={({ pressed }) => [styles.continueBtn, pressed && styles.pressed]}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel={continueLabel}
        >
          <AppText color={palette.white} style={styles.continueText}>
            {continueLabel}
          </AppText>
          <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function CompareValue({ value }: { value: CompareCell }) {
  if (typeof value === 'boolean') {
    if (value) {
      return <Ionicons name="checkmark" size={normalize(20)} color={ACCENT} />;
    }
    return (
      <AppText color={palette.midgray} style={styles.dash}>
        —
      </AppText>
    );
  }

  return (
    <AppText color={ACCENT} style={styles.valueText}>
      {value}
    </AppText>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: wp(5),
    gap: hp(1.5),
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
    marginTop: -hp(0.55),
    marginBottom: hp(0.2),
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(16),
    padding: normalize(5),
    gap: wp(1.2),
  },
  toggleBtn: {
    flex: 1,
    minHeight: normalize(44),
    borderRadius: normalize(12),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  toggleBtnIdle: {
    backgroundColor: 'transparent',
  },
  toggleBtnActive: {
    backgroundColor: ACCENT,
  },
  toggleText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  compareCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(18),
    borderWidth: 1.5,
    borderColor: BORDER,
    paddingHorizontal: wp(3),
    paddingTop: hp(1.6),
    paddingBottom: hp(1.5),
    gap: hp(1.2),
  },
  priceHeader: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: wp(1.5),
    paddingBottom: hp(1.1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  storeIconWrap: {
    width: normalize(34),
    alignItems: 'center',
    paddingBottom: hp(0.35),
  },
  priceColumns: {
    flex: 1,
    flexDirection: 'row',
    gap: wp(1),
  },
  priceCol: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.25),
    paddingVertical: hp(0.45),
    paddingHorizontal: wp(1),
    borderRadius: normalize(10),
  },
  priceColSelected: {
    backgroundColor: ACCENT_SOFT_ALT,
  },
  badgeSpacer: {
    height: normalize(18),
  },
  mostPopularBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: wp(2),
    paddingVertical: hp(0.22),
    borderRadius: normalize(6),
    minHeight: normalize(18),
    justifyContent: 'center',
  },
  mostPopularText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(9),
    lineHeight: normalize(12),
    textTransform: 'none',
  },
  pricePlanName: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(11),
    lineHeight: normalize(14),
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  priceAmount: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(20),
    textTransform: 'none',
    textAlign: 'center',
  },
  priceUnit: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
  },
  section: {
    gap: hp(0.35),
  },
  sectionTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(11),
    lineHeight: normalize(15),
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: hp(0.15),
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: normalize(32),
    paddingVertical: hp(0.35),
  },
  featureLabel: {
    flex: 1.55,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textTransform: 'none',
    paddingRight: wp(1.5),
  },
  featureValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: normalize(30),
    borderRadius: normalize(8),
    paddingVertical: hp(0.2),
  },
  featureValueSelected: {
    backgroundColor: ACCENT_SOFT_ALT,
  },
  valueText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textTransform: 'none',
    textAlign: 'center',
  },
  dash: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(18),
    lineHeight: normalize(20),
  },
  upgradeBox: {
    backgroundColor: ACCENT_SOFT_ALT,
    borderRadius: normalize(16),
    paddingVertical: hp(1.7),
    paddingHorizontal: wp(4),
    gap: hp(1),
  },
  upgradeTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(20),
    textTransform: 'none',
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
  },
  checkIcon: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: hp(0.05),
  },
  upgradePoint: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(19),
    textTransform: 'none',
  },
  continueBtn: {
    backgroundColor: ACCENT,
    borderRadius: normalize(14),
    minHeight: normalize(54),
    paddingHorizontal: wp(4.5),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.2),
  },
  continueText: {
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
