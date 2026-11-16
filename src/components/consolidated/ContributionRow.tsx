import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { CollectionStatusBadge } from '@/components/consolidated/CollectionStatusBadge';
import { Divider, IconBubble, Pill, StepTrack, Surface, cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import type { DashboardContribution, HandoverMethod } from '@/types/consolidated';
import { exceptionLabel, formatInTimezone, formatKg } from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';

type Props = {
  contribution: DashboardContribution;
  timezone?: string | null;
  method?: HandoverMethod | null;
  canReceive?: boolean;
  canManage?: boolean;
  onReceipt?: () => void;
  onExclude?: () => void;
};

const STAGE: Record<string, number> = { SUBMITTED: 1, LATE_PENDING_APPROVAL: 0, HANDED_OVER: 2, RECEIVED: 3, COMPLETED: 3 };

export function ContributionRow({ contribution, timezone, method, canReceive, canManage, onReceipt, onExclude }: Props) {
  const [open, setOpen] = useState(false);
  const internal = method === 'INTERNAL_COLLECTION';
  const verified = contribution.items.reduce((sum, item) => sum + Number(item.verifiedQtyKg ?? 0), 0);
  const submitted = contribution.items.reduce((sum, item) => sum + Number(item.submittedQtyKg || 0), 0);
  const received = contribution.receipt?.status === 'RECEIVED';
  const notReceived = contribution.receipt?.status === 'NOT_RECEIVED';
  const pendingReceipt = canReceive && !received && !notReceived && ['SUBMITTED', 'HANDED_OVER'].includes(contribution.status);
  const stage = STAGE[contribution.status] ?? 0;

  return (
    <Surface style={styles.card}>
      <Pressable onPress={() => setOpen((value) => !value)} style={styles.header} accessibilityRole="button">
        <IconBubble
          name={received ? 'checkmark-done' : notReceived ? 'close' : 'storefront-outline'}
          color={notReceived ? palette.danger : palette.kale}
          background={notReceived ? cc.dangerBg : cc.tintStrong}
        />
        <View style={styles.copy}>
          <AppText variant="bodyBold" numberOfLines={1}>{contribution.site.name}</AppText>
          <AppText variant="meta" color={palette.stone}>
            {formatKg(submitted)} kg listed
            {received ? ` · ${formatKg(verified)} kg verified` : ''}
          </AppText>
          <View style={styles.badgeRow}>
            <CollectionStatusBadge status={contribution.status} kind="contribution" method={method} />
            {(contribution.exceptions || []).map((code) => (
              <Pill key={code} label={exceptionLabel(code)} color={cc.warnText} background={cc.warnBg} icon="alert-circle" />
            ))}
          </View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={normalize(18)} color={palette.stone} />
      </Pressable>

      {pendingReceipt && onReceipt ? (
        <Button
          label={contribution.status === 'HANDED_OVER' ? 'Check what arrived' : 'Record receipt'}
          size="compact"
          icon="clipboard-outline"
          onPress={onReceipt}
        />
      ) : null}

      {open ? (
        <View style={styles.details}>
          <Divider />
          {!notReceived ? (
            <StepTrack
              current={stage}
              steps={[
                'Listed by site',
                internal ? 'Collected / in transit' : 'Dropped off',
                'Received at central point',
              ].map((label, index) => {
                if (index === 1 && contribution.handover?.at) {
                  return `${label} · ${formatInTimezone(contribution.handover.at, timezone, { day: undefined, month: undefined })}`;
                }
                if (index === 2 && contribution.receipt?.at && received) {
                  return `${label} · ${formatInTimezone(contribution.receipt.at, timezone, { day: undefined, month: undefined })}`;
                }
                return label;
              })}
            />
          ) : (
            <AppText variant="bodySmall" color={palette.danger}>
              Marked not received{contribution.receipt?.note ? ` — ${contribution.receipt.note}` : ''}
            </AppText>
          )}

          {contribution.items.map((item) => {
            const adjusted = item.verifiedQtyKg != null && item.verifiedQtyKg !== item.submittedQtyKg;
            return (
              <View key={item.foodItemId} style={styles.item}>
                <View style={styles.copy}>
                  <AppText variant="bodyBold">{item.name}</AppText>
                  {item.quantityDescription ? (
                    <AppText variant="meta" color={palette.stone}>{item.quantityDescription}</AppText>
                  ) : null}
                </View>
                <View style={styles.qty}>
                  <AppText variant="bodyBold" style={adjusted ? styles.struck : undefined} color={adjusted ? palette.stone : palette.black}>
                    {formatKg(item.submittedQtyKg)} kg
                  </AppText>
                  {adjusted ? (
                    <AppText variant="bodyBold" color={palette.kale}>{formatKg(item.verifiedQtyKg)} kg</AppText>
                  ) : null}
                </View>
              </View>
            );
          })}

          {contribution.allergens?.length ? (
            <AppText variant="meta" color={palette.stone}>Allergens · {contribution.allergens.join(', ')}</AppText>
          ) : null}
          {contribution.submittedBy?.name ? (
            <AppText variant="meta" color={palette.stone}>
              Listed by {contribution.submittedBy.name}
              {contribution.submittedAt ? ` · ${formatInTimezone(contribution.submittedAt, timezone)}` : ''}
            </AppText>
          ) : null}

          <View style={styles.actions}>
            {canReceive && onReceipt && !pendingReceipt && !['COMPLETED', 'EXCLUDED'].includes(contribution.status) ? (
              <Button label="Change receipt" size="compact" variant="secondary" onPress={onReceipt} style={styles.flex} />
            ) : null}
            {canManage && onExclude && !['EXCLUDED', 'COMPLETED'].includes(contribution.status) ? (
              <Button label="Exclude" size="compact" variant="ghost" icon="remove-circle-outline" onPress={onExclude} style={styles.flex} />
            ) : null}
          </View>
        </View>
      ) : null}
    </Surface>
  );
}

const styles = StyleSheet.create({
  card: { gap: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  details: { gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  qty: { alignItems: 'flex-end' },
  struck: { textDecorationLine: 'line-through' },
  actions: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
