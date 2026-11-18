import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { CollectionStatusBadge } from '@/components/consolidated/CollectionStatusBadge';
import { Chip, EmptyState, HeaderAction, ProgressBar, Segmented, SkeletonCard, Surface, cc, tabular } from '@/components/consolidated/ui';
import { GuideHeaderRight, GuideTarget, tours, useScreenGuide } from '@/components/guide';
import { useConsolidatedAccess } from '@/hooks/useConsolidatedAccess';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import { formatKg, formatWindowInZone, methodLabel, todayKey } from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';
import type { CollectionListItem, ConsolidatedGroup } from '@/types/consolidated';

type Tab = 'upcoming' | 'active' | 'past';

const EMPTY: Record<Tab, { title: string; body: string }> = {
  active: { title: 'Nothing happening right now', body: 'Collections appear here on the day sites can list food.' },
  upcoming: { title: 'No upcoming collections', body: 'Schedule a one-off or recurring collection for your group.' },
  past: { title: 'No past collections yet', body: 'Completed, cancelled and expired collections are kept here.' },
};

export function ConsolidatedCollectionsScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { canManage } = useConsolidatedAccess();
  const [tab, setTab] = useState<Tab>(route.params?.tab || 'active');
  const [groupId, setGroupId] = useState<number | null>(route.params?.groupId ?? null);
  const [groups, setGroups] = useState<ConsolidatedGroup[]>([]);
  const [rows, setRows] = useState<CollectionListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (nextPage = 1, append = false) => {
    try {
      const result = await consolidatedService.listCollections({
        tab,
        groupId: groupId || undefined,
        page: nextPage,
        limit: 20,
      });
      setRows((current) => (append ? [...current, ...result.items] : result.items));
      setPage(result.page);
      setTotalPages(result.totalPages);
    } catch (error) {
      showErrorAlert(error, 'Could not load collections');
    } finally {
      setLoading(false);
    }
  }, [groupId, tab]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void consolidatedService.listGroups(false).then(setGroups).catch(() => undefined);
      void load(1, false);
    }, [load]),
  );

  const schedule = () => navigation.navigate('ScheduleCollection', { mode: 'create', groupId: groupId || undefined });
  const groupChips = useMemo(() => groups.map((group) => ({ id: group.id, name: group.name })), [groups]);
  const guide = useScreenGuide(tours.collectionsTour, { ready: !loading });

  return (
    <Screen
      scrollable
      backgroundColor={palette.creme}
      transparentTop
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          tintColor={palette.primary}
          onRefresh={() => {
            setRefreshing(true);
            load(1, false).finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <StackHeroHeader
        title="Consolidated Collections"
        subtitle="Several sites · one collection point · one charity pickup"
        right={
          <GuideHeaderRight onGuide={guide.start}>
            {canManage ? (
              <GuideTarget id="collections.schedule">
                <HeaderAction icon="add" label="Schedule" onPress={schedule} />
              </GuideTarget>
            ) : null}
          </GuideHeaderRight>
        }
      />
      <View style={styles.body}>
        <GuideTarget id="collections.tabs">
          <Segmented<Tab>
            value={tab}
            onChange={(value) => { setTab(value); setLoading(true); }}
            options={[
              { value: 'active', label: 'Today' },
              { value: 'upcoming', label: 'Upcoming' },
              { value: 'past', label: 'Past' },
            ]}
          />
        </GuideTarget>

        {groupChips.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All groups" selected={groupId == null} onPress={() => setGroupId(null)} />
            {groupChips.map((group) => (
              <Chip key={group.id} label={group.name} selected={groupId === group.id} onPress={() => setGroupId(group.id)} />
            ))}
          </ScrollView>
        ) : null}

        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : null}

        {!loading && rows.length === 0 ? (
          <EmptyState
            icon={tab === 'past' ? 'archive-outline' : 'calendar-outline'}
            title={EMPTY[tab].title}
            body={EMPTY[tab].body}
            action={canManage && tab !== 'past' ? <Button label="Schedule collection" variant="secondary" onPress={schedule} /> : null}
          />
        ) : null}

        {!loading && rows.map((row, index) => (
          <GuideTarget key={row.id} id="collections.card" disabled={index > 0}>
            <CollectionCard row={row} onPress={() => navigation.navigate('CollectionDashboard', { collectionId: row.id })} />
          </GuideTarget>
        ))}

        {!loading && page < totalPages ? (
          <Button label="Load more" variant="ghost" onPress={() => { void load(page + 1, true); }} />
        ) : null}
      </View>
    </Screen>
  );
}

function CollectionCard({ row, onPress }: { row: CollectionListItem; onPress: () => void }) {
  const date = row.scheduledDate ? new Date(`${row.scheduledDate}T12:00:00Z`) : null;
  const isToday = row.scheduledDate === todayKey(row.timezone);
  const participating = row.counts?.participating ?? 0;
  const submitted = row.counts?.submitted ?? 0;
  return (
    <Surface onPress={onPress} style={styles.card}>
      <View style={styles.dateCol}>
        <AppText variant="caption" color={isToday ? palette.kale : palette.stone}>
          {isToday ? 'Today' : date ? date.toLocaleDateString('en-AU', { weekday: 'short', timeZone: 'UTC' }) : ''}
        </AppText>
        <AppText variant="subheading" style={tabular} color={palette.black}>
          {date ? date.getUTCDate() : '–'}
        </AppText>
        <AppText variant="meta" color={palette.stone}>
          {date ? date.toLocaleDateString('en-AU', { month: 'short', timeZone: 'UTC' }) : ''}
        </AppText>
      </View>
      <View style={styles.dateRule} />
      <View style={styles.cardBody}>
        <View style={styles.cardTop}>
          <AppText variant="bodyBold" numberOfLines={1} style={styles.flex}>{row.group.name}</AppText>
          <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={normalize(13)} color={palette.stone} />
          <AppText variant="meta" color={palette.stone} numberOfLines={1} style={styles.flex}>{row.point.name}</AppText>
        </View>
        <View style={styles.metaRow}>
          <Ionicons name="car-outline" size={normalize(13)} color={palette.stone} />
          <AppText variant="meta" color={palette.stone}>
            Pickup {formatWindowInZone(row.times.pickupStartAt, row.times.pickupEndAt, row.timezone)} · {methodLabel(row.method)}
          </AppText>
        </View>
        {participating ? (
          <View style={styles.progress}>
            <View style={styles.flex}>
              <ProgressBar value={submitted} total={participating} />
            </View>
            <AppText variant="meta" color={palette.midgray}>
              {submitted}/{participating} sites
              {row.totals?.verifiedKg != null ? ` · ${formatKg(row.totals.verifiedKg)} kg` : row.totals?.submittedKg ? ` · ${formatKg(row.totals.submittedKg)} kg` : ''}
            </AppText>
          </View>
        ) : null}
        <CollectionStatusBadge status={row.status} />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), paddingBottom: normalize(40), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  loader: { marginTop: 24 },
  chips: { gap: 8, paddingRight: 8 },
  card: { flexDirection: 'row', gap: 14, alignItems: 'stretch' },
  dateCol: { width: normalize(48), alignItems: 'center', justifyContent: 'center', gap: 2 },
  dateRule: { width: StyleSheet.hairlineWidth, backgroundColor: cc.hairline },
  cardBody: { flex: 1, minWidth: 0, gap: 5 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 2 },
});
