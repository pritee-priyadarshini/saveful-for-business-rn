import React, { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { AppText } from './AppText';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';

type InputFieldProps = {
  label: string;
  placeholder?: string;
  value?: string; 
  onChangeText?: (value: string) => void; 
  editable?: boolean;
  multiline?: boolean;
  secureTextEntry?: boolean;
};

export function InputField({
  label,
  placeholder,
  value = '', 
  onChangeText = () => {}, 
  editable,
  multiline,
  secureTextEntry,
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {/* Label */}
      <AppText variant="label" color={palette.textMuted}>
        {label}
      </AppText>

      {/* Input */}
      <TextInput
        multiline={multiline}
        editable={editable}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor={palette.textMuted}
        style={[
          styles.input,
          multiline && styles.multiline,
          isFocused && styles.inputFocused, 
        ]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },

  input: {
    minHeight: 52,
    borderRadius: 16, 
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: spacing.md,
    color: palette.text,
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