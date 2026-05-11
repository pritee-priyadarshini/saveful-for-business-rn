import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, ImageBackground, Dimensions, Platform, StatusBar } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type Props = NativeStackScreenProps<AuthStackParamList, 'RoleSelection'>;

const roles = [
  {
    id: 'restaurant_single' as const,
    title: 'Food Business (Single Site)',
    icon: '🍽️',
    lines: [
      'List surplus and connect with local charities',
      'Perfect for cafes, restaurants & small venues',
    ],
  },
  {
    id: 'restaurant_multi' as const,
    title: 'Food Business (Multi-Site)',
    icon: '🍽️🍽️🍽️',
    lines: [
      'Manage surplus across multiple locations',
      'Ideal for groups, franchises & operators',
    ],
  },
  {
    id: 'charity_single' as const,
    title: 'Charity / Non-Profit (Single Location)',
    icon: '💜',
    lines: [
      'Find and collect food from nearby businesses',
      'Support your community with ease',
    ],
  },
  {
    id: 'charity_multi' as const,
    title: 'Charity / Non-Profit (Multiple Location)',
    icon: '💜💜💜',
    lines: [
      'Find and collect food from nearby businesses for charity with multiple locations',
      'Support your community groups',
    ],
  },
];

export function RoleSelectionScreen({ navigation }: Props) {
  const { selectedRole, setRole } = useAppContext();

  useEffect(() => {
    if (!selectedRole) {
      setRole('restaurant_single');
    }
  }, []);

  return (<Screen backgroundColor={palette.creme} scrollable contentStyle={{ flexGrow: 1 }}>
    {/* HEADER */}
    <ImageBackground
      source={require('../../../assets/placeholder/kale-header.png')}
      style={styles.headerBg}
      resizeMode="cover"
    >
      <AppText variant="h3" color={palette.white} style={styles.headerTitle}>
        HOW WILL YOU USE SAVEFUL FOR BUSINESS?
      </AppText>
    </ImageBackground>

    {/* CONTENT */}
    <View style={styles.content}>

      <AppText
        variant="bodyLarge"
        color={palette.primary}
        style={styles.subtitle}
      >
        Choose the option that best describes your organisation
      </AppText>

      <View style={styles.rolesContainer}>
        {roles.map((role) => {
          const active = selectedRole === role.id;

          return (
            <Pressable
              key={role.id}
              onPress={() => setRole(role.id)}
              style={[styles.card, active && styles.cardActive]}
            >
              <AppText style={styles.icon}>{role.icon}</AppText>

              <View style={styles.textContainer}>
                <AppText
                  variant="bodyBold"
                  color={palette.primary}
                  style={styles.titleText}
                >
                  {role.title}
                </AppText>

                {role.lines.map((line) => (
                  <AppText
                    key={line}
                    variant="bodyLarge"
                    color={palette.primary}
                    style={styles.cardText}
                  >
                    {line}
                  </AppText>
                ))}
              </View>
            </Pressable>
          );
        })}
      </View>

      {/* CTA */}
      <Pressable
        onPress={() => navigation.navigate('Auth')}
        style={styles.ctaButton}
      >
        <AppText variant="label" color={palette.white}>
          Continue
        </AppText>
      </Pressable>

    </View>
  </Screen>

  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  headerBg: {
    width: '100%',
    height: hp(25),
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    textAlign: 'center',
    paddingHorizontal: wp(5),
    fontSize: normalize(24),
  },

  content: {
    flexGrow: 1,
    backgroundColor: palette.white,
    paddingHorizontal: wp(5),
    paddingTop: hp(2),
    paddingBottom: hp(4),
  },

  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: hp(2),
    fontSize: normalize(16),
  },

  rolesContainer: {
    gap: hp(1.5),
  },

  card: {
    alignItems: 'center',
    paddingHorizontal: wp(5),
    paddingVertical: hp(2),
    borderRadius: normalize(20),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },

  cardActive: {
    backgroundColor: palette.lemon,
    borderColor: palette.border,
  },

  icon: {
    fontSize: normalize(36),
    marginBottom: hp(1),
    lineHeight: hp(5),
  },

  textContainer: {
    alignItems: 'center',
    gap: hp(0.8),
  },

  titleText: {
    textAlign: 'center',
    fontSize: normalize(16),
  },

  cardText: {
    opacity: 0.7,
    textAlign: 'center',
    fontSize: normalize(14),
  },

  ctaButton: {
    marginTop: hp(3),
    width: '100%',
    paddingVertical: hp(1.8),
    borderRadius: normalize(30),
    backgroundColor: palette.primary,
    alignItems: 'center',
  },
});
