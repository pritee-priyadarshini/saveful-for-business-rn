import { useCallback, useRef, useState } from 'react';
import type { View } from 'react-native';

/**
 * Line up something drawn in a Modal with an element measured on the screen.
 *
 * `measureInWindow` on the screen and the Modal's own drawing area do not
 * share an origin on every device: Android subtracts the status bar, edge-to-
 * edge apps and translucent modals start at the very top, notches and button
 * navigation shift things again. Measuring the overlay's own full-screen root
 * the same way and subtracting it cancels all of that, so the popup lands on
 * its anchor on every phone and tablet.
 *
 * Usage: put `ref` and `onLayout` on the overlay's full-screen root View, then
 * position children with `toLocal(anchor)`.
 */
export function useOverlayOrigin() {
  const ref = useRef<View>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);

  const onLayout = useCallback(() => {
    ref.current?.measureInWindow((x, y) => setOrigin({ x, y }));
  }, []);

  const toLocal = useCallback(
    <T extends { top: number; left: number }>(anchor: T): T => {
      if (!origin) return anchor;
      return { ...anchor, top: anchor.top - origin.y, left: anchor.left - origin.x };
    },
    [origin],
  );

  return { ref, onLayout, toLocal, ready: origin != null };
}
