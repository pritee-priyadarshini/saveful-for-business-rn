import React from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';

export function getCollectionNotes(value?: string | null) {
  const text = String(value ?? '').trim();
  return text || null;
}

type Props = {
  notes?: string | null;
  style?: ViewStyle;
};

/** Charity / collector view — hidden when the business left notes empty. */
export function CollectionNotesCard({ notes, style }: Props) {
  const text = getCollectionNotes(notes);
  if (!text) return null;

  return (
    <View style={[styles.card, style]}>
      <Ionicons name="document-text-outline" size={normalize(20)} color={palette.kale} />
      <View style={styles.copy}>
        <AppText variant="label" style={styles.label}>
          COLLECTION NOTES
        </AppText>
        <AppText variant="bodySmall" style={styles.body}>
          {text}
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
    backgroundColor: palette.creme,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#D9D9D9',
    borderRadius: normalize(14),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
  },
  copy: {
    flex: 1,
    gap: hp(0.3),
  },
  label: {
    color: palette.kale,
    letterSpacing: 0.3,
  },
  body: {
    color: '#444',
    lineHeight: normalize(18),
  },
});
