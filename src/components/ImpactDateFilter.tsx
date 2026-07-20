import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Modal,
} from 'react-native';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
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

export function ImpactDateFilter({ filter, onChange }: Props) {
  const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | null>(null);
  const [draftDate, setDraftDate] = useState(new Date());

  const openPicker = (target: 'from' | 'to') => {
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
      <AppText variant="bodyBold" style={styles.title}>
        Select time period
      </AppText>

      <Pressable
        style={[styles.allTimeChip, filter.mode === 'all_time' && styles.allTimeChipActive]}
        onPress={() => onChange({ mode: 'all_time' })}
        accessibilityRole="button"
        accessibilityState={{ selected: filter.mode === 'all_time' }}
      >
        <Ionicons
          name="infinite-outline"
          size={normalize(16)}
          color={filter.mode === 'all_time' ? palette.white : palette.kale}
        />
        <AppText
          style={[
            styles.allTimeText,
            filter.mode === 'all_time' && styles.allTimeTextActive,
          ]}
        >
          All time
        </AppText>
      </Pressable>

      <View style={styles.dateRow}>
        <Pressable style={styles.dateField} onPress={() => openPicker('from')}>
          <AppText style={styles.dateLabel}>From</AppText>
          <View style={styles.dateValueRow}>
            <Ionicons name="calendar-outline" size={normalize(15)} color={palette.kale} />
            <AppText style={styles.dateValue}>
              {formatDisplayDate(filter.mode === 'custom' ? filter.startDate : undefined)}
            </AppText>
          </View>
        </Pressable>

        <Pressable style={styles.dateField} onPress={() => openPicker('to')}>
          <AppText style={styles.dateLabel}>To</AppText>
          <View style={styles.dateValueRow}>
            <Ionicons name="calendar-outline" size={normalize(15)} color={palette.kale} />
            <AppText style={styles.dateValue}>
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
  title: {
    color: palette.black,
    fontSize: normalize(14),
    textTransform: 'none',
  },
  allTimeChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
    borderWidth: 1.5,
    borderColor: palette.kale,
    backgroundColor: palette.creme,
    borderRadius: normalize(20),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(0.8),
  },
  allTimeChipActive: {
    backgroundColor: palette.kale,
  },
  allTimeText: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    color: palette.kale,
    textTransform: 'none',
  },
  allTimeTextActive: {
    color: palette.white,
  },
  dateRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  dateField: {
    flex: 1,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: `${palette.kale}44`,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    gap: hp(0.35),
  },
  dateLabel: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(11),
    color: palette.midgray,
    textTransform: 'uppercase',
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1.5),
  },
  dateValue: {
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(13),
    color: palette.black,
    textTransform: 'none',
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
