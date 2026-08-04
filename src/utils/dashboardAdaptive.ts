import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';

import { hp, type ResponsiveLayout, wp } from '@/utils/responsive';

export type DashboardShellAdaptive = {
  heroBleed: ViewStyle;
  heroContent: ViewStyle;
  mainContent: ViewStyle;
  heroTitle: TextStyle;
  heroSubtitle: TextStyle;
  heroEyebrow: TextStyle;
  heroStatsText: TextStyle;
  heroLocationText: TextStyle;
  heroIconCircle: ViewStyle;
  heroIconImage: ImageStyle;
  heroStatsPill: ViewStyle;
  createBtn: ViewStyle;
  createBtnText: TextStyle;
  createBtnIconWrap: ViewStyle;
  historyBtn: ViewStyle;
  historyBtnText: TextStyle;
  filterScroll: ViewStyle;
  section: ViewStyle;
  audienceChip: ViewStyle;
  audienceChipText: TextStyle;
  audienceChipIcon: ImageStyle;
  statusChip: ViewStyle;
  statusChipText: TextStyle;
  emptyText: TextStyle;
  emptyReset: TextStyle;
  emptyIconSize: number;
  filterChip: ViewStyle;
  filterChipText: TextStyle;
  filterChipIcon: ImageStyle;
  sectionTitle: TextStyle;
  cardHeadlinePrimary: TextStyle;
  cardHeadlineSecondary: TextStyle;
  metricValue: TextStyle;
  metricLabel: TextStyle;
  metricCard: ViewStyle;
  peopleValue: TextStyle;
  animalsValue: TextStyle;
  impactSubLabel: TextStyle;
  impactValue: TextStyle;
  listingCard: ViewStyle;
  cardHeader: ViewStyle;
  cardBody: ViewStyle;
  statusBadgeText: TextStyle;
  categoryLabel: TextStyle;
  metaBox: ViewStyle;
  metaLabelText: TextStyle;
  metaValueText: TextStyle;
  viewDetailsBtn: ViewStyle;
  viewDetailsBtnText: TextStyle;
  updateCard: ViewStyle;
  updateCardBody: ViewStyle;
  updateInfoRow: ViewStyle;
  updateInfoMain: ViewStyle;
  updateInfoSide: ViewStyle;
  updateMetaStack: ViewStyle;
  updateFooterRow: ViewStyle;
  updateFooterMain: ViewStyle;
  updateFooterAction: ViewStyle;
  actionBtn: ViewStyle;
  actionBtnText: TextStyle;
  primaryActionBtn: ViewStyle;
  primaryActionBtnText: TextStyle;
  detailBox: ViewStyle;
  detailLabel: TextStyle;
  detailValue: TextStyle;
  tagText: TextStyle;
  dateFilterField: ViewStyle;
  dateFilterTitle: TextStyle;
  dateFilterValue: TextStyle;
  scrollContent: ViewStyle;
  actionsRow: ViewStyle;
  cardGrid: ViewStyle;
  cardGridItem: ViewStyle;
  metricsWrap: ViewStyle;
  metricGridItem: ViewStyle;
  columnWidth: number;
  heroHeight: number;
};

function emptyShell(heroHeight: number): DashboardShellAdaptive {
  return {
    heroBleed: {},
    heroContent: {},
    mainContent: {},
    heroTitle: {},
    heroSubtitle: {},
    heroEyebrow: {},
    heroStatsText: {},
    heroLocationText: {},
    heroIconCircle: {},
    heroIconImage: {},
    heroStatsPill: {},
    createBtn: {},
    createBtnText: {},
    createBtnIconWrap: {},
    historyBtn: {},
    historyBtnText: {},
    filterScroll: {},
    section: {},
    audienceChip: {},
    audienceChipText: {},
    audienceChipIcon: {},
    statusChip: {},
    statusChipText: {},
    emptyText: {},
    emptyReset: {},
    emptyIconSize: 36,
    filterChip: {},
    filterChipText: {},
    filterChipIcon: {},
    sectionTitle: {},
    cardHeadlinePrimary: {},
    cardHeadlineSecondary: {},
    metricValue: {},
    metricLabel: {},
    metricCard: {},
    peopleValue: {},
    animalsValue: {},
    impactSubLabel: {},
    impactValue: {},
    listingCard: {},
    cardHeader: {},
    cardBody: {},
    statusBadgeText: {},
    categoryLabel: {},
    metaBox: {},
    metaLabelText: {},
    metaValueText: {},
    viewDetailsBtn: {},
    viewDetailsBtnText: {},
    updateCard: {},
    updateCardBody: {},
    updateInfoRow: {},
    updateInfoMain: {},
    updateInfoSide: {},
    updateMetaStack: {},
    updateFooterRow: {},
    updateFooterMain: {},
    updateFooterAction: {},
    actionBtn: {},
    actionBtnText: {},
    primaryActionBtn: {},
    primaryActionBtnText: {},
    detailBox: {},
    detailLabel: {},
    detailValue: {},
    tagText: {},
    dateFilterField: {},
    dateFilterTitle: {},
    dateFilterValue: {},
    scrollContent: {},
    actionsRow: {},
    cardGrid: {},
    cardGridItem: {},
    metricsWrap: {},
    metricGridItem: {},
    columnWidth: 0,
    heroHeight,
  };
}

