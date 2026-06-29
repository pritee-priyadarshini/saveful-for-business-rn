import React, { PropsWithChildren, useMemo } from 'react';
import { Platform, StyleProp, StyleSheet, Text, TextProps, TextStyle } from 'react-native';

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

const LINE_HEIGHT_RATIO = 1.32;

function withSafeLineHeight(style: TextStyle): TextStyle {
  const fontSize = style.fontSize;
  if (typeof fontSize !== 'number') return style;

  const minLineHeight = Math.ceil(fontSize * LINE_HEIGHT_RATIO);
  const currentLineHeight = style.lineHeight;

  if (typeof currentLineHeight !== 'number' || currentLineHeight < minLineHeight) {
    return { ...style, lineHeight: minLineHeight };
  }

  return style;
}

export function AppText({
  children,
  variant = 'body',
  color = palette.text,
  style,
  ...props
}: AppTextProps) {
  const resolvedStyle = useMemo(() => {
    const flat = StyleSheet.flatten([
      styles.base,
      typography[variant],
      { color },
      style,
    ]) as TextStyle;
    return withSafeLineHeight(flat);
  }, [variant, color, style]);

  return (
    <Text style={resolvedStyle} {...props}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    color: palette.text,
    ...Platform.select({
      android: {
        includeFontPadding: true,
      },
    }),
  },
});
