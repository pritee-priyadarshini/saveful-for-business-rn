import React, { useMemo } from 'react';
import {
  Image,
  ImageSourcePropType,
  Pressable,
  StyleSheet,
  View,
  ScrollView,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { HeroHeader } from '../../components/HeroHeader';
import { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../store/AppContext';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { palette } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleReady'>;

type NextStep = {
  image: ImageSourcePropType;
  title: string;
  description: string;
};

type Audience = 'restaurant' | 'charity' | 'farm_producer' | 'farmer';

function resolveAudience(role: string | null | undefined): Audience {
  if (role === 'charity_single' || role === 'charity_multi') return 'charity';
  if (role === 'farm_business') return 'farm_producer';
  if (role === 'farmer') return 'farmer';
  return 'restaurant';
}

const sharedSteps: NextStep[] = [
  {
    image: require('../../../assets/intro/welcome_feed_communities.png'),
    title: 'Complete your profile',
    description: 'Add a few details to get started',
  },
  {
    image: require('../../../assets/placeholder/charity_green.png'),
    title: 'Verify who you are',
    description: 'Quick verification builds trust in the community',
  },
];

const thirdStepByAudience: Record<Audience, NextStep> = {
  restaurant: {
    image: require('../../../assets/intro/welcome_reduce_waste.png'),
    title: 'Start listing surplus food',
    description:
      'List surplus food for redistribution to communities, and reduce waste from your business',
  },
  charity: {
    image: require('../../../assets/intro/welcome_connect_locally.png'),
    title: 'Start browsing and collecting',
    description:
      'Find nearby surplus food listings and arrange collections to support your community',
  },
  farm_producer: {
    image: require('../../../assets/intro/welcome_reduce_waste.png'),
    title: 'Start listing farm surplus',
    description:
      'List produce and food not fit for human consumption for redistribution or farm livestock feed',
  },
  farmer: {
    image: require('../../../assets/placeholder/farmhouse.png'),
    title: 'Start collecting livestock feed',
    description:
      'Find food not suitable for human consumption to feed farm livestock near you',
  },
};

export function RoleReadyScreen({ navigation }: Props) {
  useTransparentStatusBar('light');
  const insets = useSafeAreaInsets();
  const { selectedRole } = useAppContext();
  const r = useResponsiveLayout();

  const nextSteps = useMemo(() => {
    const audience = resolveAudience(selectedRole);
    return [...sharedSteps, thirdStepByAudience[audience]];
  }, [selectedRole]);

  const iconSize = r.isTablet ? 56 : normalize(52);

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop contentStyle={styles.screenContent}>
      <StatusBar style="light" translucent backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={[
          styles.scrollInner,
          r.isTablet && { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
      <HeroHeader
        source={require('../../../assets/placeholder/kale-headera.png')}
        height={r.isTablet ? Math.min(r.height * 0.14, 140) : hp(16)}
        padContentRight={false}
        contentStyle={styles.heroContent}
      />

      <View
        style={[
          styles.mainCard,
          r.isTablet && {
            maxWidth: r.contentMaxWidth,
            width: '100%',
            alignSelf: 'center',
            marginHorizontal: r.pagePadH,
            marginTop: r.isLandscape ? 24 : 40,
            paddingHorizontal: 28,
            paddingTop: 36,
            paddingBottom: 28,
          },
        ]}
      >
        <View style={styles.titleBlock}>
          <AppText
            variant="h4"
            color={palette.black}
            style={[styles.title, r.isTablet && { fontSize: r.font(28, 30, 32) }]}
          >
            What happens next?
          </AppText>
        </View>

        <View style={styles.stepsSection}>
          {nextSteps.map((step) => (
            <View key={step.title} style={styles.stepRow}>
              <View
                style={[
                  styles.stepIconWrap,
                  {
                    width: iconSize,
                    height: iconSize,
                    borderRadius: iconSize / 2,
                  },
                ]}
              >
                <Image
                  source={step.image}
                  style={{ width: iconSize * 0.88, height: iconSize * 0.88 }}
                  resizeMode="contain"
                />
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
          style={[
            styles.continueButton,
            r.isTablet && {
              minHeight: 48,
              paddingVertical: 12,
              width: '100%',
              alignSelf: 'stretch',
            },
          ]}
          onPress={() => navigation.navigate('Auth')}
        >
          <AppText variant="bodyBold" color={palette.white} style={styles.continueText}>
            CONTINUE
          </AppText>
          <View style={styles.continueArrow}>
            <Ionicons name="arrow-forward" size={16} color={palette.white} />
          </View>
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
  heroContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainCard: {
    marginTop: hp(5),
    marginHorizontal: wp(4),
    backgroundColor: palette.creme,
    borderRadius: normalize(16),
    borderWidth: normalize(1),
    borderColor: palette.middlegreen,
    paddingHorizontal: wp(4.5),
    paddingTop: hp(5),
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

  stepsSection: {
    gap: hp(1.8),
    paddingTop: hp(0.5),
    borderTopWidth: normalize(1),
    borderTopColor: '#EFEFEF',
  },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3.5),
  },

  stepIconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    backgroundColor: palette.white,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.strokecream,
  },

  stepTextWrap: {
    flex: 1,
    minWidth: 0,
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
    gap: 10,
    minHeight: 48,
    paddingHorizontal: wp(4),
    paddingVertical: 12,
  },

  continueArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  continueText: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
