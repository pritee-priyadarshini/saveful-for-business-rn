import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  BackHandler,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { ActionButton, cc } from '@/components/consolidated/ui';
import { useOverlayOrigin } from '@/hooks/useOverlayOrigin';
import { useGuideStore } from '@/store/guideStore';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

import type { ActiveTour, GuideTargetEntry } from './GuideProvider';
import { JourneyTrack } from './JourneyTrack';

const AnimatedPath = Animated.createAnimatedComponent(Path);

type Rect = { top: number; left: number; width: number; height: number };

/** Breathing room between the target and the spotlight edge. */
const PAD = 6;
const RADIUS = 18;
/** Space between spotlight and card, where the pointer sits. */
const GAP = 14;
const SCRIM = 'rgba(24, 10, 38, 0.74)';
const EASE = Easing.bezier(0.22, 1, 0.36, 1);

function measure(entry: GuideTargetEntry | undefined): Promise<Rect | null> {
  return new Promise((resolve) => {
    const node = entry?.ref.current;
    if (!node) {
      resolve(null);
      return;
    }
    node.measureInWindow((left, top, width, height) => {
      resolve(width > 0 && height > 0 ? { left, top, width, height } : null);
    });
  });
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function GuideOverlay({
  active,
  targets,
  onFinish,
}: {
  active: ActiveTour;
  targets: Map<string, GuideTargetEntry>;
  onFinish: () => void;
}) {
  const { tour, steps, auto } = active;
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const reduceMotion = useReducedMotion();
  const overlay = useOverlayOrigin();
  const setEnabled = useGuideStore((state) => state.setEnabled);

  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [index, setIndex] = useState(0);
  const direction = useRef<1 | -1>(1);
  const [mode, setMode] = useState<'tour' | 'off'>('tour');
  /** Target rect in window coordinates, for the step at `locatedIndex`. */
  const [target, setTarget] = useState<Rect | null>(null);
  const [locatedIndex, setLocatedIndex] = useState(-1);
  const [cardHeight, setCardHeight] = useState<number | null>(null);
  const closing = useRef(false);

  const step = steps[index];
  const stepKey = mode === 'off' ? 'off' : String(index);
  const last = index === steps.length - 1;
  const isTablet = window.width >= 600;

  // ── Close ────────────────────────────────────────────────────────────────
  const rootOpacity = useSharedValue(0);
  useEffect(() => {
    rootOpacity.value = withTiming(1, { duration: reduceMotion ? 0 : 200 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    rootOpacity.value = withTiming(0, { duration: reduceMotion ? 0 : 180 });
    setTimeout(onFinish, reduceMotion ? 0 : 190);
  }, [onFinish, reduceMotion, rootOpacity]);

  const go = useCallback(
    (delta: 1 | -1) => {
      direction.current = delta;
      const next = index + delta;
      if (next >= steps.length) {
        close();
        return;
      }
      if (next < 0) return;
      setIndex(next);
    },
    [close, index, steps.length],
  );

  // DEV ONLY: lets the visual preview (src/dev/consolidatedPreview.tsx) step through without taps.
  useEffect(() => {
    if (!__DEV__) return undefined;
    const handle = globalThis as { __guideGo?: (delta: 1 | -1) => void };
    handle.__guideGo = go;
    return () => {
      if (handle.__guideGo === go) handle.__guideGo = undefined;
    };
  }, [go]);

  // ── Find the target: scroll it into view if needed, then measure ────────
  useEffect(() => {
    if (!overlay.ready || !size) return undefined;
    let cancelled = false;

    const run = async () => {
      if (mode === 'off' || !step.target) {
        setTarget(null);
        setLocatedIndex(index);
        return;
      }
      const entry = targets.get(step.target);
      let rect = await measure(entry);
      if (cancelled) return;

      if (rect && entry?.scroll) {
        // Judge visibility in the overlay's own space, the same space the spotlight is drawn in.
        const local = overlay.toLocal(rect);
        const viewTop = insets.top + 12;
        const viewBottom = size.height - insets.bottom - 12;
        const viewHeight = viewBottom - viewTop;
        const room = Math.min(240, viewHeight * 0.38);
        const bottom = local.top + local.height;
        const offscreen = local.top < viewTop || bottom > viewBottom;
        const cramped = local.top - viewTop < room && viewBottom - bottom < room;
        if (offscreen || cramped) {
          const desiredTop = local.height > viewHeight * 0.5 ? viewTop + 8 : viewTop + Math.min(96, viewHeight * 0.12);
          const delta = local.top - desiredTop;
          if (Math.abs(delta) > 4) {
            entry.scroll.scrollTo(entry.scroll.getY() + delta);
            await wait(reduceMotion ? 80 : 420);
            if (cancelled) return;
            rect = await measure(entry);
            if (cancelled) return;
          }
        }
      }

      if (!rect) {
        // The element has gone (collapsed, permission changed): move on.
        const next = index + direction.current;
        if (next < 0 || next >= steps.length) close();
        else setIndex(next);
        return;
      }
      setTarget(rect);
      setLocatedIndex(index);
    };

    void run();
    return () => {
      cancelled = true;
    };
    // Re-run for each step, and when the screen size or orientation changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, mode, overlay.ready, size?.width, size?.height]);

  // ── Geometry (overlay coordinates) ───────────────────────────────────────
  const W = size?.width ?? window.width;
  const H = size?.height ?? window.height;
  const located = locatedIndex === index;

  let hole: Rect | null = null;
  if (located && target && mode === 'tour') {
    const local = overlay.toLocal(target);
    const top = Math.max(2, local.top - PAD);
    const left = Math.max(2, local.left - PAD);
    const bottom = Math.min(H - 2, local.top + local.height + PAD);
    const right = Math.min(W - 2, local.left + local.width + PAD);
    hole = { top, left, width: Math.max(0, right - left), height: Math.max(0, bottom - top) };
  }

  const margin = isTablet ? 24 : 12;
  const cardWidth = Math.min(W - margin * 2, isTablet ? 440 : 420);
  const topLimit = insets.top + margin;
  const bottomLimit = H - insets.bottom - margin;
  const cardH = cardHeight ?? 0;

  let cardTop: number;
  let cardLeft = (W - cardWidth) / 2;
  let pointer: { side: 'top' | 'bottom'; x: number } | null = null;
  if (!hole) {
    cardTop = topLimit + Math.max(0, (bottomLimit - topLimit - cardH) / 2);
  } else {
    const centreX = hole.left + hole.width / 2;
    cardLeft = Math.min(Math.max(centreX - cardWidth / 2, margin), W - margin - cardWidth);
    const pointerX = Math.min(Math.max(centreX - cardLeft, 28), cardWidth - 28);
    const below = hole.top + hole.height + GAP;
    const above = hole.top - GAP - cardH;
    if (below + cardH <= bottomLimit) {
      cardTop = below;
      pointer = { side: 'top', x: pointerX };
    } else if (above >= topLimit) {
      cardTop = above;
      pointer = { side: 'bottom', x: pointerX };
    } else {
      // Neither side fits (very tall target or a small screen): rest on the bottom edge.
      cardTop = Math.max(topLimit, bottomLimit - cardH);
    }
  }
  const ready = located && cardHeight != null;

  // ── Spotlight animation ──────────────────────────────────────────────────
  const hx = useSharedValue(W / 2);
  const hy = useSharedValue(H / 2);
  const hw = useSharedValue(0);
  const hh = useSharedValue(0);

  useEffect(() => {
    if (!located) return;
    const timing = { duration: reduceMotion ? 0 : 420, easing: EASE };
    if (hole) {
      if (hw.value < 1) {
        // Open like an iris from the target's centre rather than sliding in from a corner.
        hx.value = hole.left + hole.width / 2;
        hy.value = hole.top + hole.height / 2;
      }
      hx.value = withTiming(hole.left, timing);
      hy.value = withTiming(hole.top, timing);
      hw.value = withTiming(hole.width, timing);
      hh.value = withTiming(hole.height, timing);
    } else {
      hx.value = withTiming(hx.value + hw.value / 2, timing);
      hy.value = withTiming(hy.value + hh.value / 2, timing);
      hw.value = withTiming(0, timing);
      hh.value = withTiming(0, timing);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [located, hole?.top, hole?.left, hole?.width, hole?.height]);

  const scrimProps = useAnimatedProps(() => {
    const outer = `M0 0H${W}V${H}H0Z`;
    const w = hw.value;
    const h = hh.value;
    if (w < 1 || h < 1) return { d: outer };
    const x = hx.value;
    const y = hy.value;
    const r = Math.min(RADIUS, w / 2, h / 2);
    return {
      d:
        `${outer}M${x + r} ${y}H${x + w - r}A${r} ${r} 0 0 1 ${x + w} ${y + r}` +
        `V${y + h - r}A${r} ${r} 0 0 1 ${x + w - r} ${y + h}H${x + r}` +
        `A${r} ${r} 0 0 1 ${x} ${y + h - r}V${y + r}A${r} ${r} 0 0 1 ${x + r} ${y}Z`,
    };
  }, [W, H]);

  const ringStyle = useAnimatedStyle(() => ({
    left: hx.value - 3,
    top: hy.value - 3,
    width: hw.value + 6,
    height: hh.value + 6,
    borderRadius: Math.min(RADIUS + 3, (hw.value + 6) / 2, (hh.value + 6) / 2),
    opacity: hw.value > 2 ? 1 : 0,
  }));

  const pulse = useSharedValue(0);
  useEffect(() => {
    if (reduceMotion) return undefined;
    pulse.value = withRepeat(withTiming(1, { duration: 1700, easing: Easing.out(Easing.quad) }), -1, false);
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion]);

  const pulseStyle = useAnimatedStyle(() => {
    const grow = 3 + pulse.value * 10;
    return {
      left: hx.value - grow,
      top: hy.value - grow,
      width: hw.value + grow * 2,
      height: hh.value + grow * 2,
      borderRadius: Math.min(RADIUS + grow, (hw.value + grow * 2) / 2, (hh.value + grow * 2) / 2),
      opacity: hw.value > 2 ? (1 - pulse.value) * 0.5 : 0,
    };
  });

  // ── Card animation ───────────────────────────────────────────────────────
  const cardOpacity = useSharedValue(0);
  const cardShift = useSharedValue(8);

  useEffect(() => {
    cardOpacity.value = 0;
    cardShift.value = pointer?.side === 'bottom' ? -8 : 8;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey]);

  useEffect(() => {
    if (!ready) return;
    const delay = reduceMotion ? 0 : 140;
    const timing = { duration: reduceMotion ? 0 : 280, easing: EASE };
    cardOpacity.value = withDelay(delay, withTiming(1, timing));
    cardShift.value = withDelay(delay, withTiming(0, timing));
    const announcement = mode === 'off' ? 'Guide me is off' : `${step.title}. ${step.body}`;
    AccessibilityInfo.announceForAccessibility(announcement);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, stepKey]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardShift.value }],
  }));

  const rootStyle = useAnimatedStyle(() => ({ opacity: rootOpacity.value }));

  const onRootLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((current) => (current && current.width === width && current.height === height ? current : { width, height }));
    overlay.onLayout();
  };

  // Android back closes the walkthrough instead of leaving the screen underneath.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close();
      return true;
    });
    return () => sub.remove();
  }, [close]);

  const turnOff = () => {
    setEnabled(false);
    setMode('off');
  };

  return (
    // Drawn in the app's own window, not a Modal: on Android a Modal is a separate window whose
    // coordinates are offset from the screen's (status bar, edge-to-edge), which misplaced the spotlight.
    <Animated.View
      ref={overlay.ref}
      onLayout={onRootLayout}
      accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, styles.layer, rootStyle]}
    >
      <Svg width={W} height={H} style={StyleSheet.absoluteFill} pointerEvents="none">
        <AnimatedPath animatedProps={scrimProps} fill={SCRIM} fillRule="evenodd" />
      </Svg>
      <Animated.View pointerEvents="none" style={[styles.pulse, pulseStyle]} />
      <Animated.View pointerEvents="none" style={[styles.ring, ringStyle]} />

      {hole ? (
        <Pressable
          onPress={() => go(1)}
          accessibilityRole="button"
          accessibilityLabel={last ? 'Finish the walkthrough' : 'Next step'}
          style={[styles.holeHit, { top: hole.top, left: hole.left, width: hole.width, height: hole.height }]}
        />
      ) : null}

      <Animated.View
        onLayout={(event) => {
          const height = Math.round(event.nativeEvent.layout.height);
          setCardHeight(height);
        }}
        style={[
          styles.card,
          { top: cardTop, left: cardLeft, width: cardWidth, maxHeight: bottomLimit - topLimit },
          cardStyle,
        ]}
      >
        {pointer ? (
          <View
            pointerEvents="none"
            style={[
              styles.pointer,
              pointer.side === 'top' ? styles.pointerTop : styles.pointerBottom,
              { left: pointer.x - POINTER / 2 },
            ]}
          />
        ) : null}

        {mode === 'off' ? (
          <OffCard onDone={close} />
        ) : (
          <>
            <View style={styles.eyebrowRow}>
              <View style={styles.eyebrow}>
                <Ionicons name="compass" size={normalize(14)} color={palette.kale} />
                <AppText variant="caption" color={palette.kale} numberOfLines={1} style={styles.eyebrowText}>
                  {tour.title}
                </AppText>
                {steps.length > 1 ? (
                  <AppText variant="meta" color={palette.stone} style={styles.count}>
                    {index + 1}/{steps.length}
                  </AppText>
                ) : null}
              </View>
            </View>

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.content}
              bounces={false}
              showsVerticalScrollIndicator={false}
            >
              {step.journey != null ? <JourneyTrack stage={step.journey} /> : null}
              <AppText variant="subheading" accessibilityRole="header">{step.title}</AppText>
              <AppText variant="bodySmall" color={palette.midgray} style={styles.body}>{step.body}</AppText>
              {step.tip ? (
                <View style={styles.tip}>
                  <Ionicons name="bulb-outline" size={normalize(15)} color={palette.kale} style={styles.tipIcon} />
                  <AppText variant="meta" color={palette.midgray} style={styles.flex}>{step.tip}</AppText>
                </View>
              ) : null}
            </ScrollView>

            {steps.length > 1 ? (
              <View style={styles.progress} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                {steps.map((_, i) => (
                  <View key={i} style={[styles.segment, i <= index && styles.segmentOn]} />
                ))}
              </View>
            ) : null}

            <View style={styles.footer}>
              <ActionButton
                label="Skip"
                variant="ghost"
                size="compact"
                textColor={palette.stone}
                onPress={close}
                style={styles.skipBtn}
              />
              <ActionButton
                label="Back"
                variant="secondary"
                size="compact"
                disabled={index === 0}
                onPress={() => go(-1)}
                style={styles.back}
              />
              <ActionButton
                label={last ? 'Done' : 'Next'}
                icon={last ? 'checkmark' : undefined}
                size="compact"
                onPress={() => go(1)}
                style={styles.next}
              />
            </View>

            {auto && index === 0 ? (
              <Pressable onPress={turnOff} hitSlop={8} style={styles.offLink} accessibilityRole="button">
                <AppText variant="meta" color={palette.stone} style={styles.center}>
                  Prefer to find your way around?{' '}
                  <AppText variant="meta" color={palette.primary} style={styles.offLinkStrong}>Turn off Guide me</AppText>
                </AppText>
              </Pressable>
            ) : null}
          </>
        )}
      </Animated.View>
    </Animated.View>
  );
}

