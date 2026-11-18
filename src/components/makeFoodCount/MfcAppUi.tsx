import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/AppText';
import { MFC } from '@/constants/makeFoodCount';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

/**
 * Make Food Count building blocks, styled after the client's mobile mock-ups
 * (deck "Saveful Make Food Count 2610"): white page, purple sentence-case
 * titles, lilac panels with hairline lilac borders, purple pill buttons with a
 * lilac Back pill, photo chips that turn green with a tick when done.
 */

type IconName = keyof typeof Ionicons.glyphMap;

/** Kept for screens that read tints directly; values follow the deck. */
export const mfcUi = {
  radius: 14,
  radiusSm: 10,
  kaleTint: MFC.greenBg,
  orangeTint: MFC.orangeBg,
  eggplantTint: MFC.lilac,
  eggplantBorder: MFC.panelBorder,
  warnBg: '#FFF6EC',
  dangerBg: '#FDECE8',
  dangerBorder: '#F1C4B7',
  fieldBorder: MFC.inputBorder,
  track: '#EEE9F3',
} as const;

// ─── Cards ───────────────────────────────────────────────────────────────────

type CardTone = 'default' | 'tint';

/** `default`: white card with a lilac hairline. `tint`: the deck's lilac panel. */
export function MfcCard({
  children,
  style,
  tone = 'default',
  padded = true,
  onPress,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  tone?: CardTone;
  padded?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
}) {
  const base = [styles.card, tone === 'tint' && styles.cardTint, padded && styles.cardPadded, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View style={base} accessibilityLabel={accessibilityLabel}>
      {children}
    </View>
  );
}

// ─── Text structure ──────────────────────────────────────────────────────────

/** Bold section heading in ink, sentence case ("What would you like to do next?"). */
export function MfcSectionLabel({
  children,
  color = MFC.ink,
  style,
}: {
  children: string;
  color?: string;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <AppText variant="subheading" color={color} style={[styles.sectionLabel, style]} accessibilityRole="header">
      {children}
    </AppText>
  );
}

/** Purple "‹ Back" link at the top of each screen. */
export function MfcBackLink({ label = 'Back', onPress }: { label?: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.backLink, pressed && styles.pressed]}
    >
      <AppText variant="bodySmall" color={MFC.purple} style={styles.strong}>
        {`‹ ${label}`}
      </AppText>
    </Pressable>
  );
}

/**
 * The deck's screen title block: optional "‹ Back" link, grey breadcrumb, big
 * purple title, grey intro line.
 */
export function MfcPageTitle({
  title,
  subtitle,
  eyebrow,
  back,
  compact = false,
  style,
}: {
  title: string;
  /** Smaller title, for screens that should fit without scrolling. */
  compact?: boolean;
  subtitle?: string | null;
  /** Breadcrumb, e.g. "Make Food Count / Food summary". */
  eyebrow?: string | null;
  back?: { label?: string; onPress: () => void } | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.pageTitle, style]}>
      {back ? <MfcBackLink label={back.label} onPress={back.onPress} /> : null}
      {eyebrow ? (
        <AppText variant="meta" color={MFC.muted}>
          {eyebrow}
        </AppText>
      ) : null}
      <AppText variant="subheading" color={MFC.purple} style={compact ? styles.titleCompact : styles.title} accessibilityRole="header">
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant={compact ? 'bodySmall' : 'body1'} color={MFC.muted} style={compact ? undefined : styles.subtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

const CTA_TONES = {
  eggplant: { fill: MFC.purple, text: palette.white },
  kale: { fill: MFC.greenText, text: palette.white },
  orange: { fill: MFC.orangeText, text: palette.white },
} as const;

/**
 * Pill button. `primary`: purple pill. `secondary`: the deck's lilac pill
 * (used for Back and Save). Arrows are icons, never a → glyph.
 */
export function MfcCta({
  label,
  onPress,
  variant = 'primary',
  tone = 'eggplant',
  arrow = false,
  icon,
  loading = false,
  disabled = false,
  compact = false,
  style,
  accessibilityLabel,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary';
  tone?: keyof typeof CTA_TONES;
  arrow?: boolean;
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  const primary = variant === 'primary';
  const inactive = disabled || loading;
  const fill = primary ? (inactive ? MFC.disabled : CTA_TONES[tone].fill) : MFC.backPill;
  const color = primary ? palette.white : inactive ? MFC.disabled : MFC.purple;
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.cta,
        compact && styles.ctaCompact,
        { backgroundColor: fill },
        pressed && !inactive && styles.pressed,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={color} size="small" /> : null}
      {icon && !loading ? <Ionicons name={icon} size={normalize(17)} color={color} /> : null}
      <AppText variant="bodyBold" color={color} numberOfLines={1} style={styles.ctaText}>
        {label}
      </AppText>
      {arrow && !loading ? <Ionicons name="arrow-forward" size={normalize(17)} color={color} /> : null}
    </Pressable>
  );
}

