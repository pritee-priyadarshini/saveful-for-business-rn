import * as SecureStore from 'expo-secure-store';

export type MilestoneKind = 'listing' | 'collection';

export type MilestoneCompleteContent = {
  title: string;
  subtitle: string;
  body: string;
  tip: string;
  primaryCta: string;
  secondaryCta: string;
};

export const MILESTONE_COMPLETE_CONTENT: Record<MilestoneKind, MilestoneCompleteContent> = {
  listing: {
    title: 'Your first listing is complete!',
    subtitle: "You've helped Good Food Go Further.",
    body: "That's your first successful listing - and the start of tracking the value and impact your surplus can create.",
    tip: 'Tip: Check your Insights to see your impact grow with every completed listing.',
    primaryCta: 'Create next listing',
    secondaryCta: 'Browse insights',
  },
  collection: {
    title: 'Your first collection is complete!',
    subtitle: "You've helped Good Food Go Further.",
    body: "That's your first successful collection - and the start of seeing the impact you're creating through Saveful.",
    tip: 'Tip: Check your Insights to see your impact grow with every collection.',
    primaryCta: 'Claim another listing',
    secondaryCta: 'Browse insights',
  },
};

export function firstMilestoneStorageKey(kind: MilestoneKind, identity: string | number) {
  return `first${kind}CompleteSeen:${String(identity).trim().toLowerCase()}`;
}

/** Returns true once, then marks the milestone as seen. */
export async function consumeFirstMilestone(
  kind: MilestoneKind,
  identity?: string | number | null,
): Promise<boolean> {
  if (identity == null || !String(identity).trim()) return false;
  const key = firstMilestoneStorageKey(kind, identity);
  try {
    const seen = await SecureStore.getItemAsync(key);
    if (seen) return false;
    await SecureStore.setItemAsync(key, 'true');
    return true;
  } catch {
    return false;
  }
}
