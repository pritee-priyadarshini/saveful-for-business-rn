import React, { useContext, useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  Keyboard,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type ImageSourcePropType,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { MfcArt, type MfcArtKey } from '@/components/makeFoodCount/MfcArt';
import { ScreenScrollContext } from '@/components/Screen';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

/** iOS number pads have no Done key: rows share one Done bar (GroupedFoodRows renders it). */
export const QTY_KEYBOARD_ACCESSORY_ID = 'saveful-food-qty-done';

export type FoodRowTheme = {
  /** Buttons, typed value, totals. */
  accent: string;
  /** The stepper pill and icon tiles. */
  tint: string;
};

export const PEOPLE_FOOD_THEME: FoodRowTheme = { accent: palette.primary, tint: '#EEEAF6' };
export const FARM_FOOD_THEME: FoodRowTheme = { accent: '#B85F12', tint: '#FBE9D3' };

const MAX_KG = 9999;
const STEP = 0.5;

/** "12", "12.5", "12.25": up to 2 dp, never trailing zeros. */
export function formatQty(kg: number): string {
  return String(Math.round(kg * 100) / 100);
}

/** Small rounded tile with the food's picture, the same size for every row. */
export function FoodIcon({
  source,
  art,
  tint,
  small,
}: {
  source?: ImageSourcePropType;
  art?: MfcArtKey;
  tint: string;
  small?: boolean;
}) {
  const box = normalize(small ? 32 : 38);
  return (
    <View style={[styles.iconTile, { width: box, height: box, borderRadius: box * 0.3, backgroundColor: tint }]}>
      {art ? (
        <MfcArt art={art} size={small ? 24 : 28} tile={false} />
      ) : source ? (
        <Image source={source} style={{ width: box * 0.68, height: box * 0.68 }} resizeMode="contain" />
      ) : null}
    </View>
  );
}

/**
 * One food row on a listing: picture, name (and how much Make Food Count counted),
 * then −  [quantity]  +. The quantity can be typed, so a 40 kg order is one entry,
 * not eighty taps. `max` caps it (food carried from Make Food Count can't go above
 * what is still available).
 */
export function FoodQuantityRow({
  name,
  caption,
  icon,
  qty,
  max = MAX_KG,
  onChange,
  onRemove,
  theme,
  nested,
  first,
}: {
  name: string;
  /** e.g. "Counted 12 kg". */
  caption?: string | null;
  icon: { source?: ImageSourcePropType; art?: MfcArtKey };
  qty: number;
  max?: number;
  /** Always called with a value already rounded and within 0…max. */
  onChange: (qty: number) => void;
  onRemove?: () => void;
  theme: FoodRowTheme;
  nested?: boolean;
  /** No divider above the first row of a list or group. */
  first?: boolean;
}) {
  const [text, setText] = useState<string | null>(null);
  const rowRef = useRef<View>(null);
  const scroll = useContext(ScreenScrollContext);

  const clamp = (value: number) => Math.min(max, Math.max(0, Math.round(value * 100) / 100));
  const typed = text == null ? null : Number.parseFloat(text);
  const over = typed != null && Number.isFinite(typed) && typed > max;

  const step = (delta: number) => onChange(clamp(qty + delta));

  const onChangeText = (raw: string) => {
    // Digits and one decimal separator (a comma counts too), at most 2 decimals.
    let clean = raw.replace(',', '.').replace(/[^0-9.]/g, '');
    const dot = clean.indexOf('.');
    if (dot >= 0) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, '').slice(0, 2);
    setText(clean);
    const value = Number.parseFloat(clean);
    onChange(Number.isFinite(value) ? clamp(value) : 0);
  };

  /** Lift the row above the keyboard (these screens don't resize for it). */
  const keepVisible = () => {
    if (!scroll) return;
    setTimeout(() => {
      const keyboard = Keyboard.metrics?.()?.height ?? 0;
      if (!keyboard) return;
      rowRef.current?.measureInWindow((_x, y, _w, height) => {
        const visibleBottom = Dimensions.get('window').height - keyboard - (Platform.OS === 'ios' ? 56 : 64);
        const overlap = y + height - visibleBottom;
        if (overlap > 0) scroll.scrollTo(scroll.getY() + overlap + 16);
      });
    }, Platform.OS === 'ios' ? 350 : 450);
  };

  const display = text ?? formatQty(qty);
  const captionText = over ? `Only ${formatQty(max)} kg available` : caption;

  return (
    <View ref={rowRef} collapsable={false} style={[styles.row, !first && styles.divider, nested && styles.rowNested]}>
      <FoodIcon source={icon.source} art={icon.art} tint={theme.tint} small={nested} />

      <View style={styles.copy}>
        <AppText variant="bodyBold" color={palette.black} numberOfLines={2} style={styles.name}>
          {name}
        </AppText>
        {captionText ? (
          <AppText variant="meta" color={over ? palette.danger : palette.stone} numberOfLines={1} style={styles.caption}>
            {captionText}
          </AppText>
        ) : null}
      </View>

      <View style={[styles.stepper, { backgroundColor: theme.tint }]}>
        <Pressable
          onPress={() => step(-STEP)}
          disabled={qty <= 0}
          hitSlop={{ top: 6, bottom: 6, left: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`Less ${name}`}
          style={({ pressed }) => [styles.stepBtn, (qty <= 0 || pressed) && styles.dim]}
        >
          <Ionicons name="remove" size={normalize(18)} color={theme.accent} />
        </Pressable>

        <View style={styles.valueBox}>
          <TextInput
            value={display}
            onChangeText={onChangeText}
            onFocus={() => {
              setText(qty > 0 ? formatQty(qty) : '');
              keepVisible();
            }}
            onBlur={() => setText(null)}
            onSubmitEditing={() => setText(null)}
            keyboardType="decimal-pad"
            returnKeyType="done"
            selectTextOnFocus
            maxLength={7}
            inputAccessoryViewID={Platform.OS === 'ios' ? QTY_KEYBOARD_ACCESSORY_ID : undefined}
            accessibilityLabel={`${name} quantity in kilograms`}
            style={[styles.input, { color: qty > 0 || text != null ? palette.black : palette.stone }]}
            placeholder="0"
            placeholderTextColor={palette.stone}
          />
          <AppText variant="meta" color={palette.stone} style={styles.unit}>kg</AppText>
        </View>

        <Pressable
          onPress={() => step(STEP)}
          disabled={qty >= max}
          hitSlop={{ top: 6, bottom: 6, right: 4 }}
          accessibilityRole="button"
          accessibilityLabel={`More ${name}`}
          style={({ pressed }) => [styles.stepBtn, (qty >= max || pressed) && styles.dim]}
        >
          <Ionicons name="add" size={normalize(18)} color={theme.accent} />
        </Pressable>
      </View>

      {onRemove ? (
        <Pressable
          onPress={onRemove}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Remove ${name} from this listing`}
          style={({ pressed }) => [styles.remove, pressed && styles.dim]}
        >
          <Ionicons name="close" size={normalize(16)} color={palette.stone} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(10),
    paddingVertical: normalize(10),
  },
  rowNested: { paddingVertical: normalize(8) },
  divider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E4DFD5' },
  iconTile: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  copy: { flex: 1, minWidth: 0, gap: 1 },
  name: { fontFamily: 'Saveful-SemiBold' },
  caption: { fontSize: normalize(12) },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: normalize(12),
    height: normalize(40),
    paddingHorizontal: 2,
  },
  stepBtn: {
    width: normalize(32),
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dim: { opacity: 0.35 },
  valueBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: normalize(58),
    height: normalize(32),
    paddingHorizontal: 6,
    borderRadius: normalize(8),
    backgroundColor: palette.white,
  },
  input: {
    minWidth: normalize(22),
    maxWidth: normalize(52),
    height: '100%',
    padding: 0,
    textAlign: 'right',
    textAlignVertical: 'center',
    fontFamily: 'Saveful-Bold',
    fontSize: normalize(16),
    lineHeight: normalize(20),
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
  // Sits on the number's line, not above it.
  unit: { marginLeft: 3, fontSize: normalize(11), lineHeight: normalize(14), marginTop: normalize(2) },
  remove: {
    width: normalize(26),
    height: normalize(26),
    borderRadius: normalize(13),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFEBE3',
  },
});
