import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { parseStarRating } from '@/utils/rating';
import { normalize } from '@/utils/responsive';

type Props = {
  rating?: number | null;
  label?: string;
  note?: string | null;
  variant?: 'star' | 'apple';
  color?: string;
};

export function RatingSummary({
  rating,
  label = 'Your rating',
  note,
  variant = 'star',
  color = palette.orange,
}: Props) {
  const value = parseStarRating(rating);
  if (value == null) return null;

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.row}>
        {[1, 2, 3, 4, 5].map((n) =>
          variant === 'apple' ? (
            <AppText key={n} style={[styles.apple, n <= value && styles.appleOn]}>
              🍎
            </AppText>
          ) : (
            <Ionicons
              key={n}
              name={n <= value ? 'star' : 'star-outline'}
              size={normalize(15)}
              color={color}
            />
          ),
        )}
        <AppText variant="bodyBold" style={[styles.score, { color }]}>
          {value}/5
        </AppText>
      </View>
      {note ? (
        <AppText variant="caption" style={styles.note} numberOfLines={2}>
          {note}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 2,
  },
  label: {
    color: palette.stone,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: normalize(10),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  apple: {
    fontSize: normalize(14),
    opacity: 0.28,
  },
  appleOn: {
    opacity: 1,
  },
  score: {
    marginLeft: 4,
    fontSize: normalize(12),
    textTransform: 'none',
  },
  note: {
    color: palette.midgray,
    textTransform: 'none',
  },
});
