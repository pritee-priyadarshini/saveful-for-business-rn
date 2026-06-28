import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { FullBleedBackground } from '../../components/FullBleedBackground';
import { AuthStackParamList } from '../../navigation/types';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, wp } from '@/utils/responsive';
import { palette } from '../../theme/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  useTransparentStatusBar('light');

  return (
    <FullBleedBackground source={require('../../../assets/intro/splash_logo.png')}>
      <Screen
        backgroundColor="transparent"
        scrollable={false}
        transparentTop
        contentStyle={{
          ...styles.content,
          paddingTop: insets.top + hp(2),
          paddingBottom: insets.bottom + hp(2),
        }}
      >
        <StatusBar style="light" translucent backgroundColor="transparent" />

        <View style={styles.topSection}>

          {/* <View style={styles.headerTop}>
            <Image
              source={require('../../../assets/intro/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View> */}

          <View style={styles.centerText}>
            <AppText variant="heading" color={palette.primary} style={styles.heading}>
              Ready to save and share good food?
            </AppText>

            <AppText variant="bodyLarge" color={palette.primary}>
              List surplus or find food ready for collection.
            </AppText>

            <AppText variant="bodyLarge" color={palette.primary}>
              Saveful connects businesses and charities to help good food go further.
            </AppText>
          </View>

          <View style={styles.buttonContainer}>

            <Pressable
              onPress={() => navigation.navigate('RoleSelectionMain')}
              style={styles.primaryButton}
            >
              <AppText variant="h7" style={styles.primaryButtonText}>
                Get Started
              </AppText>
            </Pressable>

            <Pressable
              onPress={() => navigation.navigate('SignIn')}
              style={styles.secondaryButton}
            >
              <AppText variant="bodyLarge" style={styles.secondaryButtonText}>
                Already have an account?
              </AppText>
              <AppText variant="bodyLarge" style={styles.secondaryButtonText}>
                Log in
              </AppText>
            </Pressable>

          </View>
        </View>

      </Screen>
    </FullBleedBackground>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: wp(6),
  },

  topSection: {
    flex: 1,
    alignItems: 'center',
  },

  headerTop: {
    alignItems: 'center',
    marginTop: hp(3),
    gap: hp(0.5),
  },

  centerText: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: hp(2),
    paddingHorizontal: wp(4),
  },

  logo: {
    width: wp(50),
    height: hp(10),
  },

  subText: {
    textAlign: 'center',
    fontSize: normalize(14),
  },

  heading: {
    textAlign: 'center',
    fontSize: normalize(26),
  },

  buttonContainer: {
    marginTop: hp(2),
    width: '100%',
    alignItems: 'center',
    gap: hp(1.5),
  },

  primaryButton: {
    backgroundColor: palette.eggplant, 
    width: '100%',
    paddingVertical: hp(1.8),
    borderRadius: normalize(30), 
    alignItems: 'center',
  },

  primaryButtonText: {
    color: palette.white,
    fontSize: normalize(18),
  },

  secondaryButton: {
    backgroundColor: palette.white,
    width: '100%',
    paddingVertical: hp(1.8),
    borderRadius: normalize(30),
    borderColor: palette.border,
    borderWidth: 1,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: palette.black,
    fontSize: normalize(16),
  },

});