/** Centred 0.9× column — side gutters from (screen − column) / 2. */
export function dashboardColumnWidth(r: ResponsiveLayout): number {
  return Math.min(r.contentMaxWidth, Math.max(320, r.width));
}

/**
 * Same shell as RestaurantHomeScreen.
 * Phone → empty overrides (StyleSheet unchanged).
 * Tablet → Home-width column + multi-col grids.
 */
export function buildDashboardShellStyles(
  r: ResponsiveLayout,
  options?: { heroPhoneHp?: number; stackHero?: boolean },
): DashboardShellAdaptive {
  const phoneHero = options?.heroPhoneHp ?? 22;
  // Stack screens only need room for back + title — hp(24) left a huge empty band on phones.
  const empty = emptyShell(options?.stackHero ? hp(13) : hp(phoneHero));

  if (!r.isTablet) return empty;

  const { isLargeTablet, contentMaxWidth, pagePadH, font, space } = r;
  const columnWidth = dashboardColumnWidth(r);
  const gap = isLargeTablet ? 14 : 12;
  const innerWidth = Math.max(280, columnWidth - pagePadH * 2);
  const twoCol = Math.floor((innerWidth - gap) / 2);
  const threeCol = Math.floor((innerWidth - gap * 2) / 3);
  const iconSize = isLargeTablet ? 56 : 52;

  // Explicit pixel width — `width: '100%'` + FlatList `alignItems: 'center'`
  // shrink-wraps children and breaks card layouts on tablet.
  const column: ViewStyle = {
    width: columnWidth,
    maxWidth: contentMaxWidth,
    alignSelf: 'center',
    paddingHorizontal: pagePadH,
  };

  return {
    ...empty,
    columnWidth,
    scrollContent: {
      alignItems: 'center',
    },
    heroBleed: {
      width: r.width,
      alignSelf: 'stretch',
    },
    heroHeight: Math.min(r.height * 0.16, options?.stackHero ? 168 : 156),
    heroContent: {
      ...column,
      paddingBottom: space(20, 24, 28),
      gap: space(8, 10, 12),
    },
    mainContent: {
      ...column,
      paddingTop: space(10, 12, 12),
      gap: space(10, 12, 12),
      marginTop: space(-12, -10, -8),
    },
    heroTitle: {
      fontSize: font(24, 26, 28),
      lineHeight: font(30, 34, 36),
    },
    heroSubtitle: {
      fontSize: font(13, 14, 15),
      lineHeight: font(18, 20, 22),
    },
    heroEyebrow: {
      fontSize: font(11, 12, 12),
      letterSpacing: 0.3,
    },
    heroStatsText: {
      fontSize: font(11, 11, 12),
      lineHeight: font(14, 15, 16),
    },
    heroLocationText: {
      fontSize: font(11, 12, 12),
      lineHeight: font(15, 16, 17),
    },
    heroIconCircle: {
      width: iconSize,
      height: iconSize,
      borderRadius: iconSize / 2,
    },
    heroIconImage: {
      width: iconSize * 0.52,
      height: iconSize * 0.52,
    },
    heroStatsPill: {
      paddingVertical: 5,
      paddingHorizontal: 11,
    },
    actionsRow: {
      flexDirection: 'row',
      alignItems: 'stretch',
      gap,
      width: '100%',
      marginTop: space(10, 12, 12),
    },
    createBtn: {
      height: 48,
      minHeight: 48,
      maxHeight: 48,
      marginTop: 0,
      paddingVertical: 0,
      paddingHorizontal: 16,
      borderRadius: 14,
      width: '100%',
      alignSelf: 'stretch',
      gap: 8,
    },
    createBtnText: {
      fontSize: font(14, 15, 15),
      lineHeight: 18,
    },
    createBtnIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    historyBtn: {
      height: 48,
      minHeight: 48,
      maxHeight: 48,
      marginTop: 0,
      paddingVertical: 0,
      paddingHorizontal: 16,
      borderRadius: 14,
      width: '100%',
      alignSelf: 'stretch',
    },
    historyBtnText: {
      fontSize: font(14, 15, 15),
      lineHeight: 18,
    },
    filterScroll: {
      ...column,
      marginTop: space(10, 12, 14),
      // Keep filter row from stretching vertically inside FlatList headers.
      flexGrow: 0,
      alignSelf: 'center',
    },
    section: {
      ...column,
      gap: space(8, 10, 10),
      marginTop: space(8, 10, 10),
    },
    cardGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'stretch',
      gap,
      width: '100%',
    },
    cardGridItem: {
      width: twoCol,
      maxWidth: twoCol,
    },
    metricsWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap,
      width: '100%',
    },
    metricGridItem: {
      width: threeCol,
      maxWidth: threeCol,
    },
    audienceChip: {
      minHeight: 36,
      paddingVertical: 7,
      paddingHorizontal: 10,
      borderRadius: 10,
    },
    audienceChipText: {
      fontSize: font(12, 12, 13),
      lineHeight: 16,
    },
    audienceChipIcon: {
      width: 15,
      height: 15,
    },
    statusChip: {
      minHeight: 32,
      paddingVertical: 6,
      paddingHorizontal: 14,
      borderRadius: 16,
    },
    statusChipText: {
      fontSize: font(12, 12, 13),
      lineHeight: 16,
    },
    emptyText: {
      fontSize: font(13, 13, 14),
      lineHeight: 18,
    },
    emptyReset: {
      fontSize: font(13, 13, 14),
      lineHeight: 18,
    },
    emptyIconSize: 32,
    filterChip: {
      minHeight: 34,
      paddingVertical: 7,
      paddingHorizontal: 12,
      borderRadius: 16,
    },
    filterChipText: {
      fontSize: font(12, 12, 13),
      lineHeight: 16,
    },
    filterChipIcon: {
      width: 14,
      height: 14,
    },
    sectionTitle: {
      fontSize: font(15, 16, 16),
      lineHeight: font(20, 22, 22),
      letterSpacing: 0.2,
    },
    cardHeadlinePrimary: {
      fontSize: font(15, 15, 16),
      lineHeight: font(20, 20, 22),
    },
    cardHeadlineSecondary: {
      fontSize: font(12, 12, 13),
      lineHeight: font(16, 16, 18),
    },
    metricValue: {
      fontSize: font(13, 14, 14),
      lineHeight: 18,
    },
    metricLabel: {
      fontSize: font(10, 11, 11),
      lineHeight: 14,
    },
    metricCard: {
      minHeight: 56,
      paddingVertical: 10,
      paddingHorizontal: 8,
      borderRadius: 12,
      width: '100%',
    },
    peopleValue: {
      fontSize: font(14, 15, 15),
      lineHeight: 18,
    },
    animalsValue: {
      fontSize: font(14, 15, 15),
      lineHeight: 18,
    },
    impactSubLabel: {
      fontSize: font(10, 11, 11),
      lineHeight: 14,
    },
    impactValue: {
      fontSize: font(16, 17, 18),
      lineHeight: 20,
    },
    listingCard: {
      borderRadius: 14,
      width: '100%',
      flex: 1,
    },
    cardHeader: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      minHeight: 32,
    },
    cardBody: {
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 10,
      gap: 6,
    },
    statusBadgeText: {
      fontSize: font(11, 11, 12),
      lineHeight: 14,
    },
    categoryLabel: {
      fontSize: font(11, 11, 12),
      lineHeight: 14,
    },
    metaBox: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      minHeight: 48,
      borderRadius: 10,
      gap: 6,
    },
    metaLabelText: {
      fontSize: font(10, 11, 11),
      lineHeight: 13,
    },
    metaValueText: {
      fontSize: font(11, 12, 12),
      lineHeight: 15,
    },
    viewDetailsBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      minHeight: 24,
      borderRadius: 12,
    },
    viewDetailsBtnText: {
      fontSize: font(11, 11, 12),
      lineHeight: 14,
    },
    updateCard: {
      borderRadius: 12,
      width: '100%',
      alignSelf: 'stretch',
    },
    // Compact vertical stack — keep mobile structure, just tighter spacing.
    updateCardBody: {
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 6,
    },
    updateInfoRow: {},
    updateInfoMain: {},
    updateInfoSide: {},
    updateMetaStack: {
      gap: 4,
    },
    updateFooterRow: {},
    updateFooterMain: {},
    updateFooterAction: {},
    actionBtn: {
      height: 34,
      minHeight: 34,
      paddingVertical: 0,
      paddingHorizontal: 10,
      borderRadius: 8,
    },
    actionBtnText: {
      fontSize: font(11, 11, 12),
      lineHeight: 14,
    },
    primaryActionBtn: {
      height: 42,
      minHeight: 42,
      maxHeight: 42,
      paddingVertical: 0,
      paddingHorizontal: 14,
      borderRadius: 10,
    },
    primaryActionBtnText: {
      fontSize: font(13, 14, 14),
      lineHeight: 17,
    },
    detailBox: {
      paddingVertical: 8,
      paddingHorizontal: 8,
      borderRadius: 8,
      minHeight: 48,
    },
    detailLabel: {
      fontSize: font(9, 9, 10),
      lineHeight: 12,
    },
    detailValue: {
      fontSize: font(11, 12, 12),
      lineHeight: 15,
    },
    tagText: {
      fontSize: font(9, 9, 10),
      lineHeight: 12,
    },
    dateFilterField: {
      minHeight: 52,
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: 12,
    },
    dateFilterTitle: {
      fontSize: font(13, 14, 14),
      lineHeight: 17,
    },
    dateFilterValue: {
      fontSize: font(12, 13, 13),
      lineHeight: 16,
    },
  };
}

