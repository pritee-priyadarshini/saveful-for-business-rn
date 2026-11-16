import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { CollectionStatusBadge } from '@/components/consolidated/CollectionStatusBadge';
import { IconBubble, ProgressBar, cc } from '@/components/consolidated/ui';
import { useConsolidatedAccess } from '@/hooks/useConsolidatedAccess';
import { consolidatedService } from '@/services/consolidated.service';
import { palette } from '@/theme/colors';
import type { CollectionListItem } from '@/types/consolidated';
import { formatDateInZone, formatTimeInZone, todayKey } from '@/utils/consolidated';
import { hp, normalize, wp } from '@/utils/responsive';

/** Canva CM2 — Home → Consolidated Collections, only for people in a group. */
export function ConsolidatedHomeCard({ style }: { style?: ViewStyle }) {
  const navigation = useNavigation<any>();
  const { inGroup: hasAccess, loading } = useConsolidatedAccess();
  const [next, setNext] = useState<CollectionListItem | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!hasAccess) return undefined;
      let cancelled = false;
      consolidatedService
        .listCollections({ tab: 'active', limit: 1 })
        .then(async (page) => page.items[0] ?? (await consolidatedService.listCollections({ tab: 'upcoming', limit: 1 })).items[0] ?? null)
        .then((item) => { if (!cancelled) setNext(item); })
        .catch(() => { if (!cancelled) setNext(null); });
      return () => {
        cancelled = true;
      };
    }, [hasAccess]),
  );

  if (loading || !hasAccess) return null;

  const isToday = next?.scheduledDate === todayKey(next?.timezone);
  const participating = next?.counts?.participating ?? 0;
  const submitted = next?.counts?.submitted ?? 0;

  return (
    <Pressable
      onPress={() => navigation.navigate('ConsolidatedCollections')}
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel="Consolidated Collections"
    >
      <View style={styles.top}>
        <IconBubble name="git-merge-outline" />
        <View style={styles.copy}>
          <AppText variant="bodyBold">Consolidated Collections</AppText>
          <AppText variant="meta" color={palette.stone} numberOfLines={1}>
            {next
              ? `${isToday ? 'Today' : formatDateInZone(next.scheduledDate || next.times.pickupStartAt, next.timezone)} · ${next.point.name} · pickup ${formatTimeInZone(next.times.pickupStartAt, next.timezone)}`
              : 'No collections scheduled — tap to schedule one'}
          </AppText>
        </View>
        <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
      </View>
      {next ? (
        <View style={styles.bottom}>
          <CollectionStatusBadge status={next.status} />
          {participating ? (
            <View style={styles.progress}>
              <View style={styles.flex}>
                <ProgressBar value={submitted} total={participating} />
              </View>
              <AppText variant="meta" color={palette.midgray}>{submitted}/{participating} sites</AppText>
            </View>
          ) : null}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: hp(1.4),
    paddingHorizontal: wp(3.6),
    borderRadius: normalize(18),
    backgroundColor: palette.white,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cc.hairline,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: wp(2.6) },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  progress: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
