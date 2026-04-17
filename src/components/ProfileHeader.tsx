import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppText } from './AppText';
import { Card } from './Card';
import { UserProfile } from '../types';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';

export function ProfileHeader({ profile }: { profile: UserProfile }) {
  return (
    <Card style={styles.card}>
      <View style={styles.avatar}>
        <AppText variant="subheading" color={palette.surface}>
          {profile.name.split(' ').map((part) => part[0]).join('')}
        </AppText>
      </View>
      <View style={styles.copy}>
        <AppText variant="subheading">{profile.name}</AppText>
        <AppText>{profile.organization}</AppText>
        <AppText color={palette.textMuted}>{profile.address}</AppText>
      </View>
      <View style={styles.status}>
        <AppText variant="caption" color={palette.primary}>{profile.verificationStatus}</AppText>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: palette.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  status: {
    backgroundColor: palette.primarySoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
});
