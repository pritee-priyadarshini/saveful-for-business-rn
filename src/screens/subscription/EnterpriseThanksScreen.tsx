import React from 'react';
import { View, StyleSheet, Pressable } from 'react-native';
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

const ACCENT = palette.kale;
const ACCENT_SOFT = '#E8F6EC';
const CARD_BORDER = `${palette.kale}55`;

type Nav = NativeStackNavigationProp<RootStackParamList, 'EnterpriseThanks'>;

const CHECKLIST = ['Consultation requested', 'Your details received'] as const;

export function EnterpriseThanksScreen() {
  useTransparentStatusBar('dark');
  const navigation = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { selectPlan } = useAppContext();

  const onReturn = () => {
    selectPlan('enterprise');
    const state = navigation.getState();
    const firstSubIdx = state.routes.findIndex(
      (navRoute) =>
        navRoute.name === 'MultiSitePlans' ||
        navRoute.name === 'MultiSiteConfirm' ||
        navRoute.name === 'EnterpriseConsult' ||
        navRoute.name === 'EnterpriseThanks' ||
        navRoute.name === 'RestaurantPlan',
    );
    const pops = firstSubIdx >= 0 ? state.index - firstSubIdx + 1 : 1;
    navigation.pop(Math.max(1, pops));
  };

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="dark" translucent backgroundColor="transparent" />

      <View
        style={[
          styles.container,
          {
            paddingTop: insets.top,
            paddingBottom: Math.max(insets.bottom, hp(2)),
          },
        ]}
      >
        <View style={styles.centerBlock}>
          <View style={styles.successBadge}>
            <Ionicons name="checkmark" size={normalize(28)} color={palette.white} />
          </View>

          <AppText color={palette.black} style={styles.title}>
            Thanks! We've received your request.
          </AppText>

          <AppText color={palette.stone} style={styles.body}>
            A Saveful Enterprise Specialist will contact you shortly to discuss your
            organisation's requirements and recommend the best solution for your business.
          </AppText>

          <View style={styles.statusCard}>
            {CHECKLIST.map((item, index) => (
              <View
                key={item}
                style={[
                  styles.checkRow,
                  index < CHECKLIST.length - 1 && styles.checkRowDivider,
                ]}
              >
                <View style={styles.checkIcon}>
                  <Ionicons name="checkmark" size={normalize(12)} color={palette.white} />
                </View>
                <AppText color={palette.black} style={styles.checkText}>
                  {item}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.timelineChip}>
            <Ionicons name="time-outline" size={normalize(15)} color={ACCENT} />
            <AppText color={ACCENT} style={styles.timeline}>
              We'll contact you within one business day
            </AppText>
          </View>

          <Pressable
            style={({ pressed }) => [styles.returnBtn, pressed && styles.pressed]}
            onPress={onReturn}
            accessibilityRole="button"
            accessibilityLabel="Return to dashboard"
          >
            <AppText color={ACCENT} style={styles.returnText}>
              Return to dashboard
            </AppText>
            <Ionicons name="arrow-forward" size={normalize(18)} color={ACCENT} />
          </Pressable>
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: wp(6),
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBlock: {
    width: '100%',
    maxWidth: normalize(360),
    alignItems: 'center',
    gap: hp(1.4),
  },
  successBadge: {
    width: normalize(64),
    height: normalize(64),
    borderRadius: normalize(32),
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: hp(0.4),
  },
  title: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(24),
    lineHeight: normalize(30),
    textAlign: 'center',
    textTransform: 'none',
  },
  body: {
    fontFamily: 'Saveful-Regular',
    fontSize: normalize(13),
    lineHeight: normalize(19),
    textAlign: 'center',
    textTransform: 'none',
    paddingHorizontal: wp(1),
  },
  statusCard: {
    width: '100%',
    backgroundColor: ACCENT_SOFT,
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: CARD_BORDER,
    paddingHorizontal: wp(4),
    paddingVertical: hp(0.4),
    marginTop: hp(0.25),
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingVertical: hp(1.05),
  },
  checkRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: `${palette.kale}33`,
  },
  checkIcon: {
    width: normalize(22),
    height: normalize(22),
    borderRadius: normalize(11),
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    flex: 1,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(14),
    lineHeight: normalize(18),
    textTransform: 'none',
  },
  timelineChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.8),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: CARD_BORDER,
    borderRadius: normalize(20),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.75),
  },
  timeline: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
    lineHeight: normalize(16),
    textTransform: 'none',
  },
  returnBtn: {
    marginTop: hp(0.6),
    width: '100%',
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderRadius: normalize(12),
    minHeight: normalize(52),
    paddingHorizontal: wp(4),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: palette.white,
  },
  returnText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    lineHeight: normalize(19),
    textTransform: 'none',
    flex: 1,
    paddingRight: wp(2),
  },
  pressed: {
    opacity: 0.88,
  },
});
