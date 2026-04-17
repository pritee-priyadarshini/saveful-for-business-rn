import React, { useEffect } from 'react';
import { Pressable, StyleSheet, View, ImageBackground } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { AuthStackParamList } from '../../navigation/types';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';

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
    id: 'charity' as const,
    title: 'Charity / Non-Profit',
    icon: '💜',
    lines: [
      'Find and collect food from nearby businesses',
      'Support your community with ease',
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

  return (<Screen
    backgroundColor={palette.white}
    scrollable={false}
    contentStyle={styles.container}
  >

    {/* HEADER */}
    <ImageBackground
      source={require('../../../assets/placeholder/kale-header.png')}
      style={styles.headerBg}
      resizeMode="cover"
    >
      <AppText variant="heading" color={palette.white} style={styles.headerTitle}>
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
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },

  headerTitle: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },

  content: {
    flex: 1,
    backgroundColor: palette.white,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },

  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: spacing.lg,
  },

  rolesContainer: {
    gap: spacing.md,
  },

  card: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 20,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },

  cardActive: {
    backgroundColor: palette.creme,
    borderColor: palette.primary,
  },

  icon: {
    fontSize: 36,
    marginBottom: spacing.sm,
    lineHeight: 36,
  },

  textContainer: {
    alignItems: 'center',
    gap: 6,
  },

  titleText: {
    textAlign: 'center',
  },

  cardText: {
    opacity: 0.7,
    textAlign: 'center',
  },

  ctaButton: {
    marginTop: spacing.lg,
    width: '100%',
    paddingVertical: spacing.md,
    borderRadius: 30,
    backgroundColor: palette.primary,
    alignItems: 'center',
  },
});
