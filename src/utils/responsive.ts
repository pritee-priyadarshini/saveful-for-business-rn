import { Dimensions } from 'react-native';

import { FONT_SCALE } from '@/theme/fontScale';

const { width, height } = Dimensions.get('window');

export const wp = (p: number) => (width * p) / 100;
export const hp = (p: number) => (height * p) / 100;

/** Responsive font/spacing size scaled to screen width and global FONT_SCALE. */
export const normalize = (size: number) =>
  Math.round(size * (width / 375) * FONT_SCALE);
