import React from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { MFC } from '@/constants/makeFoodCount';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

/**
 * The way into Food Impact from the Insights tab. The whole card is the
 * button: icon, title and line, chevron — like the app's other report rows.
 */
export function FoodImpactEntryCard({ onPress, style }: { onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Food Impact. What was recorded, what was recovered, and where it went"
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={styles.icon}>
        <Ionicons name="stats-chart" size={normalize(22)} color={palette.white} />
      </View>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <AppText variant="bodyBold" color={MFC.ink} style={styles.title} numberOfLines={1}>
            Food Impact
          </AppText>
          <View style={styles.tag}>
            <AppText variant="meta" color={MFC.purple} style={styles.tagText}>
              Make Food Count
            </AppText>
          </View>
        </View>
        <AppText variant="meta" color={MFC.muted} numberOfLines={2}>
          What was recorded, what was recovered, and where it went.
        </AppText>
      </View>
      <View style={styles.chevron}>
        <Ionicons name="chevron-forward" size={normalize(18)} color={MFC.purple} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 80,
    borderRadius: normalize(18),
    borderWidth: 1,
    borderColor: palette.strokecream,
    backgroundColor: palette.white,
    paddingVertical: normalize(14),
    paddingHorizontal: normalize(14),
    ...Platform.select({
      ios: { shadowColor: palette.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  pressed: { opacity: 0.9 },
  icon: {
    width: normalize(46),
    height: normalize(46),
    borderRadius: normalize(14),
    backgroundColor: MFC.purple,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, minWidth: 0, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flexShrink: 1, fontFamily: 'Saveful-Bold', fontSize: normalize(17) },
  tag: { backgroundColor: MFC.lilac, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 1 },
  tagText: { fontFamily: 'Saveful-SemiBold', fontSize: normalize(11) },
  chevron: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    backgroundColor: MFC.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
