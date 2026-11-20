import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ImageBackground,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ActionButton } from '@/components/consolidated/ui';
import { MFC } from '@/constants/makeFoodCount';
import { WHATS_NEW_FEATURES, WHATS_NEW_INTRO, type WhatsNewFeature, type WhatsNewFeatureId } from '@/data/whatsNew';
import { useConsolidatedAccess } from '@/hooks/useConsolidatedAccess';
import { useWhatsNewStore } from '@/store/whatsNewStore';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

import { CC_ART, CollectionBoard, INTRO_ART, IntroCollage, MFC_ART, MfcPhone, Scaled } from './WhatsNewArt';

export type WhatsNewDestination = 'makeFoodCount' | 'consolidatedGroups' | 'consolidatedCollections';

const PURPLE_BG = require('../../../assets/placeholder/purple-bg.png');
const KALE_BG = require('../../../assets/placeholder/kale-header.png');
const EASE = Easing.bezier(0.22, 1, 0.36, 1);
const PAGES = ['intro', ...WHATS_NEW_FEATURES.map((feature) => feature.id)] as const;

const ACCENT: Record<WhatsNewFeatureId, { color: string; tint: string; ink: string }> = {
  makeFoodCount: { color: MFC.purple, tint: '#F1E8FB', ink: MFC.ink },
  consolidated: { color: palette.kale, tint: '#E3F2E8', ink: palette.black },
};

/**
 * The "What's new" announcement: a short, swipeable story — an intro, then one
 * page per feature with a picture of it, three benefits and a way to try it.
 * Full screen on phones, a centred card on tablets.
 * Mount once inside the navigator's container; it opens from useWhatsNewStore.
 */
