import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import {
  AppDateTimePicker as DateTimePicker,
  type DateTimePickerEvent,
} from '@/components/AppDateTimePicker';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, useResponsiveLayout, wp } from '@/utils/responsive';
import type { ImpactFilter } from '@/store/impactStore';

type Props = {
  filter: ImpactFilter;
  onChange: (next: ImpactFilter) => void;
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

export function toApiDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(isoDate?: string): string {
  if (!isoDate) return 'Select';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return 'Select';
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function parseApiDate(isoDate?: string): Date {
  if (!isoDate) return startOfDay(new Date());
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

const PRESET_DAYS = [7, 30, 90] as const;

type PeriodChoice = 'all_time' | (typeof PRESET_DAYS)[number];

const PERIOD_OPTIONS: { value: PeriodChoice; label: string }[] = [
  { value: 'all_time', label: 'All time' },
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 90 days' },
];

/** Inclusive of today, so "7 days" covers today plus the six before it. */
function presetRange(days: number) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { startDate: toApiDate(start), endDate: toApiDate(end) };
}

function isPresetActive(filter: ImpactFilter, days: number) {
  if (filter.mode !== 'custom') return false;
  const range = presetRange(days);
  return filter.startDate === range.startDate && filter.endDate === range.endDate;
}

function activePeriod(filter: ImpactFilter): PeriodChoice | 'custom' {
  if (filter.mode === 'all_time') return 'all_time';
  for (const days of PRESET_DAYS) {
    if (isPresetActive(filter, days)) return days;
  }
  return 'custom';
}

export function ImpactDateFilter({ filter, onChange }: Props) {
  const r = useResponsiveLayout();
  const compact = r.isTablet;
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [draftDate, setDraftDate] = useState(new Date());
  const [periodOpen, setPeriodOpen] = useState(false);
  const selectedPeriod = activePeriod(filter);
  const periodLabel =
    PERIOD_OPTIONS.find((option) => option.value === selectedPeriod)?.label ?? 'Custom range';

  const choosePeriod = (value: PeriodChoice) => {
    setPeriodOpen(false);
    if (value === 'all_time') {
      onChange({ mode: 'all_time' });
      return;
    }
    onChange({ mode: 'custom', ...presetRange(value) });
  };

  const openPicker = (target: 'from' | 'to') => {
    setPeriodOpen(false);
    const seed =
      target === 'from'
        ? parseApiDate(filter.startDate)
        : parseApiDate(filter.endDate ?? filter.startDate);
    setDraftDate(seed);
    setPickerTarget(target);
  };

  const applyPickedDate = (date: Date) => {
    if (!pickerTarget) return;

    const picked = toApiDate(date);
    let startDate = filter.startDate;
    let endDate = filter.endDate;

    if (pickerTarget === 'from') {
      startDate = picked;
      if (endDate && endDate < startDate) {
        endDate = startDate;
      }
      if (!endDate) {
        endDate = toApiDate(new Date());
      }
    } else {
      endDate = picked;
      if (!startDate) {
        startDate = endDate;
      }
      if (startDate && endDate < startDate) {
        startDate = endDate;
      }
    }

    onChange({
      mode: 'custom',
      startDate,
      endDate,
    });
    setPickerTarget(null);
  };

  const onAndroidChange = (event: DateTimePickerEvent, date?: Date) => {
    if (event.type === 'dismissed') {
      setPickerTarget(null);
      return;
    }
    if (date) applyPickedDate(date);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.periodBlock}>
        <AppText style={[styles.dateLabel, compact && styles.dateLabelCompact]}>
          Time period
        </AppText>
        <Pressable
          style={[
            styles.periodField,
            compact && styles.periodFieldCompact,
            periodOpen && styles.dateFieldActive,
          ]}
          onPress={() => setPeriodOpen((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel={`Time period, ${periodLabel}`}
          accessibilityState={{ expanded: periodOpen }}
        >
          <AppText
            style={[styles.periodValue, compact && styles.periodValueCompact]}
            numberOfLines={1}
          >
            {periodLabel}
          </AppText>
          <Ionicons
            name={periodOpen ? 'chevron-up' : 'chevron-down'}
            size={compact ? 14 : normalize(16)}
            color={palette.kale}
          />
        </Pressable>
        {periodOpen ? (
          <View style={styles.periodMenu}>
            {PERIOD_OPTIONS.map((option) => {
              const selected = option.value === selectedPeriod;
              return (
                <Pressable
                  key={String(option.value)}
                  style={[styles.periodOption, selected && styles.periodOptionOn]}
                  onPress={() => choosePeriod(option.value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                >
                  <AppText
                    style={[
                      styles.periodOptionText,
                      compact && styles.periodValueCompact,
                      selected && styles.periodOptionTextOn,
                    ]}
                  >
                    {option.label}
                  </AppText>
                  {selected ? (
                    <Ionicons name="checkmark" size={normalize(16)} color={palette.kale} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}
      </View>

      <View style={styles.dateRow}>
        <Pressable
          style={[
            styles.dateField,
            compact && styles.dateFieldCompact,
            filter.mode === 'custom' && styles.dateFieldActive,
          ]}
          onPress={() => openPicker('from')}
        >
          <AppText style={[styles.dateLabel, compact && styles.dateLabelCompact]}>From</AppText>
          <View style={styles.dateValueRow}>
            <Ionicons name="calendar-outline" size={compact ? 13 : normalize(15)} color={palette.kale} />
            <AppText
              style={[styles.dateValue, compact && styles.dateValueCompact]}
              numberOfLines={1}
            >
              {formatDisplayDate(filter.mode === 'custom' ? filter.startDate : undefined)}
            </AppText>
          </View>
        </Pressable>

        <Pressable
          style={[
            styles.dateField,
            compact && styles.dateFieldCompact,
            filter.mode === 'custom' && styles.dateFieldActive,
          ]}
          onPress={() => openPicker('to')}
        >
          <AppText style={[styles.dateLabel, compact && styles.dateLabelCompact]}>To</AppText>
          <View style={styles.dateValueRow}>
            <Ionicons name="calendar-outline" size={compact ? 13 : normalize(15)} color={palette.kale} />
            <AppText
              style={[styles.dateValue, compact && styles.dateValueCompact]}
              numberOfLines={1}
            >
              {formatDisplayDate(filter.mode === 'custom' ? filter.endDate : undefined)}
            </AppText>
          </View>
        </Pressable>
      </View>

      {pickerTarget && Platform.OS === 'android' ? (
        <DateTimePicker
          value={draftDate}
          mode="date"
          display="default"
          maximumDate={endOfDay(new Date())}
          onChange={onAndroidChange}
        />
      ) : null}

      {pickerTarget && Platform.OS === 'ios' ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setPickerTarget(null)}>
          <Pressable style={styles.modalBackdrop} onPress={() => setPickerTarget(null)}>
            <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
              <AppText variant="bodyBold" style={styles.modalTitle}>
                Select {pickerTarget === 'from' ? 'from' : 'to'} date
              </AppText>
              <DateTimePicker
                value={draftDate}
                mode="date"
                display="spinner"
                maximumDate={endOfDay(new Date())}
                onChange={(_, date) => {
                  if (date) setDraftDate(date);
                }}
              />
              <View style={styles.modalActions}>
                <Pressable style={styles.modalCancel} onPress={() => setPickerTarget(null)}>
                  <AppText style={styles.modalCancelText}>Cancel</AppText>
                </Pressable>
                <Pressable
                  style={styles.modalConfirm}
                  onPress={() => applyPickedDate(draftDate)}
                >
                  <AppText style={styles.modalConfirmText}>Apply</AppText>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: hp(1),
    marginBottom: hp(0.5),
  },
  periodBlock: {
    gap: hp(0.45),
  },
  periodField: {
    minHeight: normalize(44),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: `${palette.kale}44`,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
  },
  periodFieldCompact: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
  },
  periodValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  periodValueCompact: {
    fontSize: 13,
    lineHeight: 17,
  },
  periodMenu: {
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: `${palette.kale}44`,
    borderRadius: normalize(12),
    overflow: 'hidden',
  },
  periodOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.15),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E2D6',
  },
  periodOptionOn: {
    backgroundColor: '#F4F7F1',
  },
  periodOptionText: {
    flex: 1,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(14),
    color: palette.black,
    textTransform: 'none',
  },
  periodOptionTextOn: {
    fontFamily: 'Saveful-Bold',
    color: palette.kale,
  },
  dateRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  dateField: {
    flex: 1,
    minWidth: 0,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: `${palette.kale}44`,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: hp(0.35),
  },
  dateFieldCompact: {
    minHeight: 52,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    gap: 4,
  },
  dateFieldActive: {
    borderColor: palette.kale,
    backgroundColor: '#F7FAF7',
  },
  dateLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'uppercase',
  },
  dateLabelCompact: {
    fontSize: 10,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    minWidth: 0,
  },
  dateValue: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    color: palette.black,
    textTransform: 'none',
  },
  dateValueCompact: {
    fontSize: 12,
    lineHeight: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: palette.creme,
    borderTopLeftRadius: normalize(18),
    borderTopRightRadius: normalize(18),
    padding: wp(4),
    paddingBottom: hp(3),
  },
  modalTitle: {
    textAlign: 'center',
    marginBottom: hp(0.5),
    textTransform: 'none',
  },
  modalActions: {
    flexDirection: 'row',
    gap: wp(2),
    marginTop: hp(1),
  },
  modalCancel: {
    flex: 1,
    minHeight: normalize(44),
    borderRadius: normalize(12),
    borderWidth: 1.5,
    borderColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelText: {
    fontFamily: 'Saveful-Bold',
    color: palette.kale,
    textTransform: 'none',
  },
  modalConfirm: {
    flex: 1,
    minHeight: normalize(44),
    borderRadius: normalize(12),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalConfirmText: {
    fontFamily: 'Saveful-Bold',
    color: palette.white,
    textTransform: 'none',
  },
});
