import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { Button } from './Button';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { Listing } from '../types';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';

type Props = {
  listing: Listing;
  actionLabel?: string;
};

export function ListingCard({ listing, actionLabel }: Props) {
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.copy}>
          <AppText variant="subheading">{listing.foodName}</AppText>
          <AppText color={palette.textMuted}>{listing.quantity} • {listing.category}</AppText>
        </View>
        <StatusBadge status={listing.status} />
      </View>

      <View style={styles.metaGroup}>
        <MetaItem icon="time-outline" text={listing.pickupWindow} />
        <MetaItem icon="location-outline" text={`${listing.address} • ${listing.distance}`} />
        <MetaItem icon="information-circle-outline" text={listing.notes} />
      </View>

      <View style={styles.footer}>
        <View style={styles.copy}>
          <AppText variant="label" color={palette.textMuted}>Organization</AppText>
          <AppText>{listing.charityName ?? listing.restaurantName}</AppText>
        </View>
        {actionLabel ? <Button label={actionLabel} variant="secondary" /> : null}
      </View>
    </Card>
  );
}

function MetaItem({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.metaRow}>
      <Ionicons color={palette.textMuted} name={icon} size={16} />
      <AppText color={palette.textMuted} style={styles.metaText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: 4,
  },
  metaGroup: {
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'flex-start',
  },
  metaText: {
    flex: 1,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
});
