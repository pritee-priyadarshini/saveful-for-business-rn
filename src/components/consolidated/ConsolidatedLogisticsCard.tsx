import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import type { HandoverMethod } from '@/types/consolidated';
import { formatInTimezone, formatWindowInZone, handoverInstruction, methodLabel, timeFieldLabel } from '@/utils/consolidated';
import { IconBubble, InfoRow, Surface, cc } from '@/components/consolidated/ui';
import { normalize } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';

export type LogisticsView = {
  method: HandoverMethod;
  pointName: string;
  address?: string | null;
  directions?: string | null;
  submissionsCloseAt?: string | null;
  handoverStartAt?: string | null;
  handoverEndAt?: string | null;
  pickupStartAt?: string | null;
  pickupEndAt?: string | null;
  suitabilityNotes?: string | null;
  instructions?: string | null;
  timezone?: string | null;
};

export function ConsolidatedLogisticsCard({ collection }: { collection: LogisticsView }) {
  const internal = collection.method === 'INTERNAL_COLLECTION';
  return (
    <Surface tone="tint" style={styles.card}>
      <View style={styles.head}>
        <IconBubble name={internal ? 'walk-outline' : 'archive-outline'} color={palette.white} background={palette.kale} />
        <View style={styles.flex}>
          <AppText variant="subheading">{collection.pointName}</AppText>
          <AppText variant="meta" color={palette.midgray}>Consolidated collection · {methodLabel(collection.method)}</AppText>
        </View>
      </View>
      <View style={styles.instruction}>
        <Ionicons name="information-circle" size={normalize(18)} color={palette.kale} />
        <AppText variant="bodyBold" color={palette.black} style={styles.flex}>
          {handoverInstruction({
            method: collection.method,
            point: { name: collection.pointName },
            handoverStartAt: collection.handoverStartAt,
            handoverEndAt: collection.handoverEndAt,
            timezone: collection.timezone,
          })}
        </AppText>
      </View>
      <View style={styles.rows}>
        {collection.address ? (
          <InfoRow icon="location-outline" label="Address" value={collection.address} sub={collection.directions} />
        ) : null}
        <InfoRow
          icon="create-outline"
          label={timeFieldLabel('submissionsClose', collection.method)}
          value={formatInTimezone(collection.submissionsCloseAt, collection.timezone)}
        />
        <InfoRow
          icon={internal ? 'walk-outline' : 'archive-outline'}
          label={internal ? 'Internal collection window' : 'Drop-off window'}
          value={formatWindowInZone(collection.handoverStartAt, collection.handoverEndAt, collection.timezone)}
        />
        <InfoRow
          icon="car-outline"
          label="Charity pickup"
          value={formatWindowInZone(collection.pickupStartAt, collection.pickupEndAt, collection.timezone)}
        />
        {collection.suitabilityNotes ? (
          <InfoRow icon="shield-checkmark-outline" label="Food storage & suitability" value={collection.suitabilityNotes} />
        ) : null}
        {collection.instructions ? (
          <InfoRow icon="document-text-outline" label="Instructions" value={collection.instructions} />
        ) : null}
      </View>
      <AppText variant="meta" color={palette.stone}>Set by your collection manager — you don't need to enter pickup details.</AppText>
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  flex: { flex: 1, minWidth: 0 },
  eyebrow: { letterSpacing: 0.8 },
  instruction: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: palette.white,
    borderRadius: cc.radiusSm,
    padding: 12,
  },
  rows: { gap: 10 },
});
