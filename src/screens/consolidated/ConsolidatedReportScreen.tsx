import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { ImpactDateFilter } from '@/components/ImpactDateFilter';
import { Screen } from '@/components/Screen';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { CollectionStatusBadge } from '@/components/consolidated/CollectionStatusBadge';
import { Chip, Divider, EmptyState, Pill, SectionTitle, Stat, StatGrid, Surface, cc, tabular } from '@/components/consolidated/ui';
import { normalize } from '@/utils/responsive';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { consolidatedService } from '@/services/consolidated.service';
import { palette } from '@/theme/colors';
import type { ImpactFilter } from '@/store/impactStore';
import { showErrorAlert } from '@/utils/apiError';
import { formatDateInZone, formatKg } from '@/utils/consolidated';
import type { ConsolidatedGroup, ReportCollectionRow, ReportSummary } from '@/types/consolidated';

function rangeFor(filter: ImpactFilter): { from: string; to: string } {
  const today = new Date();
  const to = filter.endDate || today.toISOString().slice(0, 10);
  if (filter.mode === 'custom' && filter.startDate) return { from: filter.startDate, to };
  return { from: '2020-01-01', to };
}

export function ConsolidatedReportScreen({ route }: { route?: { params?: { groupId?: number } } }) {
  useTransparentStatusBar('light');
  const navigation = useNavigation<any>();
  const [groups, setGroups] = useState<ConsolidatedGroup[]>([]);
  const [groupId, setGroupId] = useState<number | null>(route?.params?.groupId ?? null);
  const [siteId, setSiteId] = useState<number | null>(null);
  const [filter, setFilter] = useState<ImpactFilter>({ mode: 'all_time' });
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [rows, setRows] = useState<ReportCollectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const range = rangeFor(filter);
    try {
      const [nextSummary, nextRows, nextGroups] = await Promise.all([
        consolidatedService.getReportSummary({
          groupId: groupId || undefined,
          siteId: siteId || undefined,
          from: range.from,
          to: range.to,
        }),
        consolidatedService.getReportCollections({
          groupId: groupId || undefined,
          siteId: siteId || undefined,
          from: range.from,
          to: range.to,
          limit: 30,
        }),
        consolidatedService.listGroups(false),
      ]);
      setSummary(nextSummary);
      setRows(nextRows.items);
      setGroups(nextGroups);
    } catch (error) {
      showErrorAlert(error, 'Could not load report');
    } finally {
      setLoading(false);
    }
  }, [filter, groupId, siteId]);

  useFocusEffect(useCallback(() => { setLoading(true); void load(); }, [load]));

  const group = groups.find((item) => item.id === groupId);
  const sites = (group?.sites || []).filter((site) => !site.removedAt);
  const totals = summary?.totals;

  const acceptRate = totals && totals.verifiedKg > 0 ? Math.round((totals.acceptedKg / totals.verifiedKg) * 100) : null;
  const maxSite = Math.max(1, ...(summary?.sites || []).map((site) => site.listedKg || 0));
  const maxCategory = Math.max(1, ...(summary?.categories || []).map((row) => row.acceptedKg || 0));
  const reasonLabel = (value: string) => value.charAt(0) + value.slice(1).toLowerCase().replace(/_/g, ' ');

  return (
    <Screen scrollable backgroundColor={palette.creme} transparentTop contentStyle={styles.screen}>
      <StackHeroHeader title="Consolidated Collections" subtitle="Each site's food and the combined total — counted once" />
      <View style={styles.body}>
        {/* Filters */}
        {groups.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All groups" selected={groupId == null} onPress={() => { setGroupId(null); setSiteId(null); }} />
            {groups.map((item) => (
              <Chip key={item.id} label={item.name} selected={groupId === item.id} onPress={() => { setGroupId(item.id); setSiteId(null); }} />
            ))}
          </ScrollView>
        ) : null}
        {sites.length ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="All sites" icon="layers-outline" selected={siteId == null} onPress={() => setSiteId(null)} />
            {sites.map((site) => (
              <Chip key={site.id} label={site.name} icon="storefront-outline" selected={siteId === site.id} onPress={() => setSiteId(site.id)} />
            ))}
          </ScrollView>
        ) : null}
        <ImpactDateFilter filter={filter} onChange={setFilter} />

        {loading ? <ActivityIndicator color={palette.kale} style={styles.loader} /> : null}

        {!loading && totals ? (
          <>
            {/* Where the food went: verified food split by outcome — counted once */}
            <Surface style={styles.gap12}>
              <View style={styles.rowBetween}>
                <AppText variant="bodyBold">Accepted by charities</AppText>
                {acceptRate != null ? (
                  <AppText variant="meta" color={palette.stone}>{acceptRate}% of verified food</AppText>
                ) : null}
              </View>
              <View style={styles.headline}>
                <AppText variant="metric" style={tabular}>{formatKg(totals.acceptedKg)}</AppText>
                <AppText variant="bodyBold" color={palette.stone}>kg</AppText>
              </View>
              <View style={styles.split}>
                {[
                  { kg: totals.acceptedKg, color: palette.kale },
                  { kg: totals.rejectedKg, color: palette.orange },
                  { kg: totals.unavailableKg, color: '#C9C2B3' },
                ].filter((part) => part.kg > 0).map((part, index) => (
                  <View key={index} style={{ flex: part.kg, backgroundColor: part.color }} />
                ))}
              </View>
              <View style={styles.legendRow}>
                <Legend color={palette.kale} label="Accepted" value={totals.acceptedKg} />
                <Legend color={palette.orange} label="Not accepted" value={totals.rejectedKg} />
                <Legend color="#C9C2B3" label="Not available" value={totals.unavailableKg} />
              </View>
              <Divider />
              <StatGrid>
                <Stat label="Listed by sites" value={formatKg(totals.listedKg)} unit="kg" icon="basket-outline" />
                <Stat label="Verified at the point" value={formatKg(totals.verifiedKg)} unit="kg" icon="shield-checkmark-outline" />
              </StatGrid>
              <AppText variant="meta" color={palette.stone}>
                Only accepted food counts towards impact, once for the site that gave it.
              </AppText>
            </Surface>

            {/* Sites */}
            {summary?.sites.length ? (
              <>
                <SectionTitle title="By site" caption="Listed vs accepted, per outlet" />
                <Surface style={styles.gap14}>
                  {summary.sites.map((site) => (
                    <View key={site.siteId} style={styles.gap6}>
                      <View style={styles.rowBetween}>
                        <AppText variant="bodyBold" numberOfLines={1} style={styles.flex}>{site.siteName}</AppText>
                        <AppText variant="bodyBold" color={palette.kale}>{formatKg(site.acceptedKg)} kg</AppText>
                      </View>
                      <View style={styles.barTrack}>
                        <View style={[styles.barListed, { width: `${(site.listedKg / maxSite) * 100}%` }]} />
                        <View style={[styles.barAccepted, { width: `${(site.acceptedKg / maxSite) * 100}%` }]} />
                      </View>
                      <AppText variant="meta" color={palette.stone}>
                        Listed {formatKg(site.listedKg)} · verified {formatKg(site.verifiedKg)}
                        {site.rejectedKg ? ` · not accepted ${formatKg(site.rejectedKg)}` : ''}
                      </AppText>
                    </View>
                  ))}
                  <View style={styles.legend}>
                    <View style={[styles.legendDot, { backgroundColor: palette.kale }]} />
                    <AppText variant="meta" color={palette.stone}>Accepted</AppText>
                    <View style={[styles.legendDot, { backgroundColor: cc.tintStrong }]} />
                    <AppText variant="meta" color={palette.stone}>Listed</AppText>
                  </View>
                </Surface>
              </>
            ) : null}

            {/* Categories */}
            {summary?.categories.length ? (
              <>
                <SectionTitle title="By food category" />
                <Surface style={styles.gap12}>
                  {summary.categories.map((row) => (
                    <View key={row.category} style={styles.catRow}>
                      <AppText variant="bodySmall" numberOfLines={1} style={styles.catLabel}>{row.category}</AppText>
                      <View style={styles.catTrack}>
                        <View style={[styles.catFill, { width: `${(row.acceptedKg / maxCategory) * 100}%` }]} />
                      </View>
                      <AppText variant="bodyBold" style={styles.catValue}>{formatKg(row.acceptedKg)} kg</AppText>
                    </View>
                  ))}
                </Surface>
              </>
            ) : null}

            {/* Rejections */}
            {summary?.rejectionReasons.length ? (
              <>
                <SectionTitle title="Not accepted — why" />
                <Surface style={styles.reasons}>
                  {summary.rejectionReasons.map((reason) => (
                    <Pill
                      key={reason.reason}
                      label={`${reasonLabel(reason.reason)}${reason.kg != null ? ` · ${formatKg(reason.kg)} kg` : ''}${reason.count != null ? ` · ${reason.count}` : ''}`}
                      color={cc.warnText}
                      background={cc.warnBg}
                    />
                  ))}
                </Surface>
              </>
            ) : null}

            {/* Collections */}
            <SectionTitle title="Collections" />
            {rows.length === 0 ? (
              <EmptyState icon="bar-chart-outline" title="No collections in this period" body="Completed collections appear here with their totals." />
            ) : null}
            {rows.map((row) => (
              <Surface key={row.id} onPress={() => navigation.navigate('CollectionDashboard', { collectionId: row.id })} style={styles.collection}>
                <View style={styles.flex}>
                  <AppText variant="bodyBold">{formatDateInZone(row.scheduledDate.slice(0, 10))}</AppText>
                  <AppText variant="meta" color={palette.stone} numberOfLines={1}>
                    {[row.groupName, row.pointName].filter(Boolean).join(' · ')}
                  </AppText>
                  <View style={styles.collectionPills}>
                    <CollectionStatusBadge status={row.status} />
                    {row.acceptedKg != null ? (
                      <Pill label={`${formatKg(row.acceptedKg)} kg accepted`} color={palette.kale} background={cc.tint} />
                    ) : null}
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
              </Surface>
            ))}
          </>
        ) : null}
      </View>
    </Screen>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <View>
        <AppText variant="meta" color={palette.stone}>{label}</AppText>
        <AppText variant="bodyBold" style={tabular}>{formatKg(value)} kg</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headline: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  split: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: cc.muted, gap: 2 },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  screen: { paddingBottom: 40 },
  body: { paddingHorizontal: normalize(16), paddingTop: normalize(4), gap: normalize(12) },
  flex: { flex: 1, minWidth: 0 },
  loader: { marginTop: 24 },
  eyebrow: { letterSpacing: 0.8 },
  gap6: { gap: 6 },
  gap12: { gap: 12 },
  gap14: { gap: 14 },
  chips: { gap: 8, paddingRight: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  barTrack: { height: 10, borderRadius: 5, backgroundColor: cc.muted, overflow: 'hidden' },
  barListed: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: cc.tintStrong, borderRadius: 5 },
  barAccepted: { position: 'absolute', left: 0, top: 0, bottom: 0, backgroundColor: palette.kale, borderRadius: 5 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginLeft: 4 },
  catRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  catLabel: { width: normalize(96) },
  catTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: cc.muted, overflow: 'hidden' },
  catFill: { height: '100%', backgroundColor: palette.middlegreen, borderRadius: 4 },
  catValue: { minWidth: normalize(56), textAlign: 'right' },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  collection: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  collectionPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
});