function OffCard({ onDone }: { onDone: () => void }) {
  return (
    <View style={styles.offCard}>
      <View style={styles.offIcon}>
        <Ionicons name="compass-outline" size={normalize(24)} color={palette.kale} />
      </View>
      <AppText variant="subheading" accessibilityRole="header" style={styles.center}>Guide me is off</AppText>
      <AppText variant="bodySmall" color={palette.midgray} style={[styles.center, styles.body]}>
        Walkthroughs won’t open by themselves any more. Tap the compass at the top of any collection screen to see one, or turn
        Guide me back on in your Profile.
      </AppText>
      <ActionButton label="Got it" size="compact" onPress={onDone} style={styles.offButton} />
    </View>
  );
}

const POINTER = 16;

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: palette.mint,
  },
  pulse: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: palette.mint,
  },
  holeHit: { position: 'absolute' },
  card: {
    position: 'absolute',
    backgroundColor: palette.white,
    borderRadius: cc.radius,
    paddingHorizontal: normalize(18),
    paddingTop: normalize(14),
    paddingBottom: normalize(14),
    shadowColor: '#12061F',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },
  pointer: {
    position: 'absolute',
    width: POINTER,
    height: POINTER,
    backgroundColor: palette.white,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  pointerTop: { top: -POINTER / 2 + 1 },
  pointerBottom: { bottom: -POINTER / 2 + 1 },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: normalize(10),
  },
  eyebrow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1, minWidth: 0 },
  eyebrowText: { letterSpacing: 0.9, flexShrink: 1 },
  count: { fontVariant: ['tabular-nums'] },
  scroll: { flexGrow: 0, flexShrink: 1 },
  content: { gap: normalize(8) },
  body: { lineHeight: normalize(20) },
  tip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 2,
    paddingVertical: 9,
    paddingHorizontal: 11,
    borderRadius: 12,
    backgroundColor: cc.tint,
  },
  tipIcon: { marginTop: 1 },
  progress: { flexDirection: 'row', gap: 4, marginTop: normalize(14) },
  segment: { flex: 1, height: 4, borderRadius: 2, backgroundColor: '#ECE6DA' },
  segmentOn: { backgroundColor: palette.kale },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: normalize(12),
  },
  layer: { zIndex: 1000, elevation: 1000 },
  skipBtn: { paddingHorizontal: normalize(6), marginLeft: -normalize(6), flexShrink: 0 },
  back: { flex: 1, minWidth: 0, paddingHorizontal: normalize(8) },
  next: { flex: 1.35, minWidth: 0, paddingHorizontal: normalize(8) },
  offLink: { marginTop: normalize(12), paddingTop: normalize(10), borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cc.hairline },
  offLinkStrong: { fontFamily: 'Saveful-SemiBold' },
  offCard: { alignItems: 'center', gap: normalize(8), paddingTop: normalize(6) },
  offIcon: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: cc.tint,
    marginBottom: 4,
  },
  offButton: { alignSelf: 'stretch', marginTop: normalize(8) },
});
