import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';

import { AppDateTimePicker, type DateTimePickerEvent } from '@/components/AppDateTimePicker';
import { AppText } from '@/components/AppText';
import { Chip, cc } from '@/components/consolidated/ui';
import { normalize } from '@/utils/responsive';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme/colors';
import type { Recurrence } from '@/types/consolidated';

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];

const MODES: { value: Recurrence; label: string }[] = [
  { value: 'ONE_OFF', label: 'One-off' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'SELECTED_WEEKDAYS', label: 'Weekdays' },
  { value: 'CUSTOM_DATES', label: 'Custom dates' },
];

function toKey(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

type Props = {
  recurrence: Recurrence;
  onRecurrence: (value: Recurrence) => void;
  startDate: string;
  endDate: string;
  onStartDate: (value: string) => void;
  onEndDate: (value: string) => void;
  daysOfWeek: number[];
  onDays: (days: number[]) => void;
  customDates: string[];
  onCustomDates: (dates: string[]) => void;
};

export function RecurrencePicker(props: Props) {
  const [open, setOpen] = useState<'start' | 'end' | 'custom' | null>(null);
  const [draft, setDraft] = useState(new Date());

  const apply = (which: 'start' | 'end' | 'custom', date: Date) => {
    const key = toKey(date);
    if (which === 'start') props.onStartDate(key);
    if (which === 'end') props.onEndDate(key);
    if (which === 'custom' && !props.customDates.includes(key)) {
      props.onCustomDates([...props.customDates, key].sort());
    }
  };

  const onChange = (event: DateTimePickerEvent, date?: Date) => {
    if (!open) return;
    if (Platform.OS === 'android') {
      setOpen(null);
      if (event.type === 'dismissed' || !date) return;
      apply(open, date);
      return;
    }
    if (date) setDraft(date);
  };

  const pretty = (key: string) => {
    if (!key) return '';
    const date = new Date(`${key}T12:00:00Z`);
    return Number.isNaN(date.getTime())
      ? key
      : date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.chips}>
        {MODES.map((mode) => (
          <Chip key={mode.value} label={mode.label} selected={mode.value === props.recurrence} onPress={() => props.onRecurrence(mode.value)} />
        ))}
      </View>

      {props.recurrence !== 'CUSTOM_DATES' ? (
        <View style={styles.dateRow}>
          <DateField
            label={props.recurrence === 'ONE_OFF' ? 'Date' : 'Starts'}
            value={pretty(props.startDate) || 'Select date'}
            onPress={() => { setDraft(new Date()); setOpen('start'); }}
          />
          {props.recurrence !== 'ONE_OFF' ? (
            <DateField
              label="Ends (optional)"
              value={pretty(props.endDate) || 'No end date'}
              muted={!props.endDate}
              onPress={() => { setDraft(new Date()); setOpen('end'); }}
              onClear={props.endDate ? () => props.onEndDate('') : undefined}
            />
          ) : null}
        </View>
      ) : null}

      {props.recurrence === 'WEEKLY' || props.recurrence === 'SELECTED_WEEKDAYS' ? (
        <View>
          <AppText variant="meta" color={palette.stone} style={styles.hint}>
            {props.recurrence === 'WEEKLY' ? 'Repeat every week on' : 'Repeat on these days'}
          </AppText>
          <View style={styles.weekdays}>
            {WEEKDAYS.map((day) => {
              const on = props.daysOfWeek.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  style={[styles.day, on && styles.dayOn]}
                  onPress={() => {
                    if (props.recurrence === 'WEEKLY') {
                      props.onDays([day.value]);
                      return;
                    }
                    props.onDays(on ? props.daysOfWeek.filter((value) => value !== day.value) : [...props.daysOfWeek, day.value].sort());
                  }}
                >
                  <AppText variant="bodyBold" color={on ? palette.white : palette.primary}>{day.label.slice(0, 2)}</AppText>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      {props.recurrence === 'CUSTOM_DATES' ? (
        <View style={styles.wrap}>
          <Pressable style={styles.addDate} onPress={() => { setDraft(new Date()); setOpen('custom'); }}>
            <Ionicons name="add-circle" size={normalize(18)} color={palette.kale} />
            <AppText variant="bodyBold" color={palette.kale}>Add a date</AppText>
          </Pressable>
          <View style={styles.chips}>
            {props.customDates.map((date) => (
              <Pressable
                key={date}
                style={styles.dateChip}
                onPress={() => props.onCustomDates(props.customDates.filter((value) => value !== date))}
                accessibilityLabel={`Remove ${pretty(date)}`}
              >
                <AppText variant="meta" color={palette.primary}>{pretty(date)}</AppText>
                <Ionicons name="close" size={normalize(13)} color={palette.primary} />
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}

      {open && (Platform.OS === 'ios' || Platform.OS === 'android') ? (
        <View style={styles.pickerWrap}>
          <AppDateTimePicker value={draft} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={onChange} />
          {Platform.OS === 'ios' ? (
            <Pressable
              style={styles.done}
              onPress={() => {
                apply(open, draft);
                setOpen(null);
              }}
            >
              <AppText variant="bodyBold" color={palette.white}>Use this date</AppText>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function DateField({
  label, value, onPress, muted, onClear,
}: { label: string; value: string; onPress: () => void; muted?: boolean; onClear?: () => void }) {
  return (
    <Pressable style={styles.field} onPress={onPress}>
      <Ionicons name="calendar-outline" size={normalize(18)} color={palette.kale} />
      <View style={styles.fieldCopy}>
        <AppText variant="meta" color={palette.stone}>{label}</AppText>
        <AppText variant="bodyBold" color={muted ? palette.stone : palette.black} numberOfLines={1}>{value}</AppText>
      </View>
      {onClear ? (
        <Pressable onPress={onClear} hitSlop={8}>
          <Ionicons name="close-circle" size={normalize(16)} color={palette.stone} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  dateRow: { flexDirection: 'row', gap: 8 },
  field: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: palette.white,
    borderRadius: cc.radiusSm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: cc.hairline,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldCopy: { flex: 1, minWidth: 0 },
  hint: { marginBottom: 6 },
  weekdays: { flexDirection: 'row', justifyContent: 'space-between', gap: 6 },
  day: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: normalize(44),
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  dayOn: { backgroundColor: palette.primary },
  addDate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: palette.kale,
    borderRadius: cc.radiusSm,
    paddingVertical: 12,
    justifyContent: 'center',
    backgroundColor: cc.tint,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: palette.creme3,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  pickerWrap: { backgroundColor: palette.white, borderRadius: cc.radiusSm, padding: 8 },
  done: {
    alignSelf: 'stretch',
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: palette.primary,
    marginTop: 4,
  },
});
