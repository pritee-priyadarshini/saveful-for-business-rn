import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { ListingStatus } from '../types';
import { palette } from '../theme/colors';
import { resolveListingStatus } from '../utils/foodListing';

const statusColors: Record<ListingStatus, { background: string; color: string }> = {
  ACTIVE: { background: '#E6FFF0', color: palette.kale },
  PARTIAL: { background: '#FDEEF7', color: palette.primary },
  CLAIMED: { background: '#E8F1FB', color: '#2F6FED' },
  COLLECTED: { background: '#EEF7F2', color: palette.kale },
  EXPIRED: { background: '#FFF1D6', color: palette.warning },
  CANCELLED: { background: '#F5F5F5', color: '#888' },
};

const statusLabels: Record<ListingStatus, string> = {
  ACTIVE: 'Active',
  PARTIAL: 'Partial',
  CLAIMED: 'Claimed',
  COLLECTED: 'Collected',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status }: { status: ListingStatus | string }) {
  const normalized = resolveListingStatus({ status });
  const colors = statusColors[normalized];
  const label = statusLabels[normalized];

  return (
    <View style={[styles.badge, { backgroundColor: colors.background }]}>
      <AppText variant="caption" color={colors.color}>{label}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
});
