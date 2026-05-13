import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  isPassword?: boolean;
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
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  const [hidden, setHidden] = useState(secureTextEntry);

  return (
    <View style={styles.container}>
      {/* Label */}
      <AppText variant="label" color={palette.textMuted}>
        {label}
      </AppText>

      <View style={styles.inputWrapper}>
        <TextInput
          multiline={multiline}
          editable={editable}
          secureTextEntry={isPassword ? hidden : secureTextEntry}
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