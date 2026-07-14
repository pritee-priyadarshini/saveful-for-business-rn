import React from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, wp } from '@/utils/responsive';
import { palette } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const valueProps = [
  {
    image: require('../../../assets/intro/welcome_reduce_waste.png'),
    label: 'SAVE FOOD',
  },
  {
    image: require('../../../assets/intro/welcome_feed_communities.png'),
    label: 'FEED COMMUNITIES',
  },
  {
    image: require('../../../assets/intro/welcome_connect_locally.png'),
    label: 'CONNECT LOCALLY',
  },
];

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  useTransparentStatusBar('dark');

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={[styles.topAccent, { backgroundColor: palette.middlegreen }]} />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + hp(1.5),
            paddingBottom: insets.bottom + hp(2),
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View style={styles.header}>
          <Image
            source={require('../../../assets/intro/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <AppText variant="h5" color={palette.primary} style={styles.heading}>
            HELP GOOD FOOD GO FURTHER
          </AppText>

          <AppText variant="body1" color={palette.textMuted} style={styles.subtitle}>
            List surplus or find food ready for collection.{'\n'}
            Saveful connects businesses, charities and farmers to help good food go further.
          </AppText>
        </View>

        <View style={styles.illustrationFrame}>
          <Image
            source={require('../../../assets/intro/welcome_hero.png')}
            style={styles.heroIllustration}
            resizeMode="cover"
          />
        </View>

        <View style={styles.actionPanel}>
          <View style={styles.valuePropRow}>
            {valueProps.map((item) => (
              <View key={item.label} style={styles.valuePropItem}>
                <Image source={item.image} style={styles.valuePropImage} resizeMode="contain" />
                <AppText variant="caption" color={palette.textMuted} style={styles.valuePropLabel}>
                  {item.label}
                </AppText>
              </View>
            ))}
          </View>

          <Pressable
            onPress={() => navigation.navigate('RoleSelectionMain')}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
          >
            <AppText variant="bodyBold" style={styles.primaryButtonText}>
              Get Started
            </AppText>
            <Ionicons name="arrow-forward" size={normalize(20)} color={palette.white} />
          </Pressable>

          <View style={styles.loginRow}>
            <AppText variant="bodySmall" color={palette.textMuted} style={styles.loginPrompt}>
              Already have an account?
            </AppText>
            <Pressable
              onPress={() => navigation.navigate('SignIn')}
              hitSlop={8}
              style={({ pressed }) => pressed && styles.buttonPressed}
            >
              <AppText variant="bodyBold" color={palette.primary} style={styles.loginLink}>
                Log in
              </AppText>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topAccent: {
    width: '100%',
    height: hp(0.35),
  },

  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: wp(5),
    gap: hp(1.5),
  },

  header: {
    alignItems: 'center',
    gap: hp(1.2),
    paddingHorizontal: wp(2),
  },

  logo: {
    width: wp(46),
    height: hp(7),
  },

  heading: {
    textAlign: 'center',
    fontSize: normalize(24),
    lineHeight: normalize(30),
    textTransform: 'none',
    letterSpacing: 0.1,
  },

  subtitle: {
    textAlign: 'center',
    fontSize: normalize(15),
    lineHeight: normalize(22),
    maxWidth: wp(88),
    textTransform: 'none',
  },

  illustrationFrame: {
    width: '100%',
    height: hp(28),
    borderRadius: normalize(20),
    borderWidth: normalize(6),
    borderColor: palette.creme2,
    backgroundColor: palette.creme2,
    overflow: 'hidden',
    marginVertical: hp(0.5),
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },

  heroIllustration: {
    width: '100%',
    height: '100%',
  },

  actionPanel: {
    backgroundColor: palette.white,
    borderRadius: normalize(24),
    borderWidth: 1,
    borderColor: palette.strokecream,
    paddingHorizontal: wp(5),
    paddingTop: hp(2.2),
    paddingBottom: hp(2),
    gap: hp(1.8),
    marginTop: hp(0.5),
    ...Platform.select({
      ios: {
        shadowColor: palette.black,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  valuePropRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: wp(2),
  },

  valuePropItem: {
    flex: 1,
    alignItems: 'center',
    gap: hp(0.6),
  },

  valuePropImage: {
    width: normalize(64),
    height: normalize(64),
  },

  valuePropLabel: {
    textAlign: 'center',
    fontSize: normalize(12),
    lineHeight: normalize(13),
    letterSpacing: 0.3,
  },

  primaryButton: {
    backgroundColor: palette.eggplant,
    width: '100%',
    minHeight: normalize(52),
    paddingVertical: hp(1.6),
    paddingHorizontal: wp(5),
    borderRadius: normalize(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    ...Platform.select({
      ios: {
        shadowColor: palette.eggplant,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  primaryButtonText: {
    color: palette.white,
    fontSize: normalize(16),
    textTransform: 'none',
    letterSpacing: 0.2,
  },

  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: wp(1.5),
  },

  loginPrompt: {
    fontSize: normalize(14),
    textTransform: 'none',
  },

  loginLink: {
    fontSize: normalize(14),
    textTransform: 'none',
    textDecorationLine: 'underline',
  },

  buttonPressed: {
    opacity: 0.85,
  },
});