export function WhatsNewAnnouncement({ onNavigate }: { onNavigate: (to: WhatsNewDestination) => void }) {
  const visible = useWhatsNewStore((state) => state.visible);
  const manual = useWhatsNewStore((state) => state.manual);
  const close = useWhatsNewStore((state) => state.close);
  const { canManage, inGroup } = useConsolidatedAccess();

  const window = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const isTablet = window.width >= 600;

  const frameWidth = isTablet ? Math.min(480, window.width - 64) : window.width;
  const frameHeight = isTablet ? Math.min(860, window.height - 80) : window.height;
  const safeTop = isTablet ? 0 : insets.top;
  const safeBottom = isTablet ? 0 : insets.bottom;

  const scrollRef = useRef<ScrollView>(null);
  const scrollX = useSharedValue(0);
  const [page, setPage] = useState(0);

  const shown = useSharedValue(0);
  useEffect(() => {
    if (!visible) return;
    setPage(0);
    scrollX.value = 0;
    requestAnimationFrame(() => scrollRef.current?.scrollTo({ x: 0, animated: false }));
    shown.value = withTiming(1, { duration: reduceMotion ? 0 : 380, easing: EASE });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Keep the current page in place when the screen size or orientation changes.
  useEffect(() => {
    scrollRef.current?.scrollTo({ x: page * frameWidth, animated: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameWidth]);

  const dismiss = useCallback(
    (then?: () => void) => {
      const duration = reduceMotion ? 0 : 220;
      shown.value = withTiming(0, { duration, easing: Easing.in(Easing.quad) });
      setTimeout(() => {
        close();
        then?.();
      }, duration + 10);
    },
    [close, reduceMotion, shown],
  );

  const goTo = useCallback(
    (index: number) => {
      const next = Math.max(0, Math.min(PAGES.length - 1, index));
      setPage(next);
      scrollRef.current?.scrollTo({ x: next * frameWidth, animated: !reduceMotion });
    },
    [frameWidth, reduceMotion],
  );

  // DEV ONLY: lets the visual preview (src/dev/consolidatedPreview.tsx) change page without swiping.
  useEffect(() => {
    if (!__DEV__) return undefined;
    const handle = globalThis as { __whatsNewGo?: (page: string) => void };
    handle.__whatsNewGo = (name) => goTo(name === 'overview' ? 0 : PAGES.indexOf(name as never));
    return () => {
      handle.__whatsNewGo = undefined;
    };
  }, [goTo]);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });
  const onMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(event.nativeEvent.contentOffset.x / frameWidth));
  };

  const backdropStyle = useAnimatedStyle(() => ({ opacity: shown.value }));
  const frameStyle = useAnimatedStyle(() => ({
    opacity: shown.value,
    transform: [{ translateY: (1 - shown.value) * 28 }, { scale: 0.97 + shown.value * 0.03 }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={() => (page > 0 ? goTo(page - 1) : dismiss())}
      supportedOrientations={['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right']}
    >
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]} />

        <Animated.View
          accessibilityViewIsModal
          style={[
            styles.frame,
            { width: frameWidth, height: frameHeight },
            isTablet && styles.frameTablet,
            frameStyle,
          ]}
        >
          <Animated.ScrollView
            ref={scrollRef as never}
            horizontal
            pagingEnabled
            bounces={false}
            showsHorizontalScrollIndicator={false}
            onScroll={onScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentumEnd}
          >
            <IntroSlide
              width={frameWidth}
              height={frameHeight}
              safeTop={safeTop}
              safeBottom={safeBottom}
              manual={manual}
              scrollX={scrollX}
              onNext={() => goTo(1)}
              onClose={() => dismiss()}
            />
            {WHATS_NEW_FEATURES.map((feature, index) => {
              const cta = ctaFor(feature.id, { canManage, inGroup });
              const last = index === WHATS_NEW_FEATURES.length - 1;
              return (
                <FeatureSlide
                  key={feature.id}
                  feature={feature}
                  index={index + 1}
                  width={frameWidth}
                  height={frameHeight}
                  safeTop={safeTop}
                  safeBottom={safeBottom}
                  scrollX={scrollX}
                  cta={cta ? { label: cta.label, onPress: () => dismiss(() => onNavigate(cta.to)) } : null}
                  nextLabel={last ? 'Let’s go' : 'Next'}
                  onNext={() => (last ? dismiss() : goTo(index + 2))}
                />
              );
            })}
          </Animated.ScrollView>

          <TopBar
            width={frameWidth}
            top={safeTop + (isTablet ? 16 : 10)}
            scrollX={scrollX}
            onSkip={() => dismiss()}
          />
        </Animated.View>
      </View>
    </Modal>
  );
}

function ctaFor(id: WhatsNewFeatureId, access: { canManage: boolean; inGroup: boolean }): { label: string; to: WhatsNewDestination } | null {
  if (id === 'makeFoodCount') return { label: 'Explore MFC', to: 'makeFoodCount' };
  if (access.inGroup) return { label: 'Explore Collections', to: 'consolidatedCollections' };
  if (access.canManage) return { label: 'Set up Collections', to: 'consolidatedGroups' };
  // Site staff join through an invitation that shows on Home: nothing to open yet.
  return null;
}

// ─── Top bar: story progress + skip ──────────────────────────────────────────

function TopBar({ width, top, scrollX, onSkip }: { width: number; top: number; scrollX: SharedValue<number>; onSkip: () => void }) {
  // White on the purple and green pages, purple on the light lilac page.
  const range = PAGES.map((_, i) => i * width);
  const tones = PAGES.map((name) => (name === 'makeFoodCount' ? MFC.purple : palette.white));
  const skipStyle = useAnimatedStyle(() => ({ color: interpolateColor(scrollX.value, range, tones) }));

  return (
    <View style={[styles.topBar, { top }]} pointerEvents="box-none">
      <View style={styles.progress}>
        {PAGES.map((_, i) => (
          <ProgressSegment key={i} index={i} width={width} scrollX={scrollX} range={range} tones={tones} />
        ))}
      </View>
      <Pressable onPress={onSkip} hitSlop={12} accessibilityRole="button" accessibilityLabel="Skip what's new">
        <Animated.Text allowFontScaling={false} style={[styles.skip, skipStyle]}>Skip</Animated.Text>
      </Pressable>
    </View>
  );
}

function ProgressSegment({
  index, width, scrollX, range, tones,
}: { index: number; width: number; scrollX: SharedValue<number>; range: number[]; tones: string[] }) {
  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(scrollX.value, range, tones.map((tone) => (tone === palette.white ? 'rgba(255,255,255,0.32)' : 'rgba(75,32,118,0.18)'))),
  }));
  const fill = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(1, scrollX.value / width - index + 1)) * 100}%`,
    backgroundColor: interpolateColor(scrollX.value, range, tones),
  }));
  return (
    <Animated.View style={[styles.segment, track]}>
      <Animated.View style={[styles.segmentFill, fill]} />
    </Animated.View>
  );
}

// ─── Fit-to-box stage for the pictures ───────────────────────────────────────

/** Scales a fixed-size picture to fit the space it is given, never above `max`. */
function Stage({ art, max = 1.25, children }: { art: { width: number; height: number }; max?: number; children: React.ReactNode }) {
  const [box, setBox] = useState<{ width: number; height: number } | null>(null);
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((current) => (current && current.width === width && current.height === height ? current : { width, height }));
  };
  const scale = box ? Math.max(0.4, Math.min(max, box.width / art.width, box.height / art.height)) : 0;
  return (
    <View style={styles.stage} onLayout={onLayout}>
      {box ? <Scaled width={art.width} height={art.height} scale={scale}>{children}</Scaled> : null}
    </View>
  );
}

/** Pictures drift a little slower than the page as it is swiped: a touch of depth. */
function useParallax(scrollX: SharedValue<number>, index: number, width: number) {
  return useAnimatedStyle(() => {
    const offset = scrollX.value - index * width;
    return {
      transform: [
        { translateX: offset * 0.35 },
        { scale: interpolate(Math.abs(offset), [0, width], [1, 0.9], 'clamp') },
      ],
      opacity: interpolate(Math.abs(offset), [0, width * 0.8], [1, 0.3], 'clamp'),
    };
  });
}

// ─── Slides ──────────────────────────────────────────────────────────────────

function IntroSlide({
  width, height, safeTop, safeBottom, manual, scrollX, onNext, onClose,
}: {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  manual: boolean;
  scrollX: SharedValue<number>;
  onNext: () => void;
  onClose: () => void;
}) {
  const parallax = useParallax(scrollX, 0, width);
  return (
    <ImageBackground source={PURPLE_BG} resizeMode="cover" style={[styles.visual, { width, height }]}>
      <View style={[styles.introBody, { paddingTop: safeTop + 54, paddingBottom: Math.max(safeBottom, 16) + 8 }]}>
        <View style={styles.sticker}>
          <Ionicons name="sparkles" size={normalize(14)} color={palette.black} />
          <AppText variant="caption" color={palette.black} style={styles.stickerText} maxFontSizeMultiplier={1.3}>
            {WHATS_NEW_INTRO.sticker}
          </AppText>
        </View>
        <AppText variant="h3" color={palette.white} style={styles.introHeadline} accessibilityRole="header" maxFontSizeMultiplier={1.25}>
          {WHATS_NEW_INTRO.headline}
        </AppText>
        <AppText variant="bodySmall" color="rgba(255,255,255,0.86)" style={styles.introText} maxFontSizeMultiplier={1.4}>
          {WHATS_NEW_INTRO.body}
        </AppText>

        <Animated.View style={[styles.flexFill, parallax]}>
          <Stage art={INTRO_ART} max={1.3}>
            <IntroCollage />
          </Stage>
        </Animated.View>

        <Pressable
          onPress={onNext}
          accessibilityRole="button"
          style={({ pressed }) => [styles.lemonButton, pressed && styles.pressed]}
        >
          <AppText variant="bodyBold" color={palette.black} maxFontSizeMultiplier={1.3}>Show me what’s new</AppText>
          <Ionicons name="arrow-forward" size={normalize(18)} color={palette.black} />
        </Pressable>
        <Pressable onPress={onClose} hitSlop={8} style={styles.laterLink} accessibilityRole="button">
          <AppText variant="bodySmall" color="rgba(255,255,255,0.8)" style={styles.semibold} maxFontSizeMultiplier={1.3}>
            {manual ? 'Close' : 'Maybe later'}
          </AppText>
        </Pressable>
      </View>
    </ImageBackground>
  );
}

function FeatureSlide({
  feature, index, width, height, safeTop, safeBottom, scrollX, cta, nextLabel, onNext,
}: {
  feature: WhatsNewFeature;
  index: number;
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
  scrollX: SharedValue<number>;
  cta: { label: string; onPress: () => void } | null;
  nextLabel: string;
  onNext: () => void;
}) {
  const accent = ACCENT[feature.id];
  const parallax = useParallax(scrollX, index, width);
  const { fontScale } = useWindowDimensions();
  // The picture takes about half the page, within limits for small phones and tall tablets.
  // With large system text, the words get more of the page.
  const share = fontScale > 1.3 ? 0.36 : 0.47;
  const visualHeight = Math.round(Math.min(Math.max(height * share, 230), 470));
  const mfc = feature.id === 'makeFoodCount';

  const art = (
    <Animated.View style={[styles.flexFill, { paddingTop: safeTop + 40, paddingBottom: 34 }, parallax]}>
      <Stage art={mfc ? MFC_ART : CC_ART}>{mfc ? <MfcPhone /> : <CollectionBoard />}</Stage>
    </Animated.View>
  );

  return (
    <View style={{ width, height, backgroundColor: palette.white }}>
      {mfc ? (
        <LinearGradient colors={['#F6F0FC', '#E6D6F7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.visual, { height: visualHeight }]}>
          {art}
        </LinearGradient>
      ) : (
        <ImageBackground source={KALE_BG} resizeMode="cover" style={[styles.visual, { height: visualHeight }]}>
          {art}
        </ImageBackground>
      )}

      <View style={[styles.panel, { paddingBottom: Math.max(safeBottom, 16) + 8 }]}>
        <ScrollView style={styles.flexFill} contentContainerStyle={styles.panelContent} showsVerticalScrollIndicator={false} bounces={false}>
          <View style={[styles.namePill, { backgroundColor: accent.tint }]}>
            <View style={[styles.nameDot, { backgroundColor: accent.color }]} />
            <AppText variant="caption" color={accent.color} style={styles.nameText} maxFontSizeMultiplier={1.3}>
              {feature.name}
            </AppText>
          </View>
          <AppText variant="h4" color={accent.ink} accessibilityRole="header" maxFontSizeMultiplier={1.25}>
            {feature.headline}
          </AppText>

          <View style={styles.benefits}>
            {feature.benefits.map((benefit) => (
              <View key={benefit.title} style={styles.benefit}>
                <View style={[styles.benefitIcon, { backgroundColor: accent.tint }]}>
                  <Ionicons name={benefit.icon} size={normalize(18)} color={accent.color} />
                </View>
                <View style={styles.benefitCopy}>
                  <AppText variant="bodyBold" color={accent.ink} maxFontSizeMultiplier={1.5}>{benefit.title}</AppText>
                  <AppText variant="bodySmall" color={palette.midgray} style={styles.benefitBody} maxFontSizeMultiplier={1.5}>
                    {benefit.body}
                  </AppText>
                </View>
              </View>
            ))}
          </View>

          {feature.note ? (
            <View style={styles.note}>
              <Ionicons name="compass-outline" size={normalize(15)} color={accent.color} />
              <AppText variant="meta" color={palette.midgray} style={styles.flexText} maxFontSizeMultiplier={1.5}>{feature.note}</AppText>
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.footer}>
          {cta ? <ActionButton label={cta.label} variant="secondary" onPress={cta.onPress} style={styles.footerCta} /> : null}
          <ActionButton
            label={nextLabel}
            icon={nextLabel === 'Next' ? undefined : 'checkmark'}
            onPress={onNext}
            style={styles.footerNext}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  backdrop: { backgroundColor: 'rgba(20, 8, 32, 0.6)' },
  frame: { overflow: 'hidden', backgroundColor: palette.primary },
  frameTablet: {
    borderRadius: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.3,
    shadowRadius: 40,
    elevation: 24,
  },
  flexFill: { flex: 1 },
  flexText: { flex: 1, minWidth: 0 },
  semibold: { fontFamily: 'Saveful-SemiBold' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },

  topBar: {
    position: 'absolute',
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  progress: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 4, borderRadius: 2, overflow: 'hidden' },
  segmentFill: { height: '100%', borderRadius: 2 },
  skip: { fontFamily: 'Saveful-SemiBold', fontSize: 15 },

  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Each page clips its own picture, so parallax never leaks into the neighbouring page.
  visual: { overflow: 'hidden' },

  introBody: { flex: 1, paddingHorizontal: 24 },
  sticker: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: palette.lemon,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    transform: [{ rotate: '-3deg' }],
    marginBottom: 14,
  },
  stickerText: { letterSpacing: 1 },
  introHeadline: { maxWidth: 420 },
  introText: { marginTop: 10, maxWidth: 380, lineHeight: normalize(20) },
  lemonButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 54,
    borderRadius: 16,
    backgroundColor: palette.lemon,
    marginTop: 8,
  },
  laterLink: { alignSelf: 'center', paddingVertical: 12, paddingHorizontal: 16, marginBottom: -4 },

  panel: {
    flex: 1,
    marginTop: -28,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    backgroundColor: palette.white,
    paddingHorizontal: 24,
    paddingTop: 22,
  },
  panelContent: { paddingBottom: 8 },
  namePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    marginBottom: 10,
  },
  nameDot: { width: 6, height: 6, borderRadius: 3 },
  nameText: { letterSpacing: 0.9 },
  benefits: { marginTop: 18, gap: 16 },
  benefit: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  benefitIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: normalize(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitCopy: { flex: 1, minWidth: 0, gap: 2, paddingTop: 1 },
  benefitBody: { lineHeight: normalize(19) },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 18 },
  footer: { flexDirection: 'row', gap: 10, paddingTop: 12 },
  footerCta: { flex: 1, minWidth: 0 },
  footerNext: { flex: 1.5, minWidth: 0 },
});
