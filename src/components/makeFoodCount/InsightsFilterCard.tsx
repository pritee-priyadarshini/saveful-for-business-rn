import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppDateTimePicker as DateTimePicker, type DateTimePickerEvent } from '@/components/AppDateTimePicker';
import { AppText } from '@/components/AppText';
import { MfcCta } from '@/components/makeFoodCount/MfcAppUi';
import { SavefulModal } from '@/components/SavefulModal';
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
import { normalize } from '@/utils/responsive';

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


  const scopeLabel = (() => {
    const site = siteId != null ? options.sites.find((row) => row.id === siteId)?.name : null;
    if (site) return site;
    const territory = territoryId != null ? options.territories.find((row) => row.id === territoryId)?.name : null;
    if (territory) return territory;
    const group = groupId != null ? options.groups.find((row) => row.id === groupId)?.name : null;
    return group ?? 'All sites';
  })();
  const filterTitle = organisationName ? `Filter ${organisationName} results` : 'Filter results';

  const [sheetOpen, setSheetOpen] = useState(false);
  const activeCount = [groupId, territoryId, clusterId, siteId].filter((value) => value != null).length;
  const rangeLabel = `${formatDisplayDate(from)} – ${formatDisplayDate(to)}`;

  const choosePreset = (value: (typeof MFC_PERIOD_PRESETS)[number]['value']) => {
    setPreset(value);
    // Custom dates are picked in the sheet.
    if (value === 'custom') setSheetOpen(true);
  };

  return (
    <View style={styles.bar}>
      {/* Period: one tap, always visible. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} accessibilityRole="radiogroup">
        {MFC_PERIOD_PRESETS.map((option) => {
          const on = preset === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => choosePreset(option.value)}
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
      </ScrollView>

      {/* What is applied, and the way into the rest of the filters. */}
      <View style={styles.summaryRow}>
        <View style={styles.flex}>
          <AppText variant="bodySmall" color={MFC.ink} style={styles.bold} numberOfLines={1}>
            {scopeLabel}
          </AppText>
          <AppText variant="meta" color={MFC.muted} numberOfLines={1}>
            {rangeLabel}
          </AppText>
        </View>
        {hasFilters ? (
          <Pressable onPress={clearFilters} hitSlop={8} accessibilityRole="button" accessibilityLabel="Clear filters" style={styles.clearBtn}>
            <AppText variant="meta" color={MFC.purple} style={styles.bold}>
              Clear
            </AppText>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => setSheetOpen(true)}
          accessibilityRole="button"
          accessibilityLabel={`${filterTitle}${activeCount ? `, ${activeCount} applied` : ''}`}
          style={({ pressed }) => [styles.filterBtn, activeCount > 0 && styles.filterBtnOn, pressed && styles.pressed]}
        >
          <Ionicons name="options-outline" size={normalize(16)} color={activeCount > 0 ? MFC.white : MFC.purple} />
          <AppText variant="meta" color={activeCount > 0 ? MFC.white : MFC.purple} style={styles.bold}>
            Filters
          </AppText>
          {activeCount > 0 ? (
            <View style={styles.countBadge}>
              <AppText variant="meta" color={MFC.purple} style={styles.countText}>
                {activeCount}
              </AppText>
            </View>
          ) : null}
        </Pressable>
      </View>

      <SavefulModal
        visible={sheetOpen}
        onClose={() => {
          setPickerTarget(null);
          setSheetOpen(false);
        }}
        title="Filters"
        subtitle={organisationName ? `${organisationName} · applies to every Food Impact view` : 'Applies to every Food Impact view'}
      >
        <View style={styles.sheetBody}>
          <View style={styles.grid}>
            <DateField label="From" value={from} active={pickerTarget === 'from'} style={styles.columnHalf} onPress={() => openPicker('from')} />
            <DateField label="To" value={to} active={pickerTarget === 'to'} style={styles.columnHalf} onPress={() => openPicker('to')} />
          </View>

          {/* iOS: the picker opens inside the sheet (no second modal on top of it). */}
          {pickerTarget && Platform.OS === 'ios' ? (
            <View style={styles.inlinePicker}>
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
                <MfcCta label="Cancel" variant="secondary" compact onPress={() => setPickerTarget(null)} style={styles.flex} />
                <MfcCta label={`Set ${pickerTarget === 'from' ? 'from' : 'to'} date`} compact onPress={() => applyPicked(draftDate)} style={styles.flex} />
              </View>
            </View>
          ) : null}
          {pickerTarget && Platform.OS === 'android' ? (
            <DateTimePicker value={draftDate} mode="date" display="default" maximumDate={startOfToday()} onChange={onAndroidChange} />
          ) : null}

          {visibleFields.map((field) => (
            <View key={field.key} style={styles.field}>
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

          <View style={styles.sheetActions}>
            <MfcCta label="Clear all" variant="secondary" onPress={clearFilters} disabled={!hasFilters} style={styles.flex} />
            <MfcCta
              label="Show results"
              onPress={() => {
                setPickerTarget(null);
                setSheetOpen(false);
              }}
              style={styles.flex}
            />
          </View>
        </View>
      </SavefulModal>
    </View>
  );
}

function DateField({
  label,
  value,
  active,
  onPress,
  style,
}: {
  label: string;
  value: string;
  active?: boolean;
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
        style={({ pressed }) => [styles.dateButton, active && styles.dateButtonOn, pressed && styles.pressed]}
      >
        <AppText variant="bodySmall" color={MFC.ink} numberOfLines={1} style={styles.flex}>
          {display}
        </AppText>
        <Ionicons name="calendar-outline" size={normalize(16)} color={MFC.purple} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  bold: { fontFamily: 'Saveful-Bold' },
  pressed: { opacity: 0.85 },
  bar: {
    gap: 10,
    padding: normalize(12),
    borderRadius: 14,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
    backgroundColor: MFC.white,
  },
  chips: { flexDirection: 'row', gap: 6 },
  preset: {
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: MFC.chipBorder,
    backgroundColor: MFC.white,
  },
  presetOn: { backgroundColor: MFC.purple, borderColor: MFC.purple },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  clearBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 4 },
  filterBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: MFC.lilac,
  },
  filterBtnOn: { backgroundColor: MFC.purple },
  countBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: MFC.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countText: { fontFamily: 'Saveful-Bold', fontSize: normalize(13) },
  sheetBody: { gap: 14, paddingTop: 6 },
  field: { gap: 6 },
  hint: { fontSize: normalize(13) },
  grid: { flexDirection: 'row', gap: 10 },
  columnHalf: { flex: 1 },
  inlinePicker: { gap: 8, borderRadius: 12, backgroundColor: MFC.panel, padding: 8 },
  dateButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: MFC.white,
    borderWidth: 1,
    borderColor: MFC.inputBorder,
    borderRadius: 10,
    paddingHorizontal: normalize(12),
  },
  dateButtonOn: { borderColor: MFC.purple, borderWidth: 1.5 },
  sheetActions: { flexDirection: 'row', gap: 10 },
});
