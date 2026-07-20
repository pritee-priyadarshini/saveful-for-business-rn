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
import { useAppContext } from '@/store/AppContext';
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
const ACCENT_SOFT = `${palette.mint}66`;

type Nav = NativeStackNavigationProp<RootStackParamList, 'SingleSiteCompare'>;
type Route = RouteProp<RootStackParamList, 'SingleSiteCompare'>;

export function SingleSiteCompareScreen() {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { selectPlan } = useAppContext();

  const [selectedPlanId, setSelectedPlanId] = useState<SingleSitePlanId>(
    route.params?.selectedPlanId ?? 'single_plus',
  );

  const continueLabel = getContinueLabel(selectedPlanId);

  const onContinue = () => {
    selectPlan(selectedPlanId);
    navigation.pop(2);
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
          See what's included in each plan
        </AppText>

        <View style={styles.toggleWrap}>
          <Pressable
            style={[styles.toggleBtn, selectedPlanId === 'single' && styles.toggleBtnActive]}
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
            style={[styles.toggleBtn, selectedPlanId === 'single_plus' && styles.toggleBtnActive]}
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

        <View style={styles.priceCard}>
          <Ionicons name="storefront-outline" size={normalize(28)} color={ACCENT} />
          <View style={styles.priceColumns}>
            {SINGLE_SITE_PLANS.map((plan, index) => (
              <React.Fragment key={plan.id}>
                {index > 0 ? <View style={styles.priceDivider} /> : null}
                <View style={styles.priceCol}>
                  <AppText color={ACCENT} style={styles.pricePlanName}>
                    {plan.name}
                  </AppText>
                  <AppText color={ACCENT} style={styles.priceAmount}>
                    {plan.monthlyPrice}{' '}
                    <AppText color={ACCENT} style={styles.priceUnit}>
                      /month
                    </AppText>
                  </AppText>
                </View>
              </React.Fragment>
            ))}
          </View>
        </View>

        {SINGLE_SITE_COMPARE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <AppText color={palette.midgray} style={styles.sectionTitle}>
              {section.title}
            </AppText>

            {section.title === 'USERS' ? (
              <View style={styles.usersHeaderRow}>
                <View style={styles.usersSpacer} />
                <View style={styles.usersBadgeCol}>
                  <View style={styles.mostPopularBadge}>
                    <AppText color={palette.white} style={styles.mostPopularText}>
                      Most Popular
                    </AppText>
                  </View>
                </View>
              </View>
            ) : null}

            {section.rows.map((row) => (
              <View key={row.label} style={styles.featureRow}>
                <AppText color={palette.black} style={styles.featureLabel}>
                  {row.label}
                </AppText>
                <View style={styles.featureValue}>
                  <CompareValue value={row.single} />
                </View>
                <View style={styles.featureValue}>
                  <CompareValue value={row.plus} />
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.upgradeBox}>
          <AppText color={ACCENT} style={styles.upgradeTitle}>
            {SINGLE_SITE_UPGRADE_TITLE}
          </AppText>
          {SINGLE_SITE_COMPARE_UPGRADE_POINTS.map((point) => (
            <View key={point} style={styles.upgradeRow}>
              <View style={styles.checkIcon}>
                <Ionicons name="checkmark" size={normalize(11)} color={palette.white} />
              </View>
              <AppText color={palette.black} style={styles.upgradePoint}>
                {point}
              </AppText>
            </View>
          ))}
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
      </ScrollView>
    </Screen>
  );
}

function CompareValue({ value }: { value: CompareCell }) {
  if (typeof value === 'boolean') {
    if (value) {
      return <Ionicons name="checkmark" size={normalize(18)} color={ACCENT} />;
    }
    return (
      <AppText color={ACCENT} style={styles.dash}>
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
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(18),
    textAlign: 'center',
    textTransform: 'none',
    marginTop: -hp(0.3),
    marginBottom: hp(0.4),
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(12),
    padding: normalize(4),
    gap: wp(1),
  },
  toggleBtn: {
    flex: 1,
    minHeight: normalize(40),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(2),
  },
  toggleBtnActive: {
    backgroundColor: ACCENT,
  },
  toggleText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    textTransform: 'none',
  },
  priceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: `${palette.kale}33`,
    borderRadius: normalize(14),
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.5),
  },
  priceColumns: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  priceDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: `${palette.kale}44`,
    marginHorizontal: wp(2),
  },
  priceCol: {
    flex: 1,
    gap: hp(0.25),
  },
  pricePlanName: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(11),
    lineHeight: normalize(14),
    textTransform: 'uppercase',
  },
  priceAmount: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  priceUnit: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    textTransform: 'none',
  },
  section: {
    gap: hp(0.7),
    marginTop: hp(0.4),
  },
  sectionTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(12),
    lineHeight: normalize(15),
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  usersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: -hp(0.2),
  },
  usersSpacer: {
    flex: 1.5,
  },
  usersBadgeCol: {
    flex: 1,
    alignItems: 'center',
  },
  mostPopularBadge: {
    backgroundColor: ACCENT,
    paddingHorizontal: wp(2.5),
    paddingVertical: hp(0.35),
    borderRadius: normalize(8),
  },
  mostPopularText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(10),
    textTransform: 'none',
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: hp(0.55),
  },
  featureLabel: {
    flex: 1.5,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(17),
    textTransform: 'none',
    paddingRight: wp(2),
  },
  featureValue: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    textTransform: 'none',
    textAlign: 'center',
  },
  dash: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(18),
  },
  upgradeBox: {
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(16),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(4),
    gap: hp(0.9),
    marginTop: hp(0.4),
  },
  upgradeTitle: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  upgradeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
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
  upgradePoint: {
    flex: 1,
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  continueBtn: {
    backgroundColor: ACCENT,
    borderRadius: normalize(14),
    minHeight: normalize(52),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: hp(0.4),
  },
  continueText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(15),
    textTransform: 'none',
    flex: 1,
    paddingRight: wp(2),
  },
});
