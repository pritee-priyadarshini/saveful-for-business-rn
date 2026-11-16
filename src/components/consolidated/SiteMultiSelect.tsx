import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

export type SelectOption = { id: number; name: string; hint?: string; locked?: boolean };

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || '·';
}

function hintColor(hint: string) {
  const text = hint.toLowerCase();
  if (text.includes('declined')) return palette.danger;
  if (text.includes('invited') || text.includes('waiting') || text.includes('will be invited')) return cc.warnText;
  if (text.includes('taking part')) return palette.kale;
  return palette.stone;
}

export function SiteMultiSelect({
  options,
  selected,
  onChange,
  emptyText = 'No sites available',
  kind = 'site',
}: {
  options: SelectOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  emptyText?: string;
  kind?: 'site' | 'person';
}) {
  if (!options.length) {
    return (
      <View style={styles.empty}>
        <AppText variant="bodySmall" color={palette.stone}>{emptyText}</AppText>
      </View>
    );
  }
  const selectable = options.filter((option) => !option.locked).map((option) => option.id);
  const allOn = selectable.every((id) => selected.includes(id));
  return (
    <View style={styles.list}>
      {options.length > 2 ? (
        <Pressable
          style={styles.allRow}
          onPress={() => {
            const locked = options.filter((option) => option.locked && selected.includes(option.id)).map((option) => option.id);
            onChange(allOn ? locked : [...new Set([...locked, ...selectable])]);
          }}
        >
          <AppText variant="meta" color={palette.stone}>{selected.length} of {options.length} selected</AppText>
          <AppText variant="bodyBold" color={palette.primary}>{allOn ? 'Clear' : 'Select all'}</AppText>
        </Pressable>
      ) : null}
      {options.map((option, index) => {
        const on = selected.includes(option.id);
        return (
          <Pressable
            key={option.id}
            style={[styles.row, index === options.length - 1 && styles.lastRow, on && styles.rowOn]}
            onPress={() => {
              if (option.locked) return;
              onChange(on ? selected.filter((id) => id !== option.id) : [...selected, option.id]);
            }}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on, disabled: option.locked }}
          >
            <View style={[styles.avatar, on && styles.avatarOn]}>
              {kind === 'site' ? (
                <Ionicons name="storefront-outline" size={normalize(16)} color={on ? palette.white : palette.kale} />
              ) : (
                <AppText variant="meta" color={on ? palette.white : palette.kale} style={styles.initials}>
                  {initials(option.name)}
                </AppText>
              )}
            </View>
            <View style={styles.copy}>
              <AppText variant="bodyBold" numberOfLines={1}>{option.name}</AppText>
              {option.hint ? (
                <AppText variant="meta" color={hintColor(option.hint)}>{option.hint}</AppText>
              ) : null}
            </View>
            {option.locked ? (
              <Ionicons name="lock-closed" size={normalize(16)} color={palette.stone} />
            ) : (
              <View style={[styles.box, on && styles.boxOn]}>
                {on ? <Ionicons name="checkmark" size={normalize(14)} color={palette.white} /> : null}
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

export function UserMultiSelect(props: {
  options: SelectOption[];
  selected: number[];
  onChange: (ids: number[]) => void;
  emptyText?: string;
}) {
  return <SiteMultiSelect {...props} kind="person" emptyText={props.emptyText || 'No people available'} />;
}

const styles = StyleSheet.create({
  empty: { paddingVertical: 6 },
  // Flat list: it always sits inside a section card, never a card of its own.
  list: { marginHorizontal: -4 },
  allRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 4,
    minHeight: 56,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cc.hairline,
  },
  lastRow: {},
  rowOn: {},
  avatar: {
    width: normalize(34),
    height: normalize(34),
    borderRadius: normalize(17),
    backgroundColor: cc.tint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarOn: { backgroundColor: palette.kale },
  initials: { fontWeight: '700' },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  box: {
    width: normalize(22),
    height: normalize(22),
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#CFC8BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxOn: { backgroundColor: palette.kale, borderColor: palette.kale },
});