/** Chart width that stays inside the dashboard column. */
export function dashboardChartWidth(r: ResponsiveLayout, screenWidth: number): number {
  if (!r.isTablet) return screenWidth - wp(10) - wp(8);
  return Math.max(240, dashboardColumnWidth(r) - r.pagePadH * 2 - 28);
}

export type FormShellAdaptive = {
  pageWrap: ViewStyle;
  screenContent: ViewStyle;
  topIcon: ImageStyle;
  peopleIcon: ImageStyle;
  qtyBtn: ViewStyle;
  stepDot: ViewStyle;
  stepLine: ViewStyle;
  photoPlaceholder: ViewStyle;
  previewItem: ViewStyle;
  primaryBtn: ViewStyle;
  secondaryBtn: ViewStyle;
  bottomButton: ViewStyle;
  choiceChip: ViewStyle;
  storageChip: ViewStyle;
  contaminantChip: ViewStyle;
  columnWidth: number;
};

function emptyFormShell(): FormShellAdaptive {
  return {
    pageWrap: {},
    screenContent: {},
    topIcon: {},
    peopleIcon: {},
    qtyBtn: {},
    stepDot: {},
    stepLine: {},
    photoPlaceholder: {},
    previewItem: {},
    primaryBtn: {},
    secondaryBtn: {},
    bottomButton: {},
    choiceChip: {},
    storageChip: {},
    contaminantChip: {},
    columnWidth: 0,
  };
}

