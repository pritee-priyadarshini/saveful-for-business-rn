import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { AuthStackParamList } from '../../navigation/types';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, wp } from '@/utils/responsive';
import { palette } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleReady'>;

const nextSteps = [
  {
    icon: 'person-outline' as const,
    title: 'Complete your profile',
    description: 'Add a few details to get started',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Verify who you are',
    description: 'Quick verification builds trust in the community',
  },
  {
    icon: 'search-outline' as const,
    title: 'Start listing or browsing',
    description:
      'List surplus food for redistribution to communities and/or food not fit for human consumption for farm livestock feed',
  },
];

export function RoleReadyScreen({ navigation }: Props) {
  useTransparentStatusBar('light');

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop contentStyle={styles.screenContent}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.scrollInner} showsVerticalScrollIndicator={false}>
      <View style={[styles.topAccent, { backgroundColor: palette.middlegreen }]} />
      <HeroHeader
        source={require('../../../assets/intro/confetti-bg.png')}
        padContentRight={false}
        contentStyle={styles.heroContent}
      />

      <View style={styles.mainCard}>
        <View style={styles.titleBlock}>
          <AppText variant="h4" color={palette.black} style={styles.title}>
            You're all set!
          </AppText>
          <AppText variant="bodyBold" color={palette.black} style={styles.subtitle}>
            Let's start making a difference together
          </AppText>
        </View>

        <View style={styles.stepsSection}>
          <AppText variant="h8" color={palette.black} style={styles.cardTitle}>
            What happens next?
          </AppText>

          {nextSteps.map((step) => (
            <View key={step.title} style={styles.stepRow}>
              <View style={styles.stepIconWrap}>
                <Ionicons name={step.icon} size={normalize(32)} color={palette.kale} />
              </View>
              <View style={styles.stepTextWrap}>
                <AppText variant="label" color={palette.black} style={styles.stepTitle}>
                  {step.title}
                </AppText>
                <AppText variant="bodyBold" color={palette.midgray} style={styles.stepDescription}>
                  {step.description}
                </AppText>
              </View>
            </View>
          ))}
        </View>

        <Pressable
          style={styles.continueButton}
          onPress={() => navigation.navigate('Auth')}
        >
          <AppText variant="bodyBold" color={palette.white} style={styles.continueText}>
            CONTINUE
          </AppText>
          <Ionicons name="arrow-forward" size={normalize(20)} color={palette.white} />
        </Pressable>
      </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    backgroundColor: palette.creme,
  },
  scrollInner: {
    flexGrow: 1,
    paddingBottom: hp(3),
  },
  topAccent: {
    width: '100%',
    height: hp(0.35),
  },
  heroContent: {
    justifyContent: 'flex-end',
    paddingBottom: hp(3),
  },
  mainCard: {
    marginTop: hp(1),
    marginHorizontal: wp(4),
    backgroundColor: palette.creme,
    borderRadius: normalize(16),
    borderWidth: normalize(1),
    borderColor: palette.middlegreen,
    paddingHorizontal: wp(4.5),
    paddingTop: hp(3.5),
    paddingBottom: hp(2.5),
    gap: hp(2),
  },

  titleBlock: {
    alignItems: 'center',
    gap: hp(0.6),
  },

  title: {
    textTransform: 'none',
    textAlign: 'center',
  },

  subtitle: {
    textTransform: 'none',
    textAlign: 'center',
    lineHeight: normalize(22),
    paddingVertical: hp(1),
  },

  stepsSection: {
    gap: hp(1.8),
    paddingTop: hp(0.5),
    borderTopWidth: normalize(1),
    borderTopColor: '#EFEFEF',
  },

  cardTitle: {
    textAlign: 'center',
    textTransform: 'none',
    marginVertical: hp(2),
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(3),
  },

  stepIconWrap: {
    width: wp(11),
    height: wp(11),
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  stepTextWrap: {
    flex: 1,
    gap: hp(0.3),
  },

  stepTitle: {
    textTransform: 'none',
    lineHeight: normalize(20),
  },

  stepDescription: {
    textTransform: 'none',
    lineHeight: normalize(18),
    marginBottom: hp(1.5),
    color: palette.stone,

  },

  continueButton: {
    marginTop: hp(0.5),
    backgroundColor: palette.middlegreen,
    borderRadius: normalize(10),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.5),
  },

  continueText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
