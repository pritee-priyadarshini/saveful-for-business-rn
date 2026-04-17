import React from 'react';
import { Pressable, StyleSheet, View, Image, ImageBackground } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

type Props = NativeStackScreenProps<AuthStackParamList, 'Welcome'>;

export function WelcomeScreen({ navigation }: Props) {
  return (
    <ImageBackground
      source={require('../../../assets/intro/splash.png')}
      style={styles.background}
      resizeMode="cover"
    >
      <Screen backgroundColor="transparent" contentStyle={styles.content}>

        <View style={styles.topSection}>

          <View style={styles.headerTop}>
            <Image
              source={require('../../../assets/intro/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

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
              onPress={() => navigation.navigate('RoleSelection')}
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
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },

  topSection: {
    flex: 1,
    alignItems: 'center',
  },

  headerTop: {
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: spacing.xs,
  },

  centerText: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
  },

  logo: {
    width: 160,
    height: 80,
  },

  subText: {
    textAlign: 'center',
  },

  heading: {
    textAlign: 'center',
  },

  buttonContainer: {
    marginTop: spacing.lg,
    width: '100%',
    alignItems: 'center',
    gap: spacing.md,
  },

  primaryButton: {
    backgroundColor: palette.eggplant, 
    width: '100%',
    paddingVertical: 14,
    borderRadius: 30, 
    alignItems: 'center',
  },

  primaryButtonText: {
    color: palette.white,
  },

  secondaryButton: {
    backgroundColor: palette.white,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: palette.black,
  },

});