import React, { PropsWithChildren } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hp, wp } from '@/utils/responsive';

type HeroHeaderProps = PropsWithChildren<{
  source: ImageSourcePropType;
  height?: number;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
  /** When false, content spans full width (e.g. centered titles). Default true. */
  padContentRight?: boolean;
}>;

export function HeroHeader({
  source,
  height = hp(18),
  children,
  contentStyle,
  style,
  padContentRight = true,
}: HeroHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        padContentRight && styles.containerPaddedRight,
        { height: height + insets.top },
        style,
      ]}
    >
      <Image source={source} style={styles.bg} resizeMode="cover" />
      <View style={[styles.content, { paddingTop: insets.top }, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    top: wp(-1),
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  containerPaddedRight: {
    paddingRight: wp(4),
  },
  bg: {
    width: '110%',
    height: '120%',
    position: 'absolute',
    left: '-5%',
    top: 0,
  },
  content: {
    flex: 1,
  },
});
