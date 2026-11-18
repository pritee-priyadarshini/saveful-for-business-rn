import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { WHATS_NEW_RELEASE } from '@/data/whatsNew';
import { fileKeyValueStorage } from '@/utils/fileKeyValueStorage';

/**
 * "What's new" announcement. Opens by itself once per release (on Home), and
 * again whenever someone taps What's new in Profile.
 */
type WhatsNewState = {
  /** Releases already announced on this device. */
  seen: string[];
  /** False until the saved copy has been read; nothing opens by itself before. */
  hydrated: boolean;
  visible: boolean;
  /** Opened by the person (Profile), not automatically. */
  manual: boolean;
  /** Open by itself if this release hasn't been announced yet. */
  showIfNew: () => void;
  open: () => void;
  close: () => void;
};

export const useWhatsNewStore = create<WhatsNewState>()(
  persist(
    (set, get) => ({
      seen: [],
      hydrated: false,
      visible: false,
      manual: false,
      showIfNew: () => {
        const { hydrated, seen, visible } = get();
        if (!hydrated || visible || seen.includes(WHATS_NEW_RELEASE)) return;
        set({ visible: true, manual: false });
      },
      open: () => set({ visible: true, manual: true }),
      close: () => {
        const { seen } = get();
        set({
          visible: false,
          seen: seen.includes(WHATS_NEW_RELEASE) ? seen : [...seen, WHATS_NEW_RELEASE],
        });
      },
    }),
    {
      name: 'saveful.whatsNew.v1',
      version: 1,
      storage: createJSONStorage(() => fileKeyValueStorage),
      partialize: (state) => ({ seen: state.seen }),
      onRehydrateStorage: () => () => {
        useWhatsNewStore.setState({ hydrated: true });
      },
    },
  ),
);
