import React from 'react';
import {
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

const valueProps = [
  {
    image: require('../../../assets/intro/welcome_reduce_waste.png'),
    label: 'SAVE \n FOOD',
  },
  {
    image: require('../../../assets/intro/welcome_feed_communities.png'),
    label: 'FEED \n COMMUNITIES',
  },
  {
    image: require('../../../assets/intro/welcome_connect_locally.png'),
    label: 'CONNECT \n LOCALLY',
  },
];

/**
 * Phone: original layout (unchanged).
 * Tablet: ProfileScreen-style — pad + fill usable width (contentMaxWidth).
 */
export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const r = useResponsiveLayout();
  useTransparentStatusBar('dark');

  const { isTablet, isLargeTablet, contentMaxWidth, pagePadH, height } = r;
  const heroH = Math.min(height * (r.isLandscape ? 0.36 : 0.32), isLargeTablet ? 360 : 320);

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View
        style={[
          styles.topAccent,
          { backgroundColor: palette.middlegreen },
          isTablet && { height: 3 },
        ]}
      />

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + (isTablet ? spacing.md : hp(1.5)),
            paddingBottom: insets.bottom + (isTablet ? spacing.lg : hp(2)),
          },
          isTablet && {
            paddingHorizontal: pagePadH,
            gap: spacing.md,
            justifyContent: 'flex-start',
          },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View
          style={
            isTablet
              ? { width: '100%', maxWidth: contentMaxWidth, alignSelf: 'center', gap: spacing.md }
              : undefined
          }
        >
          <View style={[styles.header, isTablet && styles.headerTablet]}>
            <Image
              source={require('../../../assets/intro/logo.png')}
              style={[styles.logo, isTablet && { width: 176, height: 54 }]}
              resizeMode="contain"
            />

            <AppText
              variant="h5"
              color={palette.primary}
              style={[
                styles.heading,
                isTablet && {
                  fontSize: r.font(24, 28, 30),
                  lineHeight: r.font(30, 34, 38),
                },
              ]}
            >
              HELP GOOD FOOD GO FURTHER
            </AppText>

            <AppText
              variant="body1"
              color={palette.textMuted}
              style={[
                styles.subtitle,
                isTablet && {
                  fontSize: r.font(15, 16, 16),
                  lineHeight: r.font(22, 24, 24),
                  maxWidth: '100%',
                },
              ]}
            >
              List surplus or find food ready for collection.{'\n'}
              Saveful connects businesses, charities and farmers to help good food go further.
            </AppText>
          </View>

          <View
            style={[
              styles.illustrationFrame,
              isTablet && {
                height: heroH,
                borderRadius: 20,
                borderWidth: 6,
                marginVertical: 0,
              },
            ]}
          >
            <Image
              source={require('../../../assets/intro/welcome_hero.png')}
              style={styles.heroIllustration}
              resizeMode="cover"
            />
          </View>

          <View style={[styles.actionPanel, isTablet && styles.actionPanelTablet]}>
            <View style={[styles.valuePropRow, isTablet && { gap: spacing.md }]}>
              {valueProps.map((item) => (
                <View key={item.label} style={[styles.valuePropItem, { minWidth: 0 }]}>
                  <Image
                    source={item.image}
                    style={[styles.valuePropImage, isTablet && { width: 68, height: 68 }]}
                    resizeMode="contain"
                  />
                  <AppText
                    variant="caption"
                    color={palette.textMuted}
                    style={[
                      styles.valuePropLabel,
                      isTablet && { fontSize: 13, lineHeight: 17, letterSpacing: 0.4 },
                    ]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </AppText>
                </View>
              ))}
            </View>

            <Pressable
              onPress={() => navigation.navigate('RoleSelectionMain')}
              style={({ pressed }) => [
                styles.primaryButton,
                isTablet && styles.primaryButtonTablet,
                pressed && styles.buttonPressed,
              ]}
            >
              <AppText variant="bodyBold" style={styles.primaryButtonText}>
                Get Started
              </AppText>
              <View style={styles.primaryButtonArrow}>
                <Ionicons name="arrow-forward" size={16} color={palette.white} />
              </View>
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

  headerTablet: {
    gap: spacing.sm,
    paddingHorizontal: 0,
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

  actionPanelTablet: {
    borderRadius: 24,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.lg,
    marginTop: 0,
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
    minWidth: 0,
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
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    borderRadius: normalize(14),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
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

  primaryButtonTablet: {
    minHeight: 48,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 420,
    alignSelf: 'center',
  },

  primaryButtonArrow: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
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
