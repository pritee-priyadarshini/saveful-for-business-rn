import React, { useEffect, useState } from 'react';
import {
  InputAccessoryView,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from './AppText';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

export const OTP_KEYBOARD_ACCESSORY_ID = 'saveful-otp-submit';
export const FORM_KEYBOARD_ACCESSORY_ID = 'saveful-form-done';

type Props = {
  nativeID?: string;
  label?: string;
  disabled?: boolean;
  onSubmit: () => void;
};

function useKeyboardHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      setHeight(event.endCoordinates.height);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return height;
}

function SubmitButton({
  label,
  disabled,
  onSubmit,
}: {
  label: string;
  disabled: boolean;
  onSubmit: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        if (disabled) return;
        Keyboard.dismiss();
        onSubmit();
      }}
      disabled={disabled}
      style={[styles.button, disabled && styles.disabled]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <AppText variant="bodyBold" style={styles.label}>
        {label}
      </AppText>
    </Pressable>
  );
}

/**
 * Extra Continue / Done control above the keyboard on iOS and Android.
 * Number pads on both platforms often have no Enter key, so large-text
 * users cannot reach the on-screen button.
 */
export function KeyboardSubmitAccessory({
  nativeID = OTP_KEYBOARD_ACCESSORY_ID,
  label = 'Continue',
  disabled = false,
  onSubmit,
}: Props) {
  const keyboardHeight = useKeyboardHeight();

  const bar = (
    <View style={styles.bar}>
      <SubmitButton label={label} disabled={disabled} onSubmit={onSubmit} />
    </View>
  );

  if (Platform.OS === 'ios') {
    return <InputAccessoryView nativeID={nativeID}>{bar}</InputAccessoryView>;
  }

  if (keyboardHeight <= 0) return null;

  return (
    <View pointerEvents="box-none" style={styles.androidOverlay}>
      <View style={[styles.androidBarWrap, { bottom: keyboardHeight }]}>{bar}</View>
    </View>
  );
}

export function otpInputKeyboardProps(accessoryId = OTP_KEYBOARD_ACCESSORY_ID) {
  return {
    keyboardType: 'number-pad' as const,
    returnKeyType: 'done' as const,
    blurOnSubmit: true,
    enablesReturnKeyAutomatically: true,
    inputAccessoryViewID: Platform.OS === 'ios' ? accessoryId : undefined,
  };
}

const styles = StyleSheet.create({
  androidOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 24,
  },
  androidBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
  bar: {
    backgroundColor: palette.creme,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: palette.border,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  button: {
    backgroundColor: palette.middlegreen,
    borderRadius: 10,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    color: palette.white,
    textTransform: 'none',
  },
});
