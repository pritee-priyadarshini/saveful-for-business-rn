import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { consolidatedService } from '@/services/consolidated.service';
import { useAppContext } from '@/store/AppContext';
import { useConsolidatedStore } from '@/store/consolidatedStore';
import { palette } from '@/theme/colors';
import { isBusinessRole } from '@/utils/consolidated';
import { CONSOLIDATED_PREVIEW } from '@/dev/previewFlag';
import { hp, normalize, wp } from '@/utils/responsive';

/**
 * Shown on Home only while a site this user runs has been invited to a
 * collection group and nobody has answered yet.
 */
export function ConsolidatedInvitationsCard({ style }: { style?: ViewStyle }) {
  const navigation = useNavigation<any>();
  const { selectedRole } = useAppContext();
  const featureOff = useConsolidatedStore((state) => state.featureOff);
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      if ((!isBusinessRole(selectedRole) && !CONSOLIDATED_PREVIEW) || featureOff) return undefined;
      let cancelled = false;
      consolidatedService
        .listInvitations()
        .then((rows) => { if (!cancelled) setCount(rows.length); })
        .catch(() => { if (!cancelled) setCount(0); });
      return () => { cancelled = true; };
    }, [featureOff, selectedRole]),
  );

  if (!count) return null;
  return (
    <Pressable
      onPress={() => navigation.navigate('ConsolidatedInvitations')}
      style={({ pressed }) => [styles.card, style, pressed && { opacity: 0.92 }]}
      accessibilityRole="button"
      accessibilityLabel="Collection group invitations"
    >
      <View style={styles.icon}>
        <Ionicons name="mail-unread-outline" size={normalize(20)} color={palette.white} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyBold">
          {count === 1 ? 'You have a collection invitation' : `You have ${count} collection invitations`}
        </AppText>
        <AppText variant="meta" color={palette.stone}>
          Review and accept to join a shared collection point
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: hp(1.2),
    paddingHorizontal: wp(3.4),
    borderRadius: normalize(18),
    backgroundColor: '#EEF7F2',
    borderWidth: 1,
    borderColor: palette.kale,
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.6),
  },
  icon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(20),
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 2 },
});
