import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

export type ModalArtKind = 'notice' | 'success' | 'caution';

const SOURCES = {
  notice: require('../../assets/placeholder/modal_notice.png'),
  success: require('../../assets/placeholder/modal_success.png'),
  caution: require('../../assets/placeholder/modal_caution.png'),
};

type Props = {
  kind?: ModalArtKind;
  size?: number;
};

export function ModalArt({ kind = 'notice', size = normalize(128) }: Props) {
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size * 0.24 }]}>
      <Image source={SOURCES[kind]} style={styles.image} resizeMode="cover" />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: palette.creme,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
