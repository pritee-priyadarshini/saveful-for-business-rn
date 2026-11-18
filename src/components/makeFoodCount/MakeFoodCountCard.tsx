import React from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { AppText } from '@/components/AppText';
import { MfcArt } from '@/components/makeFoodCount/MfcArt';
import { MFC } from '@/constants/makeFoodCount';
import { palette } from '@/theme/colors';
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

      {/* One row: the main action, then two icon buttons that say what they are at a glance. */}
      <View style={styles.actionsRow}>
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel={continuing ? 'Continue recording food waste' : 'Record food waste'}
          style={({ pressed }) => [styles.cta, pressed && styles.pressed]}
        >
          <AppText variant="bodyBold" color={MFC.white} numberOfLines={1} style={styles.ctaText}>
            {continuing ? 'Continue recording' : 'Record Food Waste'}
          </AppText>
          <Ionicons name="arrow-forward" size={normalize(18)} color={MFC.white} />
        </Pressable>
        <IconButton
          icon="receipt-outline"
          label="Recent records"
          tint={MFC.lilac}
          color={MFC.purple}
          onPress={openRecent}
        />
        <IconButton
          icon="pie-chart-outline"
          label="Food Impact insights"
          tint={MFC.greenBg}
          color={MFC.greenText}
          onPress={() => navigation.navigate('MakeFoodCount', { screen: 'MfcFoodImpact' })}
        />
      </View>
    </View>
  );
}

/** Square icon button; the label is spoken by screen readers and shown on long press. */
function IconButton({
  icon,
  label,
  tint,
  color,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  tint: string;
  color: string;
  onPress: () => void;
}) {
  const [hint, setHint] = React.useState(false);
  return (
    <View>
      <Pressable
        onPress={onPress}
        onLongPress={() => setHint(true)}
        onPressOut={() => setHint(false)}
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={4}
        style={({ pressed }) => [styles.iconBtn, { backgroundColor: tint }, pressed && styles.pressed]}
      >
        <Ionicons name={icon} size={normalize(22)} color={color} />
      </Pressable>
      {hint ? (
        <View style={styles.tooltip} pointerEvents="none">
          <AppText variant="meta" color={MFC.white} numberOfLines={1} style={styles.tooltipText}>
            {label}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    // Same card as "Got surplus food?" on Home.
    borderRadius: normalize(24),
    borderWidth: 1,
    borderColor: palette.strokecream,
    backgroundColor: palette.white,
    padding: normalize(16),
    gap: normalize(12),
    ...Platform.select({
      ios: { shadowColor: palette.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
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
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ctaText: { flexShrink: 1 },
  iconBtn: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltip: {
    position: 'absolute',
    bottom: 56,
    right: 0,
    backgroundColor: MFC.ink,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tooltipText: { fontFamily: 'Saveful-SemiBold' },
  cta: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: normalize(14),
    borderRadius: 14,
    backgroundColor: MFC.purple,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: { opacity: 0.88 },
});
