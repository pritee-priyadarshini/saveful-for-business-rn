import React, { useState, useRef } from 'react';
import {
  KeyboardTypeOptions,
  StyleSheet,
  TextInput,
  View,
  Pressable,
  FocusEvent,
  TextInputProps,
  Platform,
} from 'react-native';
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
  textContentType?: TextInputProps['textContentType'];
  autoComplete?: TextInputProps['autoComplete'];
  passwordRules?: TextInputProps['passwordRules'];
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
  textContentType,
  autoComplete,
  passwordRules,
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<View>(null);

  // Password fields must start masked; `secureTextEntry` is often omitted when using `isPassword`.
  const [hidden, setHidden] = useState(isPassword ? true : Boolean(secureTextEntry));
  const useFormLabel = compact || labelVariant === 'label';

  const resolvedTextContentType =
    textContentType ??
    (isPassword ? 'newPassword' : undefined);
  const resolvedAutoComplete =
    autoComplete ??
    (isPassword ? (Platform.OS === 'android' ? 'password-new' : 'new-password') : undefined);

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
        color={useFormLabel ? palette.black : palette.textMuted}
        style={[
          useFormLabel && styles.labelCompact,
          useFormLabel && !compact && styles.labelForm,
        ]}
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
            useFormLabel && !compact && styles.inputForm,
            multiline && styles.multiline,
            isFocused && styles.inputFocused,
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={() => setIsFocused(false)}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? (isPassword ? 'none' : undefined)}
          autoCorrect={autoCorrect ?? (isPassword ? false : undefined)}
          textContentType={resolvedTextContentType}
          autoComplete={resolvedAutoComplete}
          passwordRules={passwordRules}
          importantForAutofill={isPassword ? 'yes' : 'auto'}
        />

        {isPassword && (
          <Pressable
            style={styles.eye}
            onPress={() => setHidden((prev) => !prev)}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Show password' : 'Hide password'}
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

  labelForm: {
    fontSize: scaleFont(14),
    lineHeight: scaleFont(18),
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

  inputForm: {
    minHeight: 48,
    borderRadius: 10,
    borderColor: '#D9D9D9',
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: scaleFont(15),
    lineHeight: scaleFont(20),
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
