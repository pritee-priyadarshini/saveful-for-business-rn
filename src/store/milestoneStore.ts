import { create } from 'zustand';

import {
  consumeFirstMilestone,
  resolveMilestoneIdentity,
  type MilestoneKind,
} from '@/data/milestoneComplete';
import { useAuthStore } from '@/store/authStore';

type MilestoneState = {
  visibleKind: MilestoneKind | null;
  offer: (kind: MilestoneKind) => Promise<boolean>;
  dismiss: () => void;
};

export const useMilestoneStore = create<MilestoneState>((set, get) => ({
  visibleKind: null,

  offer: async (kind) => {
    if (get().visibleKind) return false;
    const identity = resolveMilestoneIdentity(useAuthStore.getState().authUser);
    const isFirst = await consumeFirstMilestone(kind, identity);
    if (!isFirst) return false;
    set({ visibleKind: kind });
    return true;
  },

  dismiss: () => set({ visibleKind: null }),
}));