/** Centred 0.9× form column — same width token as dashboard. */
export function formColumnWidth(r: ResponsiveLayout): number {
  return Math.min(r.formMaxWidth, Math.max(320, r.width));
}

/**
 * Tablet overrides for CreateListing / CreateFarmListing.
 * Phone → empty (StyleSheet unchanged).
 */
export function buildFormShellStyles(r: ResponsiveLayout): FormShellAdaptive {
  if (!r.isTablet) return emptyFormShell();

  const { space, pagePadH, formMaxWidth } = r;
  const columnWidth = formColumnWidth(r);

  return {
    ...emptyFormShell(),
    columnWidth,
    pageWrap: {
      width: columnWidth,
      maxWidth: formMaxWidth,
      alignSelf: 'center',
      paddingHorizontal: pagePadH,
      paddingTop: space(10, 12, 14),
    },
    screenContent: {
      alignItems: 'center',
      paddingBottom: space(20, 24, 28),
    },
    peopleIcon: {
      width: 96,
      height: 72,
    },
    topIcon: {
      width: 112,
      height: 84,
    },
    qtyBtn: {
      width: 42,
      height: 42,
      minWidth: 42,
      borderRadius: 10,
    },
    stepDot: {
      width: 28,
      height: 28,
      borderRadius: 14,
    },
    stepLine: {
      width: 56,
      maxWidth: 72,
      flexGrow: 1,
      flexShrink: 1,
    },
    photoPlaceholder: {
      width: 88,
      height: 88,
      borderRadius: 12,
    },
    previewItem: {
      width: 88,
      height: 88,
      borderRadius: 12,
    },
    primaryBtn: {
      minHeight: 44,
      height: 44,
      paddingVertical: 0,
      borderRadius: 12,
    },
    secondaryBtn: {
      minHeight: 44,
      height: 44,
      paddingVertical: 0,
      borderRadius: 12,
    },
    bottomButton: {
      minHeight: 48,
      height: 48,
      paddingVertical: 0,
      borderRadius: 12,
    },
    choiceChip: {
      minHeight: 40,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 10,
    },
    storageChip: {
      minHeight: 64,
      paddingVertical: 8,
      borderRadius: 10,
    },
    contaminantChip: {
      minHeight: 56,
      paddingVertical: 8,
      borderRadius: 10,
    },
  };
}
