import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { cc } from '@/components/consolidated/ui';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

export type MfcSiteOption = { id: number; name: string };

type Props = {
  visible: boolean;
  sites: MfcSiteOption[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onClose: () => void;
};

/** Bottom sheet that lists the user's sites (the "Compass Kitchen ▾" switcher in the MFC header). */
export function MfcSitePicker({ visible, sites, selectedId, onSelect, onClose }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close site list" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]} accessibilityViewIsModal>
          <AppText variant="subheading" color={palette.eggplant} accessibilityRole="header" style={styles.title}>
            Choose a site
          </AppText>
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {sites.map((site) => {
              const on = site.id === selectedId;
              return (
                <Pressable
                  key={site.id}
                  onPress={() => onSelect(site.id)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={site.name}
                  style={({ pressed }) => [styles.row, pressed && styles.pressed]}
                >
                  <AppText variant="bodyBold" color={on ? palette.eggplant : palette.black} numberOfLines={2} style={styles.rowText}>
                    {site.name}
                  </AppText>
                  {on ? <Ionicons name="checkmark" size={normalize(20)} color={palette.eggplant} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(26, 26, 27, 0.4)' },
  sheet: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 560,
    maxHeight: '70%',
    backgroundColor: palette.white,
    borderTopLeftRadius: cc.radius,
    borderTopRightRadius: cc.radius,
    paddingTop: normalize(18),
    paddingHorizontal: normalize(18),
  },
  title: { marginBottom: 8 },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: cc.hairline,
  },
  rowText: { flex: 1 },
  pressed: { opacity: 0.85 },
});
