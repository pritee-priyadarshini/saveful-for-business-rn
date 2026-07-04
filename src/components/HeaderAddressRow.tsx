import React from 'react';
import { StyleProp, StyleSheet, TextStyle, View, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

type HeaderAddressRowProps = {
  address: string;
  iconSize?: number;
  iconColor?: string;
  textColor?: string;
  uppercase?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

export function HeaderAddressRow({
  address,
  iconSize = normalize(20),
  iconColor = palette.white,
  textColor = palette.white,
  uppercase = false,
  style,
  textStyle,
}: HeaderAddressRowProps) {
  const trimmed = address?.trim();
  if (!trimmed) return null;

  const display = uppercase ? trimmed.toUpperCase() : trimmed;

  return (
    <View style={[styles.row, style]}>
      <Ionicons name="location-outline" size={iconSize} color={iconColor} />
      <AppText
        variant="body"
        style={[styles.text, { color: textColor }, textStyle]}
        numberOfLines={2}
        ellipsizeMode="tail"
      >
        {display}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(1.5),
    marginTop: hp(0.6),
  },
  text: {
    flex: 1,
    minWidth: 0,
    opacity: 0.9,
    textTransform: 'none',
  },
});
