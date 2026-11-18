import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { View } from 'react-native';

import type { ScreenScrollHandle } from '@/components/Screen';
import { useGuideStore } from '@/store/guideStore';

import { GuideOverlay } from './GuideOverlay';
import type { GuideStep, GuideTour } from './types';

export type GuideTargetEntry = {
  ref: React.RefObject<View | null>;
  /** The scrolling Screen the target sits in, if any. */
  scroll: ScreenScrollHandle | null;
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
  const targets = useRef(new Map<string, GuideTargetEntry>());
  const [active, setActive] = useState<ActiveTour | null>(null);
  const activeRef = useRef<ActiveTour | null>(null);
  activeRef.current = active;

  const register = useCallback((id: string, entry: GuideTargetEntry) => {
    // First one wins (e.g. only the first card in a list is highlighted).
    if (!targets.current.has(id)) targets.current.set(id, entry);
    return () => {
      if (targets.current.get(id) === entry) targets.current.delete(id);
    };
  }, []);

  const start = useCallback((tour: GuideTour, options?: { auto?: boolean }) => {
    if (activeRef.current) return false;
    const steps = tour.steps.filter((step) => !step.target || targets.current.has(step.target));
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
      {active ? <GuideOverlay key={active.tour.id} active={active} targets={targets.current} onFinish={finish} /> : null}
    </GuideContext.Provider>
  );
}