// ─── Chips / tabs / badges ───────────────────────────────────────────────────

/**
 * Source chip: rounded rectangle, optional picture. Current = lilac with a
 * purple border; done = green with a tick after the label.
 */
export function MfcChip({
  label,
  selected = false,
  done = false,
  onPress,
  leading,
  accessibilityLabel,
  accessibilityHint,
  style,
}: {
  label: string;
  selected?: boolean;
  done?: boolean;
  onPress: () => void;
  /** A small picture before the label. */
  leading?: React.ReactNode;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const fill = selected ? MFC.lilac : done ? MFC.doneBg : MFC.white;
  const border = selected ? MFC.purple : done ? MFC.doneBorder : MFC.chipBorder;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, { backgroundColor: fill, borderColor: border }, pressed && styles.pressed, style]}
    >
      {leading}
      <AppText variant="meta" color={MFC.purple} numberOfLines={1} style={styles.chipText}>
        {label}
      </AppText>
      {done ? <Ionicons name="checkmark" size={normalize(14)} color={MFC.purple} /> : null}
    </Pressable>
  );
}

/** Small status badge (Draft / Saved, "Illustrative demo data"). */
export function MfcBadge({ label, color, background }: { label: string; color: string; background: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: background }]}>
      <AppText variant="meta" color={color} numberOfLines={1} style={styles.strong}>
        {label}
      </AppText>
    </View>
  );
}

