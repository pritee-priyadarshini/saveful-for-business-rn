import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { View } from 'react-native';

import type { ScreenScrollHandle } from '@/components/Screen';
import { useGuideStore } from '@/store/guideStore';

import { GuideOverlay } from './GuideOverlay';
import { COMPASS_TARGET, type GuideStep, type GuideTour } from './types';

export type GuideTargetEntry = {
  ref: React.RefObject<View | null>;
  /** The scrolling Screen the target sits in, if any. */
  scroll: ScreenScrollHandle | null;
};

/** Looks up the element a step points at. */
export type GuideTargets = { get: (id: string) => GuideTargetEntry | undefined };

/** The step that introduces the compass itself. Added once, to the first walkthrough that opens by itself. */
const COMPASS_STEP: GuideStep = {
  target: COMPASS_TARGET,
  title: 'Your guide, any time',
  body: 'Tap the compass at the top of any collection screen to walk through it again, step by step.',
  tip: 'Rather explore on your own? Turn Guide me off in Profile.',
};

export type ActiveTour = {
  tour: GuideTour;
  steps: GuideStep[];
  /** Started on its own (first visit) rather than from the compass button. */
  auto: boolean;
};

type GuideContextValue = {
  register: (id: string, entry: GuideTargetEntry) => () => void;
  start: (tour: GuideTour, options?: { auto?: boolean }) => boolean;
  stop: (tourId?: string) => void;
};

const GuideContext = createContext<GuideContextValue | null>(null);

export function useGuideContext() {
  return useContext(GuideContext);
}

/**
 * Hosts the walkthrough overlay and the registry of things it can point at.
 * Mount once, above the navigator.
 */
export function GuideProvider({ children }: { children: React.ReactNode }) {
  // Several copies of one target can be mounted at once (the same header on stacked screens):
  // the most recent wins, which is the screen on top. Lists register only their first item.
  const targets = useRef(new Map<string, GuideTargetEntry[]>());
  const lookup = useRef<GuideTargets>({
    get: (id) => {
      const list = targets.current.get(id);
      return list?.[list.length - 1];
    },
  });
  const [active, setActive] = useState<ActiveTour | null>(null);
  const activeRef = useRef<ActiveTour | null>(null);
  activeRef.current = active;

  const register = useCallback((id: string, entry: GuideTargetEntry) => {
    targets.current.set(id, [...(targets.current.get(id) ?? []), entry]);
    return () => {
      const rest = (targets.current.get(id) ?? []).filter((row) => row !== entry);
      if (rest.length) targets.current.set(id, rest);
      else targets.current.delete(id);
    };
  }, []);

  const start = useCallback((tour: GuideTour, options?: { auto?: boolean }) => {
    if (activeRef.current) return false;
    const steps = tour.steps.filter((step) => !step.target || targets.current.has(step.target));
    // The first walkthrough that opens by itself ends by showing where to find help again.
    const guide = useGuideStore.getState();
    if (options?.auto && guide.enabled && !guide.compassHintSeen && targets.current.has(COMPASS_TARGET)) {
      steps.push(COMPASS_STEP);
    }
    if (!steps.length) return false;
    const next = { tour, steps, auto: Boolean(options?.auto) };
    activeRef.current = next;
    setActive(next);
    return true;
  }, []);

  const finish = useCallback(() => {
    const current = activeRef.current;
    if (current) useGuideStore.getState().markSeen(current.tour.id);
    activeRef.current = null;
    setActive(null);
  }, []);

  const stop = useCallback((tourId?: string) => {
    const current = activeRef.current;
    if (!current || (tourId && current.tour.id !== tourId)) return;
    activeRef.current = null;
    setActive(null);
  }, []);

  // Stable for the app's lifetime, so screens never re-run effects when a tour starts or ends.
  const value = useMemo(() => ({ register, start, stop }), [register, start, stop]);

  return (
    <GuideContext.Provider value={value}>
      {children}
      {active ? <GuideOverlay key={active.tour.id} active={active} targets={lookup.current} onFinish={finish} /> : null}
    </GuideContext.Provider>
  );
}
