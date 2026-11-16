import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';
import type { Declaration } from '@/types/consolidated';

type Props = {
  declaration?: Declaration | null;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string | null;
  title?: string;
};

/** The mandatory food-safety declaration, as a single clear card. */
export function DeclarationCheckbox({ declaration, checked, onChange, error, title = 'Food safety declaration' }: Props) {
  return (
    <View style={styles.wrap}>
      <Pressable
        style={[styles.card, checked && styles.cardOn, error && !checked ? styles.cardError : null]}
        onPress={() => onChange(!checked)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View style={styles.head}>
          <Ionicons name="shield-checkmark" size={normalize(18)} color={checked ? palette.kale : palette.stone} />
          <AppText variant="bodyBold" style={styles.flex}>{title}</AppText>
          <View style={[styles.box, checked && styles.boxOn]}>
            {checked ? <Ionicons name="checkmark" size={normalize(15)} color={palette.white} /> : null}
          </View>
        </View>
        <AppText variant="bodySmall" color={palette.midgray} style={styles.text}>
          {declaration?.text || 'Please confirm before continuing.'}
        </AppText>
        {declaration?.version ? (
          <AppText variant="meta" color={palette.stone}>Version {declaration.version} · stored with your confirmation</AppText>
        ) : null}
      </Pressable>
      {error ? (
        <AppText variant="meta" color={palette.danger}>
          {error}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  flex: { flex: 1 },
  card: {
    borderWidth: 1.5,
    borderColor: cc.hairline,
    borderRadius: cc.radiusSm,
    padding: 14,
    gap: 8,
    backgroundColor: palette.white,
  },
  cardOn: { borderColor: palette.kale, backgroundColor: cc.tint },
  cardError: { borderColor: palette.danger },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  box: {
    width: normalize(24),
    height: normalize(24),
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.white,
  },
  boxOn: { backgroundColor: palette.kale },
  text: { lineHeight: normalize(20) },
});
