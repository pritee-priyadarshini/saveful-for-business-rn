import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

export type WhiteSelectOption<T extends string | number> = {
  value: T;
  label: string;
  subtitle?: string;
};

type Props<T extends string | number> = {
  placeholder?: string;
  value: T | null;
  options: WhiteSelectOption<T>[];
  onChange: (value: T) => void;
  loading?: boolean;
  emptyText?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** App-styled select — white field and white menu, never the system picker. */
export function WhiteSelect<T extends string | number>({
  placeholder = 'Select',
  value,
  options,
  onChange,
  loading = false,
  emptyText = 'No options',
  open: openProp,
  onOpenChange,
}: Props<T>) {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = openProp ?? internalOpen;

  const setOpen = (next: boolean) => {
    onOpenChange?.(next);
    if (openProp === undefined) setInternalOpen(next);
  };

  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.field, open && styles.fieldOpen]}
        onPress={() => !loading && setOpen(!open)}
      >
        <View style={styles.fieldCopy}>
          <AppText
            variant="bodySmall"
            color={selected ? palette.black : palette.stone}
            numberOfLines={1}
          >
            {selected?.label || placeholder}
          </AppText>
          {selected?.subtitle ? (
            <AppText variant="caption" color={palette.stone} numberOfLines={1}>
              {selected.subtitle}
            </AppText>
          ) : null}
        </View>
        {loading ? (
          <ActivityIndicator size="small" color={palette.kale} />
        ) : (
          <Ionicons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={normalize(18)}
            color={palette.stone}
          />
        )}
      </Pressable>

      {open ? (
        <View style={styles.menu}>
          {options.length === 0 ? (
            <AppText variant="bodySmall" color={palette.stone} style={styles.empty}>
              {emptyText}
            </AppText>
          ) : (
            <ScrollView
              style={styles.menuScroll}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {options.map((option) => {
                const on = option.value === value;
                return (
                  <Pressable
                    key={String(option.value)}
                    style={[styles.option, on && styles.optionOn]}
                    onPress={() => {
                      onChange(option.value);
                      setOpen(false);
                    }}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText variant="bodySmall" numberOfLines={1}>
                        {option.label}
                      </AppText>
                      {option.subtitle ? (
                        <AppText variant="caption" color={palette.stone} numberOfLines={1}>
                          {option.subtitle}
                        </AppText>
                      ) : null}
                    </View>
                    {on ? (
                      <Ionicons name="checkmark" size={normalize(18)} color={palette.kale} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
  },
  field: {
    minHeight: 50,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#D9DED2',
    borderRadius: 12,
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.1),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  fieldOpen: {
    borderColor: palette.kale,
  },
  fieldCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  menu: {
    marginTop: 6,
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: '#D9DED2',
    borderRadius: 12,
    overflow: 'hidden',
  },
  menuScroll: {
    maxHeight: 220,
  },
  empty: {
    padding: 14,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: palette.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E2D6',
  },
  optionOn: {
    backgroundColor: '#F4F7F1',
  },
});
