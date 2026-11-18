import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { fileKeyValueStorage } from '@/utils/fileKeyValueStorage';

/**
 * "Guide me" — in-app walkthroughs for Consolidated Collections.
 *
 * `enabled` decides whether a screen's walkthrough starts on its own the first
 * time someone opens it. The compass button in each header always replays it.
 * `seen` lists the walkthroughs already finished or skipped, so each starts on
 * its own only once.
 */
type GuideState = {
  enabled: boolean;
  seen: string[];
  /** Has seen the step that points out the compass (replay any walkthrough). */
  compassHintSeen: boolean;
  /** False until the saved copy has been read; nothing starts on its own before. */
  hydrated: boolean;
  setEnabled: (enabled: boolean) => void;
  markSeen: (tourId: string) => void;
  markCompassHint: () => void;
};

export const useGuideStore = create<GuideState>()(
  persist(
    (set, get) => ({
      enabled: true,
      seen: [],
      compassHintSeen: false,
      hydrated: false,
      setEnabled: (enabled) => {
        // Turning it back on means "walk me through it again": start fresh.
        set(enabled ? { enabled, seen: [], compassHintSeen: false } : { enabled });
      },
      markSeen: (tourId) => {
        if (get().seen.includes(tourId)) return;
        set({ seen: [...get().seen, tourId] });
      },
      markCompassHint: () => {
        if (!get().compassHintSeen) set({ compassHintSeen: true });
      },
    }),
    {
      name: 'saveful.guide.v1',
      version: 1,
      storage: createJSONStorage(() => fileKeyValueStorage),
      partialize: (state) => ({ enabled: state.enabled, seen: state.seen, compassHintSeen: state.compassHintSeen }),
      onRehydrateStorage: () => () => {
        useGuideStore.setState({ hydrated: true });
      },
    },
  ),
);
