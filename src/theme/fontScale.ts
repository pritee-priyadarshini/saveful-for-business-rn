export const FONT_SCALE = 0.88;

export function scaleFont(size: number) {
  return Math.round(size * FONT_SCALE);
}

export function scaleLineHeight(fontSize: number, lineHeight?: number) {
  if (lineHeight != null) {
    return Math.round(lineHeight * FONT_SCALE);
  }
  return Math.round(fontSize * FONT_SCALE * 1.32);
}
