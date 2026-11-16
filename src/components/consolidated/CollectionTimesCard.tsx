import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { Divider, InfoRow, Pill, Surface, cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import type { CollectionDashboard, HandoverMethod } from '@/types/consolidated';
import { closesInLabel, formatInTimezone, formatWindowInZone, timeFieldLabel } from '@/utils/consolidated';

type Props = {
  method: HandoverMethod;
  timezone?: string | null;
  times: CollectionDashboard['times'];
  status?: string | null;
};

/** The day's three deadlines, in the venue's timezone. */
export function CollectionTimesCard({ method, timezone, times, status }: Props) {
  const countdown = status === 'OPEN' ? closesInLabel(times.submissionsCloseAt) : null;
  const internal = method === 'INTERNAL_COLLECTION';
  return (
    <Surface style={styles.card}>
      <View style={styles.head}>
        <AppText variant="bodyBold">Timeline</AppText>
        {countdown ? <Pill label={countdown} color={palette.kale} background={cc.tint} icon="time-outline" /> : null}
      </View>
      <InfoRow
        icon="create-outline"
        label={timeFieldLabel('submissionsClose', method)}
        value={formatInTimezone(times.submissionsCloseAt, timezone)}
      />
      <Divider />
      <InfoRow
        icon={internal ? 'walk-outline' : 'archive-outline'}
        label={internal ? 'Food ready → internal collection' : 'Drop-off window'}
        value={formatWindowInZone(times.handoverStartAt, times.handoverEndAt, timezone)}
        sub={`${timeFieldLabel('handoverEnd', method)} ${formatInTimezone(times.handoverEndAt, timezone, { day: undefined, month: undefined })}`}
      />
      <Divider />
      <InfoRow
        icon="car-outline"
        label="Charity pickup window"
        value={formatWindowInZone(times.pickupStartAt, times.pickupEndAt, timezone)}
      />
      {times.reopenedUntil ? (
        <Pill
          label={`Reopened until ${formatInTimezone(times.reopenedUntil, timezone)}`}
          color={cc.warnText}
          background={cc.warnBg}
          icon="refresh"
        />
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
});
