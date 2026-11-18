import React, { useMemo, useState } from 'react';
import { Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppDateTimePicker as DateTimePicker, type DateTimePickerEvent } from '@/components/AppDateTimePicker';
import { AppText } from '@/components/AppText';
import { MfcCard, MfcCta } from '@/components/makeFoodCount/MfcAppUi';
import { MFC } from '@/constants/makeFoodCount';
import { formatDisplayDate } from '@/components/ImpactDateFilter';
import { WhiteSelect } from '@/components/WhiteSelect';
import {
  getInsightsOptions,
  MFC_PERIOD_PRESETS,
  parseIsoDate,
  toIsoDate,
  useMfcInsightsStore,
  type MfcFilterKey,
} from '@/store/mfcInsightsStore';
import { palette } from '@/theme/colors';
import { normalize, useResponsiveLayout } from '@/utils/responsive';

/** 0 stands for "All" (WhiteSelect values are never null). Real ids are positive. */
const ALL = 0;

type SelectField = {
  key: MfcFilterKey;
  label: string;
  allLabel: string;
  hint?: string;
  options: { value: number; label: string }[];
  hidden?: boolean;
};

function startOfToday() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
}

/**
 * "Filter <Organisation> results" card for Food Impact (MFC-010). All state lives in useMfcInsightsStore,
 * so the three views and the source drill-down share one filter.
 */
export function InsightsFilterCard({ organisationName }: { organisationName: string }) {
  const r = useResponsiveLayout();
  const preset = useMfcInsightsStore((s) => s.periodPreset);
  const from = useMfcInsightsStore((s) => s.from);
  const to = useMfcInsightsStore((s) => s.to);
  const groupId = useMfcInsightsStore((s) => s.groupId);
  const territoryId = useMfcInsightsStore((s) => s.territoryId);
  const clusterId = useMfcInsightsStore((s) => s.clusterId);
  const siteId = useMfcInsightsStore((s) => s.siteId);
  const filters = useMfcInsightsStore((s) => s.filters);
  const filtersLoading = useMfcInsightsStore((s) => s.filtersLoading);
  const setPreset = useMfcInsightsStore((s) => s.setPreset);
  const setRange = useMfcInsightsStore((s) => s.setRange);
  const setFilter = useMfcInsightsStore((s) => s.setFilter);
  const clearFilters = useMfcInsightsStore((s) => s.clearFilters);

  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [draftDate, setDraftDate] = useState(new Date());

  const options = useMemo(
    () => getInsightsOptions(filters, { groupId, territoryId, clusterId }),
    [filters, groupId, territoryId, clusterId],
  );

  const fields: SelectField[] = [
    {
      key: 'groupId',
      label: 'Group',
      hint: 'Business unit',
      allLabel: 'All',
      options: options.groups.map((row) => ({ value: row.id, label: row.name })),
      hidden: options.groups.length === 0,
    },
    {
      key: 'territoryId',
      label: 'Territory',
      hint: 'Geography',
      allLabel: 'All',
      options: options.territories.map((row) => ({ value: row.id, label: row.name })),
      hidden: options.territories.length === 0,
    },
    {
      key: 'clusterId',
      label: 'Cluster',
      allLabel: 'All',
      options: options.clusters.map((row) => ({ value: row.id, label: row.name })),
      // Only when the organisation has clusters at all.
      hidden: !filters || filters.clusters.length === 0,
    },
    {
      key: 'siteId',
      label: 'Site',
      allLabel: 'All',
      options: options.sites.map((row) => ({ value: row.id, label: row.name })),
      hidden: options.sites.length === 0 && !filtersLoading,
    },
  ];
  const selected: Record<MfcFilterKey, number | null> = { groupId, territoryId, clusterId, siteId };
  const visibleFields = fields.filter((field) => !field.hidden);

  const hasFilters =
    groupId != null || territoryId != null || clusterId != null || siteId != null || preset !== 'this_month';

  const openPicker = (target: 'from' | 'to') => {
    setDraftDate(parseIsoDate(target === 'from' ? from : to));
    setPickerTarget(target);
  };

  const applyPicked = (date: Date) => {
    const picked = toIsoDate(date);
    if (pickerTarget === 'from') setRange(picked, to < picked ? picked : to);
    else if (pickerTarget === 'to') setRange(from > picked ? picked : from, picked);
    setPickerTarget(null);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setPickerTarget(null);
      return;
    }
    if (date) applyPicked(date);
  };

  const columnStyle = r.isTablet ? styles.columnTablet : styles.columnPhone;

  const presetLabel = MFC_PERIOD_PRESETS.find((option) => option.value === preset)?.label ?? 'Custom';
  const scopeLabel = (() => {
    const site = siteId != null ? options.sites.find((row) => row.id === siteId)?.name : null;
    if (site) return site;
    const territory = territoryId != null ? options.territories.find((row) => row.id === territoryId)?.name : null;
    if (territory) return territory;
    const group = groupId != null ? options.groups.find((row) => row.id === groupId)?.name : null;
    return group ?? 'All sites';
  })();
  const filterTitle = organisationName ? `Filter ${organisationName} results` : 'Filter results';
  const summary = `${presetLabel} · ${formatDisplayDate(from)} – ${formatDisplayDate(to)} · ${scopeLabel}`;

  return (
    <MfcCard style={styles.card}>
      <View style={styles.head}>
        <AppText variant="bodyBold" color={MFC.ink} style={[styles.flex, styles.bold]} accessibilityRole="header">
          {filterTitle}
        </AppText>
        <Pressable
          onPress={clearFilters}
          disabled={!hasFilters}
          accessibilityRole="button"
          accessibilityLabel="Clear filters"
          hitSlop={10}
          style={({ pressed }) => [styles.clearBtn, (!hasFilters || pressed) && { opacity: hasFilters ? 0.75 : 0.45 }]}
        >
          <AppText variant="meta" color={MFC.purple} style={styles.bold}>
            Clear filters
          </AppText>
          <Ionicons name="refresh" size={normalize(13)} color={MFC.purple} />
        </Pressable>
      </View>

      <View style={styles.field}>
        <AppText variant="meta" color={MFC.ink} style={styles.bold}>
          Reporting period
        </AppText>
        <View style={styles.chips} accessibilityRole="radiogroup">
          {MFC_PERIOD_PRESETS.map((option) => {
            const on = preset === option.value;
            return (
              <Pressable
                key={option.value}
                onPress={() => setPreset(option.value)}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.preset, on && styles.presetOn, pressed && styles.pressed]}
              >
                <AppText variant="meta" color={on ? MFC.white : MFC.purple} style={styles.bold}>
                  {option.label}
                </AppText>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.grid}>
        <DateField label="From" value={from} style={styles.columnHalf} onPress={() => openPicker('from')} />
        <DateField label="To" value={to} style={styles.columnHalf} onPress={() => openPicker('to')} />
        {visibleFields.map((field) => (
          <View key={field.key} style={[styles.field, columnStyle]}>
            <View>
              <AppText variant="meta" color={MFC.ink} style={styles.bold}>
                {field.label}
              </AppText>
              {field.hint ? (
                <AppText variant="meta" color={MFC.muted} style={styles.hint}>
                  {field.hint}
                </AppText>
              ) : null}
            </View>
            <WhiteSelect<number>
              placeholder={field.allLabel}
              value={selected[field.key] ?? ALL}
              options={[{ value: ALL, label: field.allLabel }, ...field.options]}
              onChange={(value) => setFilter(field.key, value === ALL ? null : value)}
              loading={filtersLoading && !filters}
              emptyText="No options"
            />
          </View>
        ))}
      </View>

      <AppText variant="meta" color={MFC.muted}>
        Filters apply to every Impact tab and category drill-down.
      </AppText>

      {pickerTarget && Platform.OS === 'android' ? (
        <DateTimePicker value={draftDate} mode="date" display="default" maximumDate={startOfToday()} onChange={onAndroidChange} />
      ) : null}

      {pickerTarget && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPickerTarget(null)} supportedOrientations={['portrait', 'landscape']}>
          <Pressable style={styles.backdrop} onPress={() => setPickerTarget(null)}>
            <Pressable style={styles.sheet} onPress={(event) => event.stopPropagation()}>
              <AppText variant="bodyBold" style={styles.sheetTitle}>
                {pickerTarget === 'from' ? 'Select from date' : 'Select to date'}
              </AppText>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                maximumDate={startOfToday()}
                onChange={(_, date) => {
                  if (date) setDraftDate(date);
                }}
              />
              <View style={styles.sheetActions}>
                <MfcCta label="Cancel" variant="secondary" onPress={() => setPickerTarget(null)} style={styles.flex} />
                <MfcCta label="Apply" onPress={() => applyPicked(draftDate)} style={styles.flex} />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </MfcCard>
  );
}

