import React, { useState } from 'react';
import {
  Keyboard,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleSheet,
  UIManager,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { KeyboardSubmitAccessory } from '@/components/KeyboardSubmitAccessory';
import type { MfcArtKey } from '@/components/makeFoodCount/MfcArt';
import type { GroupableFoodRow } from '@/constants/listingFoodCatalogue';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

import { FoodIcon, QTY_KEYBOARD_ACCESSORY_ID, formatQty, type FoodRowTheme } from './FoodQuantityRow';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type Block<T> =
  | { kind: 'row'; item: T; index: number }
  | { kind: 'group'; name: string; rows: { item: T; index: number }[] };

/** Rows in their order; a group appears where its first row is. */
function toBlocks<T extends GroupableFoodRow>(items: T[]): Block<T>[] {
  const blocks: Block<T>[] = [];
  const groups = new Map<string, Extract<Block<T>, { kind: 'group' }>>();
  items.forEach((item, index) => {
    if (!item.group) {
      blocks.push({ kind: 'row', item, index });
      return;
    }
    let group = groups.get(item.group);
    if (!group) {
      group = { kind: 'group', name: item.group, rows: [] };
      groups.set(item.group, group);
      blocks.push(group);
    }
    group.rows.push({ item, index });
  });
  return blocks;
}

/**
 * A listing's food rows, with grouped rows (Meat → Chicken, Beef …) gathered
 * under one header showing their total. The screen draws each row
 * (`renderRow`, usually a FoodQuantityRow); indices are positions in `items`.
 */
export function GroupedFoodRows<T extends GroupableFoodRow>({
  items,
  renderRow,
  groupIcon,
  theme,
}: {
  items: T[];
  renderRow: (item: T, index: number, options: { nested: boolean; first: boolean }) => React.ReactNode;
  /** Picture for a group header; usually its row's own icon. */
  groupIcon: (group: string, first: T) => { source?: ImageSourcePropType; art?: MfcArtKey };
  theme: FoodRowTheme;
}) {
  // Groups the person opened or closed; otherwise a group with food in it starts open.
  const [toggled, setToggled] = useState<Record<string, boolean>>({});

  return (
    <View>
      {toBlocks(items).map((block, blockIndex) => {
        const first = blockIndex === 0;
        if (block.kind === 'row') {
          return (
            <React.Fragment key={`row-${block.index}`}>
              {renderRow(block.item, block.index, { nested: false, first })}
            </React.Fragment>
          );
        }

        const total = block.rows.reduce((sum, row) => sum + (Number(row.item.qty) || 0), 0);
        const withFood = block.rows.filter((row) => row.item.qty > 0);
        const open = toggled[block.name] ?? (withFood.length > 0 || block.rows.some((row) => typeof row.item.lineId === 'number'));
        const summary = withFood.length
          ? withFood.map((row) => row.item.label ?? row.item.name).join(', ')
          : `${block.rows.length} types · tap to add`;

        return (
          <View key={`group-${block.name}`}>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setToggled((current) => ({ ...current, [block.name]: !open }));
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${block.name}, ${formatQty(total)} kilograms. ${open ? 'Hide' : 'Show'} types.`}
              style={({ pressed }) => [styles.header, !first && styles.divider, pressed && styles.pressed]}
            >
              <FoodIcon {...groupIcon(block.name, block.rows[0].item)} tint={theme.tint} />
              <View style={styles.copy}>
                <AppText variant="bodyBold" color={palette.black} numberOfLines={1} style={styles.name}>
                  {block.name}
                </AppText>
                <AppText variant="meta" color={palette.stone} numberOfLines={1} style={styles.summary}>
                  {summary}
                </AppText>
              </View>
              <View style={[styles.total, { backgroundColor: total > 0 ? theme.tint : 'transparent' }]}>
                <AppText variant="bodyBold" color={total > 0 ? theme.accent : palette.stone} style={styles.totalText}>
                  {formatQty(total)} kg
                </AppText>
              </View>
              <View style={[styles.chevron, { borderColor: theme.tint }]}>
                <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={normalize(16)} color={theme.accent} />
              </View>
            </Pressable>

            {open ? (
              <View style={[styles.nested, { borderLeftColor: theme.tint }]}>
                {block.rows.map((row, i) => (
                  <React.Fragment key={`sub-${row.index}`}>
                    {renderRow(row.item, row.index, { nested: true, first: i === 0 })}
                  </React.Fragment>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}

      {Platform.OS === 'ios' ? (
        <KeyboardSubmitAccessory nativeID={QTY_KEYBOARD_ACCESSORY_ID} label="Done" onSubmit={() => Keyboard.dismiss()} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(10),
    paddingVertical: normalize(10),
  },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4DFD5' },
  pressed: { opacity: 0.7 },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontFamily: 'Saveful-SemiBold' },
  summary: { fontSize: normalize(12) },
  total: { paddingHorizontal: normalize(10), paddingVertical: normalize(4), borderRadius: 999 },
  totalText: { fontVariant: ['tabular-nums'] },
  chevron: {
    width: normalize(28),
    height: normalize(28),
    borderRadius: normalize(14),
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nested: {
    marginLeft: normalize(18),
    paddingLeft: normalize(12),
    borderLeftWidth: 2,
    marginBottom: normalize(4),
  },
});
