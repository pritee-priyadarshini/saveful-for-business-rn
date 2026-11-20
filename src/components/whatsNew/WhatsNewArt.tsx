/**
 * Illustrations for the What's new announcement: miniature, true-to-life
 * pictures of each feature, built from the app's own art and colours.
 *
 * Each piece is drawn at a fixed design size and scaled as one unit, so it
 * keeps its proportions on every screen. Text inside never follows the
 * system text size: these are pictures, not readable UI.
 */
import React, { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { AppText } from '@/components/AppText';
import { MfcArt, type MfcArtKey } from '@/components/makeFoodCount/MfcArt';
import { MFC, MFC_IMPACT_COLORS } from '@/constants/makeFoodCount';
import { palette } from '@/theme/colors';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Draws children at `width × height` and scales them to `scale`, keeping layout honest. */
export function Scaled({ width, height, scale, children }: { width: number; height: number; scale: number; children: React.ReactNode }) {
  return (
    <View style={{ width: width * scale, height: height * scale }} accessible={false} importantForAccessibility="no-hide-descendants">
      <View
        style={{
          position: 'absolute',
          width,
          height,
          left: (width * scale - width) / 2,
          top: (height * scale - height) / 2,
          transform: [{ scale }],
        }}
      >
        {children}
      </View>
    </View>
  );
}

function T({
  children,
  size,
  color = palette.black,
  weight = 'regular',
  style,
}: {
  children: React.ReactNode;
  size: number;
  color?: string;
  weight?: 'regular' | 'semibold' | 'bold';
  style?: StyleProp<TextStyle>;
}) {
  const fontFamily = weight === 'bold' ? 'Saveful-Bold' : weight === 'semibold' ? 'Saveful-SemiBold' : 'Saveful-Regular';
  return (
    <AppText
      allowFontScaling={false}
      numberOfLines={1}
      style={[{ fontFamily, fontSize: size, lineHeight: Math.round(size * 1.3), color, textTransform: 'none', letterSpacing: 0 }, style]}
    >
      {children}
    </AppText>
  );
}

/** A gentle, endless float. Still when the person prefers reduced motion. */
export function Float({
  children,
  delay = 0,
  distance = 6,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  distance?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduceMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return undefined;
    const ease = Easing.inOut(Easing.sin);
    y.value = withDelay(
      delay,
      withRepeat(withSequence(withTiming(-distance, { duration: 1700, easing: ease }), withTiming(0, { duration: 1700, easing: ease })), -1),
    );
    return () => cancelAnimation(y);
  }, [delay, distance, reduceMotion, y]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  // Position and tilt stay on the outer view; the float runs on the inner one, so neither overrides the other.
  return (
    <View style={style}>
      <Animated.View style={animated}>{children}</Animated.View>
    </View>
  );
}

function Chip({ icon, iconBg, label, sub }: { icon: keyof typeof Ionicons.glyphMap; iconBg: string; label: string; sub?: string }) {
  return (
    <View style={styles.chip}>
      <View style={[styles.chipIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={14} color={palette.white} />
      </View>
      <View>
        <T size={12} weight="bold">{label}</T>
        {sub ? <T size={10} color={palette.stone}>{sub}</T> : null}
      </View>
    </View>
  );
}

// ─── Make Food Count phone ───────────────────────────────────────────────────

export const MFC_ART = { width: 300, height: 340 };

const SOURCES: { art: MfcArtKey; label: string; kg: string; pct: number }[] = [
  { art: 'sourceOverproduction', label: 'Overproduction', kg: '8.2', pct: 0.82 },
  { art: 'sourcePreparation', label: 'Preparation', kg: '4.6', pct: 0.46 },
  { art: 'sourceSpoilage', label: 'Spoilage', kg: '3.1', pct: 0.31 },
  { art: 'sourcePlateScraps', label: 'Plate scraps', kg: '2.5', pct: 0.25 },
];

export function MfcPhone() {
  return (
    <View style={{ width: MFC_ART.width, height: MFC_ART.height, alignItems: 'center' }}>
      <View style={styles.phone}>
        <View style={styles.notch} />
        <View style={styles.phoneHead}>
          <MaterialCommunityIcons name="chef-hat" size={16} color={MFC.purple} />
          <T size={12} weight="bold" color={MFC.ink}>Make Food Count</T>
          <View style={styles.flex} />
          <View style={styles.todayPill}>
            <T size={9} weight="semibold" color={MFC.purple}>Today</T>
          </View>
        </View>
        <View style={styles.total}>
          <T size={26} weight="bold" color={MFC.ink}>18.4</T>
          <T size={11} color={MFC.muted} style={styles.totalUnit}>kg recorded</T>
        </View>
        {SOURCES.map((row) => (
          <View key={row.label} style={styles.sourceRow}>
            <MfcArt art={row.art} size={24} radius={6} />
            <View style={styles.flex}>
              <View style={styles.sourceTop}>
                <T size={10} weight="semibold" color={MFC.ink}>{row.label}</T>
                <T size={10} weight="bold" color={MFC.ink}>{row.kg} kg</T>
              </View>
              <View style={styles.sourceTrack}>
                <View style={[styles.sourceFill, { width: `${row.pct * 100}%` }]} />
              </View>
            </View>
          </View>
        ))}
        <View style={styles.impact}>
          <T size={9} weight="semibold" color={MFC.muted}>FOOD IMPACT</T>
          <View style={styles.impactBar}>
            <View style={{ flex: 72, backgroundColor: MFC_IMPACT_COLORS.recovered }} />
            <View style={{ flex: 28, backgroundColor: MFC_IMPACT_COLORS.notRecovered }} />
          </View>
        </View>
      </View>

      <Float delay={200} style={styles.mfcChip}>
        <Chip icon="heart" iconBg={palette.kale} label="8.2 kg to charity" sub="Listed from overproduction" />
      </Float>
    </View>
  );
}

// ─── Consolidated dashboard ──────────────────────────────────────────────────

export const CC_ART = { width: 300, height: 330 };

const SITES = [
  { name: 'Kiosk 1', kg: '4.2 kg', done: true },
  { name: 'Corporate Suite', kg: '3.8 kg', done: true },
  { name: 'Members Bar', kg: '2.5 kg', done: true },
  { name: 'Food Court', kg: 'Listing…', done: false },
];

export function CollectionBoard() {
  return (
    <View style={{ width: CC_ART.width, height: CC_ART.height, alignItems: 'center', justifyContent: 'center' }}>
      <View style={styles.board}>
        <View style={styles.boardHead}>
          <View style={styles.boardIcon}>
            <Ionicons name="git-merge-outline" size={15} color={palette.kale} />
          </View>
          <View style={styles.flex}>
            <T size={13} weight="bold">Stadium North</T>
            <T size={10} color={palette.stone}>Today · Loading Dock B</T>
          </View>
        </View>
        <View style={styles.boardStatus}>
          <View style={styles.dot} />
          <T size={9} weight="bold" color={palette.kale} style={styles.tracked}>SITES LISTING</T>
        </View>
        <View style={styles.sourceTop}>
          <T size={11} weight="semibold">Sites listed</T>
          <T size={11} weight="bold" color={palette.kale}>3 of 4</T>
        </View>
        <View style={styles.boardTrack}>
          <View style={[styles.boardFill, { width: '75%' }]} />
        </View>
        {SITES.map((site) => (
          <View key={site.name} style={styles.siteRow}>
            <View style={[styles.siteTick, !site.done && styles.siteTickPending]}>
              {site.done ? <Ionicons name="checkmark" size={11} color={palette.white} /> : null}
            </View>
            <T size={11} weight="semibold" color={site.done ? palette.black : palette.stone} style={styles.flex}>{site.name}</T>
            <T size={10} color={site.done ? palette.midgray : palette.stone}>{site.kg}</T>
          </View>
        ))}
      </View>

      <Float delay={300} style={styles.ccChipTop}>
        <Chip icon="location" iconBg={palette.kale} label="10.5 kg at the point" sub="Ready to publish" />
      </Float>
      <Float delay={1000} distance={5} style={styles.ccChipBottom}>
        <Chip icon="car" iconBg={palette.primary} label="1 charity pickup" sub="2:15 – 3:15 pm" />
      </Float>
    </View>
  );
}

const shadow = {
  shadowColor: '#1B0B2E',
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.18,
  shadowRadius: 18,
  elevation: 8,
};

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  tracked: { letterSpacing: 0.8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: palette.white,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
    borderRadius: 999,
    ...shadow,
  },
  chipIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },

  // Make Food Count phone
  phone: {
    width: 212,
    height: 318,
    borderRadius: 32,
    borderWidth: 6,
    borderColor: '#24113A',
    backgroundColor: palette.white,
    paddingHorizontal: 14,
    paddingTop: 22,
    gap: 9,
    overflow: 'hidden',
    ...shadow,
  },
  notch: { position: 'absolute', top: 7, alignSelf: 'center', width: 54, height: 12, borderRadius: 6, backgroundColor: '#24113A' },
  phoneHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  todayPill: { backgroundColor: '#F1E8FB', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 },
  total: { flexDirection: 'row', alignItems: 'baseline', gap: 5, marginTop: 2 },
  totalUnit: { marginBottom: 2 },
  sourceRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sourceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sourceTrack: { height: 5, borderRadius: 3, backgroundColor: '#EFE7F7', marginTop: 3, overflow: 'hidden' },
  sourceFill: { height: '100%', borderRadius: 3, backgroundColor: MFC.purple },
  impact: { marginTop: 4, gap: 5, paddingTop: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E7DFEF' },
  impactBar: { flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', gap: 2 },
  mfcChip: { position: 'absolute', left: 0, bottom: 34 },

  // Consolidated board
  board: {
    width: 228,
    borderRadius: 22,
    backgroundColor: palette.white,
    padding: 14,
    gap: 8,
    ...shadow,
  },
  boardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  boardIcon: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#DCEFE3', alignItems: 'center', justifyContent: 'center' },
  boardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    backgroundColor: '#EEF7F2',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.kale },
  boardTrack: { height: 6, borderRadius: 3, backgroundColor: '#E8E2D5', overflow: 'hidden' },
  boardFill: { height: '100%', borderRadius: 3, backgroundColor: palette.kale },
  siteRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 },
  siteTick: { width: 18, height: 18, borderRadius: 9, backgroundColor: palette.kale, alignItems: 'center', justifyContent: 'center' },
  siteTickPending: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: '#D3CCBE', borderStyle: 'dashed' },
  ccChipTop: { position: 'absolute', right: 0, top: 6 },
  ccChipBottom: { position: 'absolute', left: 0, bottom: 4 },
});
