import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { ListingStatus } from '../types';
import { palette } from '../theme/colors';

const statusColors: Record<ListingStatus, { background: string; color: string }> = {
  Pending: { background: '#FFF1D6', color: palette.warning },
  Accepted: { background: '#DDEEE6', color: palette.success },
  Collected: { background: '#DCEAF8', color: '#2167A8' },
  Available: { background: '#E6FFF0', color: palette.kale },
  Claimed: { background: '#F2E3CF', color: palette.primary },
  'Waiting for pickup': { background: '#FFF1D6', color: palette.warning },
  'Partial claimed': { background: '#FDEEF7', color: palette.primary },
};

export function StatusBadge({ status }: { status: ListingStatus }) {
  return (
    <View style={[styles.badge, { backgroundColor: statusColors[status].background }]}>
      <AppText variant="caption" color={statusColors[status].color}>{status}</AppText>
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
