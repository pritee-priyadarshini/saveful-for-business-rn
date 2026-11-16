/**
 * Building blocks for the Consolidated Collections screens.
 *
 * Same visual language as the rest of the business app (Connections, Home):
 * creme page, white rounded cards with a hairline border and a soft lift,
 * kale accents on pale-green tints, eggplant for the primary action, uppercase
 * Saveful headings and badges, sentence-case body text.
 *
 * Type roles used across these screens:
 *   section title  → h8 (uppercase, like "WHAT FOOD DO YOU HAVE?")
 *   card title     → subheading (20 bold, sentence case)
 *   row title      → bodyBold
 *   body           → bodySmall
 *   secondary      → meta (13 regular, sentence case)
 *   badges         → caption (uppercase, tracked) — badges only
 */
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { normalize } from '@/utils/responsive';

type IconName = keyof typeof Ionicons.glyphMap;

export const cc = {
  hairline: '#E3DED3',
  tint: '#EEF7F2',
  tintStrong: '#DCEFE3',
  tintBorder: '#C9E2D2',
  warnBg: '#FFF4E5',
  warnBorder: '#F2D2A4',
  warnText: '#94500A',
  dangerBg: '#FDECE8',
  dangerBorder: '#F1C4B7',
  muted: '#F5F2EB',
  radius: normalize(20),
  radiusSm: normalize(14),
  /** Minimum comfortable touch target (iOS 44pt / Android 48dp). */
  touch: 44,
};

/** Data should not jitter: figures share one width. */
export const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

// ─── Surfaces ────────────────────────────────────────────────────────────────

type Tone = 'default' | 'tint' | 'warn' | 'danger' | 'muted';

const toneStyle: Record<Tone, ViewStyle> = {
  default: { backgroundColor: palette.white, borderColor: cc.hairline },
  tint: { backgroundColor: cc.tint, borderColor: cc.tintBorder },
  warn: { backgroundColor: cc.warnBg, borderColor: cc.warnBorder },
  danger: { backgroundColor: cc.dangerBg, borderColor: cc.dangerBorder },
  muted: { backgroundColor: cc.muted, borderColor: 'transparent' },
};

