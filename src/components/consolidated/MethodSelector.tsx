import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { IconBubble, cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';
import type { HandoverMethod } from '@/types/consolidated';

const OPTIONS: { value: HandoverMethod; title: string; body: string; preview: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  {
    value: 'SITE_DROP_OFF',
    title: 'Dropped off by sites',
    body: 'Each site brings its food to the collection point by the final drop-off deadline.',
    preview: '“Please drop off your food at the collection point by …”',
    icon: 'archive-outline',
  },
  {
    value: 'INTERNAL_COLLECTION',
    title: 'Collected from sites',
    body: 'Your team collects food from each outlet during an internal collection window.',
    preview: '“Your food will be collected from your outlet. Please have it ready by …”',
    icon: 'walk-outline',
  },
];

/** Canva CM2 — "How will food reach the central collection point?" */
export function MethodSelector({ value, onChange }: { value: HandoverMethod; onChange: (method: HandoverMethod) => void }) {
  return (
    <View style={styles.wrap}>
      {OPTIONS.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.card, selected && styles.cardOn]}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <View style={styles.head}>
              <IconBubble
                name={option.icon}
                size={38}
                color={selected ? palette.white : palette.kale}
                background={selected ? palette.kale : cc.tint}
              />
              <View style={styles.copy}>
                <AppText variant="bodyBold">{option.title}</AppText>
                <AppText variant="meta" color={palette.stone}>{option.body}</AppText>
              </View>
              <View style={[styles.radio, selected && styles.radioOn]}>
                {selected ? <View style={styles.radioDot} /> : null}
              </View>
            </View>
            {selected ? (
              <View style={styles.preview}>
                <AppText variant="meta" color={palette.kale} style={styles.previewLabel}>SITES WILL SEE</AppText>
                <AppText variant="bodySmall" color={palette.midgray}>{option.preview}</AppText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <View style={styles.note}>
        <Ionicons name="information-circle-outline" size={normalize(14)} color={palette.stone} />
        <AppText variant="meta" color={palette.stone}>One method applies to every site in the collection.</AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  card: {
    borderWidth: 1.5,
    borderColor: cc.hairline,
    backgroundColor: palette.white,
    borderRadius: cc.radiusSm,
    padding: 12,
    gap: 10,
  },
  cardOn: { borderColor: palette.kale, backgroundColor: '#F8FCF9' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  copy: { flex: 1, gap: 2 },
  radio: {
    width: normalize(20),
    height: normalize(20),
    borderRadius: normalize(10),
    borderWidth: 2,
    borderColor: '#CFC8BA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: palette.kale },
  radioDot: { width: normalize(10), height: normalize(10), borderRadius: normalize(5), backgroundColor: palette.kale },
  preview: { backgroundColor: cc.tint, borderRadius: 10, padding: 10, gap: 2 },
  previewLabel: { letterSpacing: 0.8, fontWeight: '700' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
