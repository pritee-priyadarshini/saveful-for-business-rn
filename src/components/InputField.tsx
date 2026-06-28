import React, { useState, useRef } from 'react';
import { KeyboardTypeOptions, StyleSheet, TextInput, View, Pressable, FocusEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';
import { typography } from '../theme/typography';
import { scaleFont } from '../theme/fontScale';

type LabelVariant = keyof typeof typography;

type InputFieldProps = {
  label: string;
  placeholder?: string;
  value?: string;
  onChangeText?: (value: string) => void;
  editable?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
  isPassword?: boolean;
  compact?: boolean;
  optional?: boolean;
  labelVariant?: LabelVariant;
  onFieldFocus?: (field: View) => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
};

export function InputField({
  label,
  placeholder,
  value = '',
  onChangeText = () => {},
  editable,
  multiline,
  secureTextEntry,
  isPassword,
  compact = false,
  optional = false,
  labelVariant = 'bodyBold',
  onFieldFocus,
  keyboardType,
  autoCapitalize,
  autoCorrect,
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<View>(null);

  const [hidden, setHidden] = useState(secureTextEntry);

  const handleFocus = (_e: FocusEvent) => {
    setIsFocused(true);
    if (containerRef.current) {
      onFieldFocus?.(containerRef.current);
    }
  };

  return (
    <View ref={containerRef} style={styles.container}>
      <AppText
        variant={labelVariant}
        color={compact ? palette.black : palette.textMuted}
        style={[compact && styles.labelCompact]}
      >
        {label}
        {optional ? ' (optional)' : ''}
      </AppText>

      <View style={styles.inputWrapper}>
        <TextInput
          multiline={multiline}
          editable={editable}
          secureTextEntry={isPassword ? hidden : secureTextEntry}
          placeholder={placeholder}
          placeholderTextColor={palette.stone}
          style={[
            styles.input,
            compact && styles.inputCompact,
            multiline && styles.multiline,
            isFocused && styles.inputFocused, 
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
        />

        {/* 👁 Eye icon */}
        {isPassword && (
          <Pressable
            style={styles.eye}
            onPress={() => setHidden((prev) => !prev)}
          >
            <Ionicons
              name={hidden ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color={palette.textMuted}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },

  labelCompact: {
    textTransform: 'none',
    color: palette.black,
  },

  inputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },

  input: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    paddingRight: 45,
    color: palette.text,
    fontSize: scaleFont(16),
  },

  inputCompact: {
    minHeight: 44,
    borderRadius: 10,
    borderColor: '#D9D9D9',
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    fontSize: scaleFont(14),
  },

  eye: {
    position: 'absolute',
    right: 15,
  },

  inputFocused: {
    borderColor: palette.primary, 
  },

  multiline: {
    minHeight: 110,
    paddingTop: spacing.md,
    textAlignVertical: 'top',
  },
});