import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Card } from './Card';
import { MetricCard as MetricCardType } from '../types';
import { palette } from '../theme/colors';

const toneMap = {
  primary: palette.primarySoft,
  secondary: palette.secondarySoft,
  success: '#DDF1E5',
};

type Props = {
  metric: MetricCardType;
};

export function MetricCard({ metric }: Props) {
  return (
    <Card style={[styles.card, { backgroundColor: toneMap[metric.tone] }]}>
      <AppText variant="label" color={palette.textMuted}>{metric.label}</AppText>
      <AppText variant="heading">{metric.value}</AppText>
      <View style={styles.deltaBadge}>
        <AppText variant="caption" color={palette.primary}>{metric.delta}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 160,
  },
  deltaBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
