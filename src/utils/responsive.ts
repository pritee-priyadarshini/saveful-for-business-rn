import { useMemo } from 'react';
import { Dimensions, useWindowDimensions } from 'react-native';

import { FONT_SCALE } from '@/theme/fontScale';

const BASE_WIDTH = 375;
/** Keep type/control scale phone-like — never grow with iPad width. */
const NORMALIZE_CAP_WIDTH = 430;
/** Keep hp() from blowing up vertical padding on tall tablets. */
const HP_CAP_HEIGHT = 812;

const { width: initialWidth, height: initialHeight } = Dimensions.get('window');

const scaleWidth = Math.min(initialWidth, NORMALIZE_CAP_WIDTH);
const scaleHeight = Math.min(initialHeight, HP_CAP_HEIGHT);

/** Legacy % helpers — prefer useResponsiveLayout on new / refactored screens. */
export const wp = (p: number) => (Math.min(initialWidth, NORMALIZE_CAP_WIDTH) * p) / 100;
export const hp = (p: number) => (scaleHeight * p) / 100;

/**
 * Font/control size helper. Capped so tablets don’t blow up StyleSheet sizes.
 * Live tablet tweaks belong in useResponsiveLayout().font() / adaptive styles.
 */
export const normalize = (size: number) =>
  Math.round(size * (scaleWidth / BASE_WIDTH) * FONT_SCALE);

export type ResponsiveLayout = {
  width: number;
  height: number;
  isTablet: boolean;
  isLargeTablet: boolean;
  isLandscape: boolean;
  /** Centered column max width for dashboard / form content. */
  contentMaxWidth: number;
  /** Narrower centered column for auth / forms. */
  formMaxWidth: number;
  /** Horizontal page padding (phones keep existing screen paddings). */
  pagePadH: number;
  /** Cap font size growth on large screens. */
  font: (phoneSize: number, tabletSize?: number, largeTabletSize?: number) => number;
  /** Modest vertical spacing (not raw % of tall tablets). */
  space: (phone: number, tablet?: number, large?: number) => number;
};

/**
 * Live responsive metrics.
 * Breakpoints: tablet >= 600 (covers iPad mini), large tablet >= 1024.
 *
 * Tablet content is a centred 92% column so cards stay comfortable while
 * still using most of the screen. Phone stays full width.
 */
export function useResponsiveLayout(): ResponsiveLayout {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const isTablet = width >= 600;
    const isLargeTablet = width >= 1024;
    const isLandscape = width > height;

    // Centre at 0.92× screen — 4% gutters each side.
    const contentMaxWidth = isTablet ? Math.round(width * 0.92) : width;

    const formMaxWidth = contentMaxWidth;

    // Inner pad (~wp(4)); outer gutters come from centering the 0.92 column.
    const charitySidePad = Math.round((NORMALIZE_CAP_WIDTH * 4) / 100);
    const pagePadH = isLargeTablet
      ? charitySidePad + 2
      : isTablet
        ? charitySidePad
        : Math.round(width * 0.05);

    const font = (phoneSize: number, tabletSize?: number, largeTabletSize?: number) => {
      if (isLargeTablet && largeTabletSize != null) return largeTabletSize;
      if (isTablet && tabletSize != null) return tabletSize;
      return Math.round(phoneSize * FONT_SCALE);
    };

    const space = (phone: number, tablet?: number, large?: number) => {
      if (isLargeTablet && large != null) return large;
      if (isTablet && tablet != null) return tablet;
      return phone;
    };

    return {
      width,
      height,
      isTablet,
      isLargeTablet,
      isLandscape,
      contentMaxWidth,
      formMaxWidth,
      pagePadH,
      font,
      space,
    };
  }, [width, height]);
}
