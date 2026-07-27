import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'compact';
  icon?: keyof typeof Ionicons.glyphMap;
  style?: ViewStyle;
  /** Overrides label/icon color when enabled. */
  textColor?: string;
  disabled?: boolean;
  loading?: boolean;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  style,
  textColor,
  disabled = false,
  loading = false,
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isDisabled = disabled || loading;
  const isCompact = size === 'compact';
  const enabledColor = textColor ?? (isPrimary ? palette.surface : palette.primary);
  const contentColor = isDisabled ? '#9E9E9E' : enabledColor;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      style={({ pressed }) => [
        styles.button,
        isCompact && styles.compact,
        isPrimary && styles.primary,
        variant === 'secondary' && styles.secondary,
        variant === 'ghost' && styles.ghost,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={contentColor} size="small" />
      ) : icon ? (
        <Ionicons color={contentColor} name={icon} size={18} />
      ) : null}

      <AppText
        variant={isCompact ? 'label' : 'bodyBold'}
        color={contentColor}
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
  compact: {
    minHeight: 38,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
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