/** Equal-width segmented control (purple when on), for switching views on one screen. */
export function MfcTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segmented} accessibilityRole="tablist">
      {options.map((option) => {
        const on = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            style={({ pressed }) => [styles.segment, on && styles.segmentOn, pressed && !on && styles.pressed]}
          >
            <AppText
              variant="meta"
              color={on ? MFC.white : MFC.purple}
              style={styles.strong}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Notices / states ────────────────────────────────────────────────────────

type NoticeTone = 'warn' | 'danger' | 'tint' | 'muted';

const NOTICE: Record<NoticeTone, { bg: string; color: string }> = {
  // The deck's notices are lilac with purple text.
  tint: { bg: MFC.notice, color: MFC.purple },
  muted: { bg: MFC.panel, color: MFC.ink },
  warn: { bg: '#FFF6EC', color: '#94500A' },
  danger: { bg: '#FDECE8', color: palette.danger },
};

export function MfcNotice({
  tone = 'warn',
  icon,
  title,
  body,
  children,
  style,
}: {
  tone?: NoticeTone;
  icon?: IconName;
  title: string;
  body?: string | null;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const colors = NOTICE[tone];
  return (
    <View style={[styles.notice, { backgroundColor: colors.bg }, style]} accessibilityRole={tone === 'danger' ? 'alert' : undefined}>
      <View style={styles.noticeHead}>
        {icon || tone === 'danger' || tone === 'warn' ? (
          <Ionicons
            name={icon ?? (tone === 'danger' ? 'alert-circle' : 'warning')}
            size={normalize(17)}
            color={colors.color}
            style={styles.noticeIcon}
          />
        ) : null}
        <View style={styles.flex}>
          <AppText variant="bodySmall" color={colors.color} style={body ? styles.strong : undefined}>
            {title}
          </AppText>
          {body ? (
            <AppText variant="bodySmall" color={MFC.muted} style={styles.noticeBody}>
              {body}
            </AppText>
          ) : null}
        </View>
      </View>
      {children}
    </View>
  );
}

export function MfcEmpty({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <MfcCard tone="tint" style={styles.empty}>
      <View style={styles.emptyIcon}>
        <Ionicons name={icon} size={normalize(24)} color={MFC.purple} />
      </View>
      <AppText variant="bodyBold" color={MFC.ink} style={styles.center}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodySmall" color={MFC.muted} style={styles.center}>
          {body}
        </AppText>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </MfcCard>
  );
}

export function MfcSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <MfcCard tone="tint" style={styles.skeleton}>
      <View style={[styles.skeletonBar, { width: '45%', height: normalize(16) }]} />
      {Array.from({ length: lines }).map((_, index) => (
        <View key={index} style={[styles.skeletonBar, { width: `${90 - index * 15}%` }]} />
      ))}
    </MfcCard>
  );
}

/** Tappable list row: icon (or picture), title, subtitle, optional right slot, chevron. */
export function MfcNavRow({
  icon,
  leading,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: IconName;
  leading?: React.ReactNode;
  title: string;
  subtitle?: string | null;
  right?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <MfcCard onPress={onPress} accessibilityLabel={title} style={styles.navRow}>
      {leading ?? (
        <View style={styles.navIcon}>
          <Ionicons name={icon ?? 'document-text-outline'} size={normalize(20)} color={MFC.purple} />
        </View>
      )}
      <View style={styles.flex}>
        <AppText variant="bodyBold" color={MFC.purple} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="meta" color={MFC.muted} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      <Ionicons name="chevron-forward" size={normalize(16)} color={MFC.purple} />
    </MfcCard>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  strong: { fontFamily: 'Saveful-SemiBold' },
  pressed: { opacity: 0.85 },
  card: {
    backgroundColor: MFC.white,
    borderRadius: mfcUi.radius,
    borderWidth: 1,
    borderColor: MFC.panelBorder,
  },
  cardTint: { backgroundColor: MFC.panel },
  cardPadded: { padding: normalize(14) },
  sectionLabel: { fontSize: normalize(19), lineHeight: normalize(24) },
  backLink: { alignSelf: 'flex-start', paddingVertical: 4 },
  pageTitle: { gap: 6 },
  title: { fontSize: normalize(28), lineHeight: normalize(33) },
  titleCompact: { fontSize: normalize(22), lineHeight: normalize(27) },
  subtitle: { lineHeight: normalize(23) },
  cta: {
    minHeight: 50,
    borderRadius: 999,
    paddingHorizontal: normalize(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  ctaCompact: { minHeight: 40, paddingHorizontal: normalize(16) },
  ctaText: { letterSpacing: 0.1 },
  chip: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingLeft: 6,
    paddingRight: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  chipText: { flexShrink: 1, fontFamily: 'Saveful-Bold' },
  segmented: {
    flexDirection: 'row',
    gap: 4,
    padding: 4,
    borderRadius: 999,
    backgroundColor: MFC.lilac,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderRadius: 999,
  },
  segmentOn: { backgroundColor: MFC.purple },
  badge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  notice: { borderRadius: 12, paddingVertical: normalize(12), paddingHorizontal: normalize(14), gap: 8 },
  noticeHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  noticeIcon: { marginTop: 1 },
  noticeBody: { marginTop: 2 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: normalize(24) },
  emptyIcon: {
    width: normalize(52),
    height: normalize(52),
    borderRadius: normalize(26),
    backgroundColor: MFC.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyAction: { marginTop: 8, alignSelf: 'stretch' },
  skeleton: { gap: 10 },
  skeletonBar: { height: normalize(12), borderRadius: 6, backgroundColor: '#EEE9F3' },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  navIcon: {
    width: normalize(40),
    height: normalize(40),
    borderRadius: 10,
    backgroundColor: MFC.lilac,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const FOOTER_GAP = 14;

/** Buttons pinned to the bottom of a screen, above the home indicator. Pass as `<Screen footer>`. */
export function MfcFooter({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  return (
    // Clear of the home indicator (gesture phones) and of Android's button bar, plus a little air.
    <View style={[footerStyles.footer, { paddingBottom: insets.bottom + FOOTER_GAP }]}>
      <View style={footerStyles.row}>{children}</View>
    </View>
  );
}

const footerStyles = StyleSheet.create({
  footer: {
    backgroundColor: MFC.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: MFC.panelBorder,
    paddingTop: 12,
    paddingHorizontal: normalize(16),
    shadowColor: '#2B1A40',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  row: { flexDirection: 'row', gap: 10, width: '100%', maxWidth: 720, alignSelf: 'center' },
});
