import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { MfcArt } from '@/components/makeFoodCount/MfcArt';
import { MFC } from '@/constants/makeFoodCount';
import { selectHasOpenDraft, useMakeFoodCountStore } from '@/store/makeFoodCountStore';
import { normalize } from '@/utils/responsive';

/**
 * Home card for Make Food Count, as in the deck's mobile Home: lilac card,
 * NEW pill, chef-hat mark, title and line, food picture on the right, purple
 * "Record Food Waste →" button.
 */
export function MakeFoodCountCard({ style }: { style?: StyleProp<ViewStyle> }) {
  const navigation = useNavigation<any>();
  const hasDraft = useMakeFoodCountStore(selectHasOpenDraft);
  const hasSources = useMakeFoodCountStore((state) => state.sources.length > 0);
  const selectedSource = useMakeFoodCountStore((state) => state.selectedSource);
  const continuing = hasDraft && hasSources;

  const open = () => {
    if (continuing) {
      navigation.navigate('MakeFoodCount', {
        screen: 'MfcRecord',
        params: selectedSource ? { source: selectedSource } : undefined,
        initial: false,
      });
      return;
    }
    navigation.navigate('MakeFoodCount', { screen: 'MfcSources' });
  };

  const openRecent = () => navigation.navigate('MakeFoodCount', { screen: 'MfcRecentRecords' });

  return (
    <View style={[styles.card, style]}>
      <View style={styles.top}>
        <View style={styles.copy}>
          <View style={styles.newPill}>
            <AppText variant="meta" color={MFC.white} style={styles.newText}>
              NEW
            </AppText>
          </View>
          <View style={styles.titleRow}>
            <MaterialCommunityIcons name="chef-hat" size={normalize(26)} color={MFC.purple} />
            <AppText variant="subheading" color={MFC.ink} style={styles.title} numberOfLines={2}>
              Make Food Count
            </AppText>
          </View>
          <AppText variant="bodySmall" color={MFC.ink} style={styles.body}>
            Record food waste, understand where it comes from and choose the best next step.
          </AppText>
        </View>
        <View style={styles.art} pointerEvents="none">
          <MfcArt art="produce" size={96} tile={false} />
        </View>
      </View>

      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={continuing ? 'Continue recording food waste' : 'Record food waste'}
        style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
      >
        <AppText variant="bodyBold" color={MFC.white}>
          {continuing ? 'Continue recording' : 'Record Food Waste'}
        </AppText>
        <Ionicons name="arrow-forward" size={normalize(18)} color={MFC.white} />
      </Pressable>

      <Pressable
        onPress={openRecent}
        accessibilityRole="link"
        accessibilityLabel="Recent records"
        hitSlop={8}
        style={({ pressed }) => [styles.recent, pressed && styles.pressed]}
      >
        <AppText variant="meta" color={MFC.purple} style={styles.recentText}>
          Recent records
        </AppText>
        <Ionicons name="chevron-forward" size={normalize(13)} color={MFC.purple} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    borderRadius: normalize(20),
    borderWidth: 1,
    borderColor: '#DCCBF2',
    backgroundColor: '#F3ECFD',
    padding: normalize(16),
    gap: normalize(12),
  },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copy: { flex: 1, minWidth: 0, gap: 6 },
  newPill: {
    alignSelf: 'flex-start',
    backgroundColor: MFC.purple,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  newText: { fontFamily: 'Saveful-Bold', letterSpacing: 0.6 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: normalize(21), lineHeight: normalize(26) },
  body: { lineHeight: normalize(20) },
  art: { width: normalize(96), alignItems: 'center' },
  cta: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: MFC.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, minHeight: 32 },
  recentText: { fontFamily: 'Saveful-SemiBold' },
  pressed: { opacity: 0.88 },
});
