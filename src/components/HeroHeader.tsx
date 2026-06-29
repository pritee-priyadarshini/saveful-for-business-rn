import React, { PropsWithChildren } from 'react';
import {
  Image,
  ImageSourcePropType,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hp } from '@/utils/responsive';

type HeroHeaderProps = PropsWithChildren<{
  source: ImageSourcePropType;
  height?: number;
  contentStyle?: ViewStyle;
  style?: ViewStyle;
  /** @deprecated Ignored — content padding is controlled via contentStyle */
  padContentRight?: boolean;
}>;

export function HeroHeader({
  source,
  height = hp(18),
  children,
  contentStyle,
  style,
}: HeroHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
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
    width: '100%',
    overflow: 'hidden',
    position: 'relative',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
  },
});
