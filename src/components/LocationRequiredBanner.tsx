import React from 'react';
import { Pressable, StyleSheet, View, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '../theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => Math.round(size * (width / 375));

type Props = {
  title?: string;
  description: string;
  onUseGps: () => void;
  onSearchAddress: () => void;
  onDismiss?: () => void;
};

export function LocationRequiredBanner({
  title = 'Share your location to get started',
  description,
  onUseGps,
  onSearchAddress,
  onDismiss,
}: Props) {
  return (
    <View style={styles.banner}>
      <View style={styles.topRow}>
        <AppText variant="bodyBold">{title}</AppText>
        {onDismiss ? (
          <Pressable onPress={onDismiss} hitSlop={8}>
            <AppText variant="bodyLarge">×</AppText>
          </Pressable>
        ) : null}
      </View>

      <AppText variant="bodySmall" style={styles.description}>
        {description}
      </AppText>

      <View style={styles.actions}>
        <Pressable style={styles.gpsBtn} onPress={onUseGps}>
          <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
          <AppText style={styles.gpsBtnText}>Use My Location</AppText>
        </Pressable>

        <Pressable style={styles.searchBtn} onPress={onSearchAddress}>
          <Ionicons name="search" size={normalize(16)} color={palette.white} />
          <AppText style={styles.searchBtnText}>Search Address</AppText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginHorizontal: wp(4),
    marginTop: hp(1.2),
    marginBottom: hp(0.8),
    padding: wp(4),
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: '#D9E3D0',
    backgroundColor: '#F4F8EF',
    gap: hp(1),
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  description: {
    color: palette.midgray,
    lineHeight: normalize(20),
  },
  actions: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  gpsBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1.1),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.white,
  },
  gpsBtnText: {
    color: palette.primary,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
  },
  searchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1.5),
    paddingVertical: hp(1.1),
    borderRadius: normalize(10),
    backgroundColor: palette.primary,
  },
  searchBtnText: {
    color: palette.white,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(12),
  },
});
