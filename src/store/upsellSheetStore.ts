import { create } from 'zustand';

import type { ProductModule } from '@/services/subscriptions.service';

type UpsellSheetState = {
  /** The module whose sheet is open, or null. */
  module: ProductModule | null;
  show: (module: ProductModule) => void;
  hide: () => void;
};

/**
 * Drives the module upsell bottom sheet. It is an overlay, not a route: opening
 * and closing it never changes navigation focus, so the screen underneath
 * doesn't reload its data when the sheet closes.
 */
export const useUpsellSheetStore = create<UpsellSheetState>((set, get) => ({
  module: null,
  show: (module) => {
    if (get().module) return; // one sheet at a time
    set({ module });
  },
  hide: () => set({ module: null }),
}));