export function Surface({
  children,
  tone = 'default',
  style,
  onPress,
  padded = true,
  accessibilityLabel,
}: {
  children: React.ReactNode;
  tone?: Tone;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
}) {
  const content = [styles.surface, toneStyle[tone], tone === 'default' && styles.lift, padded && styles.padded, style];
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={({ pressed }) => [content, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return <View style={content}>{children}</View>;
}

// ─── Text structure ──────────────────────────────────────────────────────────

/** Section heading outside cards. More space above than below. */
export function SectionTitle({
  title,
  caption,
  action,
  style,
}: {
  title: string;
  caption?: string | null;
  action?: { label: string; onPress: () => void } | null;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.sectionTitle, style]}>
      <View style={styles.flex}>
        <AppText variant="h8" color={palette.black}>
          {title}
        </AppText>
        {caption ? (
          <AppText variant="meta" color={palette.stone} style={styles.sectionCaption}>
            {caption}
          </AppText>
        ) : null}
      </View>
      {action ? (
        <Pressable onPress={action.onPress} hitSlop={{ top: 14, bottom: 14, left: 10, right: 10 }} style={styles.sectionAction} accessibilityRole="button">
          <AppText variant="bodyBold" color={palette.primary}>
            {action.label}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Buttons ─────────────────────────────────────────────────────────────────

/**
 * The consolidated screens' button. Same props and colours as the shared
 * `Button`, at working-screen proportions: 46pt (compact 38pt) instead of 54pt,
 * so a screen with several actions stays calm. Drop-in: `import { ActionButton as Button }`.
 */
export function ActionButton({
  label,
  onPress,
  variant = 'primary',
  size = 'default',
  icon,
  style,
  textColor,
  disabled = false,
  loading = false,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'default' | 'compact';
  icon?: IconName;
  style?: StyleProp<ViewStyle>;
  textColor?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const primary = variant === 'primary';
  const compact = size === 'compact';
  const inactive = disabled || loading;
  const color = inactive ? '#9A958C' : textColor ?? (primary ? palette.white : palette.primary);
  return (
    <Pressable
      onPress={inactive ? undefined : onPress}
      hitSlop={compact ? { top: 4, bottom: 4 } : undefined}
      accessibilityRole="button"
      accessibilityState={{ disabled: inactive, busy: loading }}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.btn,
        compact && styles.btnCompact,
        primary && styles.btnPrimary,
        variant === 'secondary' && styles.btnSecondary,
        variant === 'ghost' && styles.btnGhost,
        inactive && (variant === 'ghost' ? styles.btnGhostDisabled : styles.btnDisabled),
        pressed && !inactive && styles.btnPressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={color} size="small" />
      ) : icon ? (
        <Ionicons name={icon} size={normalize(compact ? 16 : 18)} color={color} />
      ) : null}
      <AppText variant={compact ? 'bodySmall' : 'bodyBold'} color={color} style={compact ? styles.btnCompactText : undefined} numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** A compact action for the green hero header (same treatment as its back / ⋯ buttons). */
export function HeaderAction({ icon, label, onPress }: { icon: IconName; label: string; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.headerAction, pressed && styles.btnPressed]}
    >
      <Ionicons name={icon} size={normalize(16)} color={palette.white} />
      <AppText variant="bodySmall" color={palette.white} style={styles.btnCompactText}>
        {label}
      </AppText>
    </Pressable>
  );
}

// ─── Icons, pills, chips ─────────────────────────────────────────────────────

export function IconBubble({
  name,
  color = palette.kale,
  background = cc.tintStrong,
  size = 40,
}: {
  name: IconName;
  color?: string;
  background?: string;
  size?: number;
}) {
  const box = normalize(size);
  return (
    <View style={[styles.bubble, { width: box, height: box, borderRadius: box / 2, backgroundColor: background }]}>
      <Ionicons name={name} size={normalize(size * 0.48)} color={color} />
    </View>
  );
}

/** Status badge — uppercase, like the app's existing listing badges. */
export function Pill({
  label,
  color,
  background,
  icon,
  dot,
}: {
  label: string;
  color: string;
  background: string;
  icon?: IconName;
  dot?: boolean;
}) {
  return (
    <View style={[styles.pill, { backgroundColor: background }]}>
      {dot ? <View style={[styles.dot, { backgroundColor: color }]} /> : null}
      {icon ? <Ionicons name={icon} size={normalize(12)} color={color} /> : null}
      <AppText variant="caption" color={color} style={styles.pillText} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={4}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipOn,
        disabled && styles.disabled,
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
    >
      {icon ? <Ionicons name={icon} size={normalize(15)} color={selected ? palette.white : palette.primary} /> : null}
      <AppText variant="bodyBold" color={selected ? palette.white : palette.primary}>
        {label}
      </AppText>
    </Pressable>
  );
}

/** Pill-shaped segmented control (Today / Upcoming / Past …). */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string; count?: number }[];
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
            style={[styles.segment, on && styles.segmentOn]}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
          >
            <AppText variant="bodyBold" color={on ? palette.white : palette.midgray}>
              {option.label}
              {option.count ? ` · ${option.count}` : ''}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

// ─── Data display ────────────────────────────────────────────────────────────

export function InfoRow({
  icon,
  label,
  value,
  sub,
  valueColor = palette.black,
}: {
  icon: IconName;
  label: string;
  value: React.ReactNode;
  sub?: string | null;
  valueColor?: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={normalize(18)} color={palette.kale} style={styles.infoIcon} />
      <View style={styles.flex}>
        <AppText variant="meta" color={palette.stone}>
          {label}
        </AppText>
        {typeof value === 'string' || typeof value === 'number' ? (
          <AppText variant="bodyBold" color={valueColor} style={styles.infoValue}>
            {value}
          </AppText>
        ) : (
          value
        )}
        {sub ? (
          <AppText variant="meta" color={palette.midgray}>
            {sub}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

/**
 * Figures laid out flat, two per row, divided by hairlines — never as tinted
 * tiles inside a card.
 */
export function StatGrid({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  const rows: React.ReactNode[][] = [];
  // Three figures share one row; otherwise two per row.
  const perRow = items.length === 3 ? 3 : 2;
  for (let i = 0; i < items.length; i += perRow) rows.push(items.slice(i, i + perRow));
  return (
    <View style={styles.statGrid}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.statRow, r > 0 && styles.statRowBorder]}>
          {row.map((cell, c) => (
            <View key={c} style={[styles.statCell, c > 0 && styles.statCellBorder]}>
              {cell}
            </View>
          ))}
          {row.length < perRow && items.length > perRow ? <View style={[styles.statCell, styles.statCellBorder]} /> : null}
        </View>
      ))}
    </View>
  );
}

export function Stat({
  label,
  value,
  unit,
  icon,
  accent = palette.kale,
}: {
  label: string;
  value: string;
  unit?: string;
  icon?: IconName;
  accent?: string;
  /** @deprecated stats are flat; kept so existing call sites compile. */
  background?: string;
}) {
  const empty = value === '—';
  return (
    <View style={styles.stat}>
      <View style={styles.statLabelRow}>
        {icon ? <Ionicons name={icon} size={normalize(14)} color={accent} /> : null}
        <AppText variant="meta" color={palette.stone} numberOfLines={1} style={styles.flex}>
          {label}
        </AppText>
      </View>
      <View style={styles.statValueRow}>
        <AppText variant="subheading" color={empty ? palette.stone : palette.black} style={tabular}>
          {value}
        </AppText>
        {unit && !empty ? (
          <AppText variant="meta" color={palette.stone}>
            {unit}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

export function ProgressBar({ value, total, color = palette.kale }: { value: number; total: number; color?: string }) {
  const pct = total > 0 ? Math.max(0, Math.min(1, value / total)) : 0;
  return (
    <View
      style={styles.track}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total, now: value }}
    >
      <View style={[styles.fill, { width: `${pct * 100}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Divider({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.divider, style]} />;
}

/** Vertical progress through a sequence, e.g. Listed → Dropped off → Received. */
export function StepTrack({ steps, current }: { steps: (string | { label: string; detail?: string | null })[]; current: number }) {
  return (
    <View>
      {steps.map((raw, index) => {
        const step = typeof raw === 'string' ? { label: raw, detail: null } : raw;
        const done = index < current;
        const active = index === current;
        return (
          <View key={step.label} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={[styles.stepDot, done && styles.stepDotDone, active && styles.stepDotActive]}>
                {done ? <Ionicons name="checkmark" size={normalize(11)} color={palette.white} /> : null}
              </View>
              {index < steps.length - 1 ? <View style={[styles.stepLine, done && styles.stepLineDone]} /> : null}
            </View>
            <View style={styles.stepText}>
              <AppText variant={active ? 'bodyBold' : 'bodySmall'} color={done || active ? palette.black : palette.stone}>
                {step.label}
              </AppText>
              {step.detail ? (
                <AppText variant="meta" color={palette.stone}>
                  {step.detail}
                </AppText>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

// ─── States ──────────────────────────────────────────────────────────────────

export function EmptyState({
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
    <Surface style={styles.empty}>
      <IconBubble name={icon} size={52} />
      <AppText variant="subheading" style={styles.center}>
        {title}
      </AppText>
      {body ? (
        <AppText variant="bodySmall" color={palette.stone} style={[styles.center, styles.emptyBody]}>
          {body}
        </AppText>
      ) : null}
      {action ? <View style={styles.emptyAction}>{action}</View> : null}
    </Surface>
  );
}

/** Loading placeholder shaped like the content it stands in for. */
export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <Surface style={styles.skeleton}>
      <View style={[styles.skeletonBar, { width: '45%', height: normalize(16) }]} />
      {Array.from({ length: lines }).map((_, index) => (
        <View key={index} style={[styles.skeletonBar, { width: `${90 - index * 15}%` }]} />
      ))}
    </Surface>
  );
}

export function Notice({
  tone = 'warn',
  icon,
  title,
  body,
  children,
}: {
  tone?: 'warn' | 'danger' | 'tint' | 'muted';
  icon?: IconName;
  title: string;
  body?: string | null;
  children?: React.ReactNode;
}) {
  const color =
    tone === 'danger' ? palette.danger : tone === 'warn' ? cc.warnText : tone === 'tint' ? palette.kale : palette.midgray;
  return (
    <Surface tone={tone} style={styles.notice}>
      <View style={styles.noticeHead}>
        <Ionicons
          name={icon ?? (tone === 'danger' ? 'alert-circle' : tone === 'tint' ? 'information-circle' : 'warning')}
          size={normalize(18)}
          color={color}
          style={styles.noticeIcon}
        />
        <View style={styles.flex}>
          <AppText variant="bodyBold" color={tone === 'muted' ? palette.black : color}>
            {title}
          </AppText>
          {body ? (
            <AppText variant="bodySmall" color={palette.midgray} style={styles.noticeBody}>
              {body}
            </AppText>
          ) : null}
        </View>
      </View>
      {children}
    </Surface>
  );
}

/** A tappable list row with icon, text and chevron. */
export function NavRow({
  icon,
  title,
  subtitle,
  right,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle?: string | null;
  right?: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <Surface onPress={onPress} style={styles.navRow} accessibilityLabel={title}>
      <IconBubble name={icon} />
      <View style={styles.flex}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="meta" color={palette.stone} numberOfLines={2}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {right}
      <Ionicons name="chevron-forward" size={normalize(16)} color={palette.primary} />
    </Surface>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  pressed: { opacity: 0.88 },
  disabled: { opacity: 0.45 },
  surface: {
    borderRadius: cc.radius,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lift: {
    shadowColor: '#3B2A10',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 1,
  },
  padded: { padding: normalize(16) },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
    marginTop: normalize(14),
    marginBottom: normalize(-2),
  },
  sectionCaption: { marginTop: 3 },
  sectionAction: { paddingVertical: 4, paddingLeft: 12 },
  bubble: { alignItems: 'center', justifyContent: 'center' },
  btn: {
    minHeight: 46,
    borderRadius: cc.radiusSm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: normalize(18),
  },
  btnCompact: { minHeight: 38, borderRadius: 12, paddingHorizontal: normalize(14), gap: 6 },
  btnCompactText: { fontFamily: 'Saveful-SemiBold' },
  btnPrimary: { backgroundColor: palette.primary },
  btnSecondary: { backgroundColor: palette.white, borderWidth: 1, borderColor: palette.primary },
  btnGhost: { backgroundColor: 'transparent' },
  btnDisabled: { backgroundColor: '#E9E5DD', borderColor: '#E9E5DD' },
  btnGhostDisabled: { opacity: 0.6 },
  btnPressed: { opacity: 0.86 },
  headerAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: normalize(36),
    paddingHorizontal: normalize(14),
    borderRadius: normalize(18),
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: normalize(9),
    paddingVertical: normalize(4),
    borderRadius: 999,
  },
  pillText: { letterSpacing: 0.6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 40,
    borderWidth: 1,
    borderColor: palette.primary,
    borderRadius: 999,
    paddingHorizontal: normalize(14),
    backgroundColor: palette.white,
  },
  chipOn: { backgroundColor: palette.primary },
  segmented: {
    flexDirection: 'row',
    backgroundColor: cc.muted,
    borderRadius: 999,
    padding: 4,
    gap: 4,
  },
  segment: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 40,
    borderRadius: 999,
  },
  segmentOn: { backgroundColor: palette.primary },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  infoIcon: { marginTop: 2, width: normalize(20), textAlign: 'center' },
  infoValue: { marginTop: 1 },
  statGrid: {},
  statRow: { flexDirection: 'row' },
  statRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: cc.hairline },
  statCell: { flex: 1, paddingVertical: normalize(10) },
  statCellBorder: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: cc.hairline, paddingLeft: normalize(14) },
  stat: { gap: 4 },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  track: {
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E8E2D5',
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: 3 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: cc.hairline },
  step: { flexDirection: 'row', gap: 12 },
  stepRail: { alignItems: 'center', width: normalize(18) },
  stepDot: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    borderWidth: 2,
    borderColor: '#D3CCBE',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotDone: { backgroundColor: palette.kale, borderColor: palette.kale },
  stepDotActive: { borderColor: palette.kale, borderWidth: 5 },
  stepLine: { flex: 1, width: 2, minHeight: normalize(14), backgroundColor: '#E5DFD2', marginVertical: 2 },
  stepLineDone: { backgroundColor: palette.kale },
  stepText: { flex: 1, paddingBottom: normalize(14), gap: 2 },
  empty: { alignItems: 'center', gap: 10, paddingVertical: normalize(28), paddingHorizontal: normalize(20) },
  emptyBody: { maxWidth: 300 },
  emptyAction: { alignSelf: 'stretch', marginTop: 6 },
  skeleton: { gap: 10 },
  skeletonBar: { height: normalize(10), borderRadius: 6, backgroundColor: '#EFEAE0' },
  notice: { gap: 10 },
  noticeHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  noticeIcon: { marginTop: 1 },
  noticeBody: { marginTop: 3 },
  navRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: normalize(14) },
});
