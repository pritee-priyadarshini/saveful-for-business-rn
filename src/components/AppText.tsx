import React, { PropsWithChildren } from 'react';
import { StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

import { palette } from '../theme/colors';
import { typography } from '../theme/typography';

type Variant = keyof typeof typography;

type AppTextProps = PropsWithChildren<
  TextProps & {   
    variant?: Variant;
    color?: string;
    style?: StyleProp<TextStyle>;
  }
>;

export function AppText({ children, variant = 'body', color = palette.text, style, ...props }: AppTextProps) {
  return (
    <Text
      style={[styles.base, typography[variant], { color }, style]}
      {...props} 
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: palette.text,
  },
});
