import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { palette } from '../theme/colors';

type SectionHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
};

export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText variant="heading">{title}</AppText>
        {subtitle ? <AppText color={palette.textMuted}>{subtitle}</AppText> : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
});
