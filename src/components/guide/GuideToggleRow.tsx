import React from 'react';
import { Platform, Pressable, StyleSheet, Switch, View, type StyleProp, type ViewStyle } from 'react-native';

import { AppText } from '@/components/AppText';
import { useGuideStore } from '@/store/guideStore';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

/**
 * Profile setting for the Consolidated Collections walkthroughs.
 * Turning it back on replays every walkthrough from the start.
 */
export function GuideToggleRow({ style }: { style?: StyleProp<ViewStyle> }) {
  const enabled = useGuideStore((state) => state.enabled);
  const setEnabled = useGuideStore((state) => state.setEnabled);

  return (
    <Pressable
      style={[style, styles.row]}
      onPress={() => setEnabled(!enabled)}
      accessibilityRole="switch"
      accessibilityState={{ checked: enabled }}
      accessibilityLabel="Guide me"
      accessibilityHint="Step-by-step walkthroughs of consolidated collections"
    >
      <View style={styles.copy}>
        <AppText variant="body">Guide me</AppText>
        <AppText variant="meta" color={palette.midgray}>
          {enabled
            ? 'Step-by-step help opens the first time you visit each collection screen.'
            : 'Off. Turn on to walk through every collection screen again.'}
        </AppText>
      </View>
      <Switch
        value={enabled}
        onValueChange={setEnabled}
        trackColor={{ false: '#D8D2C6', true: palette.kale }}
        thumbColor={Platform.OS === 'android' ? palette.white : undefined}
        ios_backgroundColor="#D8D2C6"
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center' },
  copy: { flex: 1, marginRight: spacing.md, gap: 2 },
});
