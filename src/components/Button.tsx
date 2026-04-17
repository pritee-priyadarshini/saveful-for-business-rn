import React from 'react';
import { Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  disabled?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  style,
  disabled = false, 
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';

  return (
    <Pressable
      onPress={disabled ? undefined : onPress} 
      style={({ pressed }) => [
        styles.button,
        isPrimary && styles.primary,
        isSecondary && styles.secondary,
        variant === 'ghost' && styles.ghost,

        pressed && !disabled && styles.pressed, 
        disabled && styles.disabled, 

        style,
      ]}
    >
      {icon ? (
        <Ionicons
          color={
            disabled
              ? '#9E9E9E'
              : isPrimary
              ? palette.surface
              : palette.primary
          }
          name={icon}
          size={18}
        />
      ) : null}

      <AppText
        variant="label"
        color={
          disabled
            ? '#9E9E9E'
            : isPrimary
            ? palette.surface
            : palette.primary
        }
        style={styles.label}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  primary: {
    backgroundColor: palette.primary,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  secondary: {
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.primary,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  pressed: {
    opacity: 0.85,
  },
  label: {
    letterSpacing: 0.2,
  },
  disabled: {
  backgroundColor: '#E5E5E5',
  borderColor: '#E5E5E5',
},
});
