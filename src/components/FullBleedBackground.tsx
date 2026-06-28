import React, { PropsWithChildren } from 'react';
import { Image, ImageSourcePropType, StyleSheet, View } from 'react-native';

type FullBleedBackgroundProps = PropsWithChildren<{
  source: ImageSourcePropType;
}>;

/** Full-screen background image with edge bleed (no side tint). */
export function FullBleedBackground({ source, children }: FullBleedBackgroundProps) {
  return (
    <View style={styles.root}>
      <Image source={source} style={styles.bg} resizeMode="cover" />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
  },
  bg: {
    ...StyleSheet.absoluteFillObject,
    width: '110%',
    height: '120%',
    left: '-5%',
    top: 0,
  },
});
