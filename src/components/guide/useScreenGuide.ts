import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { useGuideStore } from '@/store/guideStore';

import { useGuideContext } from './GuideProvider';
import type { GuideTour } from './types';

/**
 * A screen's walkthrough. Starts on its own the first time the screen is
 * opened while Guide me is on, once `ready` (data loaded, targets drawn).
 * `start()` replays it at any time — wire it to the header's compass button.
 */
export function useScreenGuide(tour: GuideTour | null, { ready = true }: { ready?: boolean } = {}) {
  const guide = useGuideContext();
  const enabled = useGuideStore((state) => state.enabled);
  const hydrated = useGuideStore((state) => state.hydrated);
  const seen = useGuideStore((state) => (tour ? state.seen.includes(tour.id) : true));
  const compassHintSeen = useGuideStore((state) => state.compassHintSeen);
  const tourRef = useRef(tour);
  tourRef.current = tour;

  const start = useCallback(() => {
    if (tourRef.current) guide?.start(tourRef.current);
  }, [guide]);

  const tourId = tour?.id ?? null;
  const canAuto = Boolean(guide && tourId && ready && enabled && hydrated);
  // A new screen: its walkthrough. A screen already walked through, by someone who has not yet
  // been shown the compass (e.g. they finished every tour before it existed): just that one step.
  const autoMode: 'tour' | 'compass' | null = !canAuto ? null : !seen ? 'tour' : !compassHintSeen ? 'compass' : null;

  useFocusEffect(
    useCallback(() => {
      if (!autoMode) return undefined;
      // Let the screen settle (navigation transition, first layout) before measuring.
      const timer = setTimeout(() => {
        if (autoMode === 'tour' && tourRef.current) guide?.start(tourRef.current, { auto: true });
        if (autoMode === 'compass') guide?.start({ id: 'cc.compass', title: 'Guide me', steps: [] }, { auto: true });
      }, 650);
      return () => clearTimeout(timer);
    }, [guide, autoMode]),
  );

  // Leaving the screen (blur or unmount) ends its walkthrough, e.g. when a notification opens another screen.
  useFocusEffect(
    useCallback(() => {
      if (!tourId) return undefined;
      return () => guide?.stop(tourId);
    }, [guide, tourId]),
  );

  return { start, available: Boolean(guide && tour) };
}
