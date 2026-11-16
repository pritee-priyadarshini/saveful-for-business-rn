import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { EmptyState, HeaderAction, IconBubble, NavRow, Pill, SectionTitle, Surface, cc } from '@/components/consolidated/ui';
import { useConsolidatedAccess } from '@/hooks/useConsolidatedAccess';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { palette } from '@/theme/colors';
import { showErrorAlert } from '@/utils/apiError';
import { formatDateInZone } from '@/utils/consolidated';
import { normalize } from '@/utils/responsive';
import type { ConsolidatedGroup } from '@/types/consolidated';

/** Canva CM1 — one-time setup: the groups of sites that share a collection point. */
export function ConsolidatedGroupsScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const { canManage } = useConsolidatedAccess();
  const [groups, setGroups] = useState<ConsolidatedGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setGroups(await consolidatedService.listGroups(true));
    } catch (error) {
      showErrorAlert(error, 'Could not load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const active = groups.filter((group) => group.isActive);
  const archived = groups.filter((group) => !group.isActive);
  const create = () => navigation.navigate('ConsolidatedGroupForm');

  return (
    <Screen
      scrollable
      backgroundColor={palette.creme}
      transparentTop
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          colors={[palette.primary]}
          tintColor={palette.primary}
          onRefresh={() => {
            setRefreshing(true);
            load().finally(() => setRefreshing(false));
          }}
        />
      }
    >
      <StackHeroHeader
        title="Collection groups"
        subtitle="Sites that bring surplus food to one shared collection point"
        right={canManage && groups.length ? <HeaderAction icon="add" label="New group" onPress={create} /> : undefined}
      />
      <View style={styles.body}>
        {loading ? <ActivityIndicator color={palette.kale} style={styles.loader} /> : null}

        {!loading && groups.length === 0 ? (
          <EmptyState
            icon="git-merge-outline"
            title="Create your first collection group"
            body="Group the outlets at one venue — a stadium, zoo or campus — so their surplus goes to one collection point and one charity pickup."
            action={canManage ? <Button label="Create group" icon="add-circle-outline" onPress={create} /> : null}
          />
        ) : null}

        {!loading && active.length ? (
          <>
            {active.map((group) => <GroupCard key={group.id} group={group} onPress={() => navigation.navigate('ConsolidatedGroupForm', { groupId: group.id })} />)}
          </>
        ) : null}

        {!loading && archived.length ? (
          <>
            <SectionTitle title="Archived" />
            {archived.map((group) => (
              <Surface key={group.id} tone="muted" accessibilityLabel={`${group.name}, archived`} onPress={() => navigation.navigate('ConsolidatedGroupForm', { groupId: group.id })} style={styles.archived}>
                <Ionicons name="archive-outline" size={normalize(16)} color={palette.stone} />
                <AppText variant="bodySmall" color={palette.stone} style={styles.flex}>{group.name}</AppText>
                <Ionicons name="chevron-forward" size={normalize(16)} color={palette.stone} />
              </Surface>
            ))}
          </>
        ) : null}

        {!loading && groups.length ? (
          <NavRow
            icon="calendar-outline"
            title="Go to collections"
            subtitle="Schedule, monitor and publish collections"
            onPress={() => navigation.navigate('ConsolidatedCollections')}
          />
        ) : null}
      </View>
    </Screen>
  );
}

function GroupCard({ group, onPress }: { group: ConsolidatedGroup; onPress: () => void }) {
  const taking = group.acceptedSiteCount ?? group.sites.filter((site) => !site.removedAt).length;
  const invited = group.pendingSiteCount ?? 0;
  const point = group.points.find((row) => row.isActive !== false)?.name || group.points[0]?.name;
  return (
    <Surface onPress={onPress} style={styles.card}>
      <View style={styles.cardTop}>
        <IconBubble name="git-merge-outline" />
        <View style={styles.flex}>
          <AppText variant="subheading" numberOfLines={1}>{group.name}</AppText>
          {point ? (
            <View style={styles.meta}>
              <Ionicons name="location-outline" size={normalize(13)} color={palette.stone} />
              <AppText variant="meta" color={palette.stone} numberOfLines={1}>{point}</AppText>
            </View>
          ) : null}
        </View>
        <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
      </View>
      <View style={styles.pills}>
        <Pill label={`${taking} site${taking === 1 ? '' : 's'} taking part`} color={palette.kale} background={cc.tint} icon="storefront-outline" />
        {invited ? <Pill label={`${invited} invited`} color={cc.warnText} background={cc.warnBg} icon="mail-unread-outline" /> : null}
      </View>
      <View style={styles.footer}>
        <Ionicons name="calendar-outline" size={normalize(14)} color={palette.midgray} />
        <AppText variant="meta" color={palette.midgray}>
          {group.nextCollection
            ? `Next collection ${formatDateInZone(group.nextCollection.scheduledDate.slice(0, 10), group.timezone)}`
            : 'No upcoming collections'}
        </AppText>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), paddingBottom: normalize(40), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  loader: { marginTop: 24 },
  card: { gap: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cc.hairline,
  },
  archived: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
});