function DateField({
  label,
  value,
  onPress,
  style,
}: {
  label: string;
  value: string;
  onPress: () => void;
  style?: object;
}) {
  const display = formatDisplayDate(value);
  return (
    <View style={[styles.field, style]}>
      <AppText variant="meta" color={MFC.ink} style={styles.bold}>
        {label}
      </AppText>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${label} date, ${display}`}
        style={({ pressed }) => [styles.dateButton, pressed && styles.pressed]}
      >
        <AppText variant="bodySmall" color={MFC.ink} numberOfLines={1} style={styles.flex}>
          {display}
        </AppText>
        <Ionicons name="calendar-outline" size={normalize(16)} color={MFC.ink} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: 'Saveful-Bold' },
  card: { gap: 14, padding: normalize(16) },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 36 },
  field: { gap: 6 },
  hint: { fontSize: normalize(11) },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  preset: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: MFC.chipBorder,
    backgroundColor: MFC.white,
  },
  presetOn: { backgroundColor: MFC.purple, borderColor: MFC.purple },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 12 },
  columnPhone: { width: '100%' },
  columnTablet: { width: '48.5%' },
  columnHalf: { flexBasis: '45%', flexGrow: 1 },
  dateButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: MFC.white,
    borderWidth: 1,
    borderColor: MFC.inputBorder,
    borderRadius: 8,
    paddingHorizontal: normalize(12),
  },
  pressed: { opacity: 0.85 },
  backdrop: { flex: 1, backgroundColor: 'rgba(26, 26, 27, 0.4)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  sheet: { width: '100%', maxWidth: 420, backgroundColor: MFC.white, borderRadius: 20, padding: 18, gap: 8 },
  sheetTitle: { textAlign: 'center', textTransform: 'none' },
  sheetActions: { flexDirection: 'row', gap: 10 },
});
