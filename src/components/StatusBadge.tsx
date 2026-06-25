import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { ListingStatus } from '../types';
import { palette } from '../theme/colors';

const statusColors: Record<ListingStatus, { background: string; color: string }> = {
  ACTIVE: { background: '#E6FFF0', color: palette.kale },
  PARTIAL: { background: '#FDEEF7', color: palette.primary },
  CLAIMED: { background: '#F2E3CF', color: palette.primary },
  EXPIRED: { background: '#FFF1D6', color: palette.warning },
  CANCELLED: { background: '#F5F5F5', color: '#888' },
};

const statusLabels: Record<ListingStatus, string> = {
  ACTIVE: 'Active',
  PARTIAL: 'Partial',
  CLAIMED: 'Claimed',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: statusColors[status].background }]}>
      <AppText variant="caption" color={statusColors[status].color}>{statusLabels[status]}</AppText>
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
