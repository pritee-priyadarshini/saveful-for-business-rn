import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { Button } from './Button';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function PermissionBanner() {
  return (
    <View style={styles.banner}>
      <View style={styles.iconWrap}>
        <Ionicons color={palette.primary} name="navigate" size={20} />
      </View>
      <View style={styles.copy}>
        <AppText variant="subheading">Live location enabled</AppText>
        <AppText color={palette.textMuted}>Nearby pickups and community fridges are sorted by distance.</AppText>
      </View>
      <Button label="Manage" variant="ghost" />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: palette.primarySoft,
    borderRadius: 24,
    padding: spacing.lg,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.7)',
  },
  copy: {
    flex: 1,
    gap: 4,
  },
});
