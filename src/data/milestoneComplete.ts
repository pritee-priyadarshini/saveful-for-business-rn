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
  // Listing v2 moves this milestone from listing creation to confirmed collection.
  // Keep a new key so users who saw the old, premature popup still receive the
  // correctly timed completion popup once.
  const version = kind === 'listing' ? 'v2:' : '';
  return `first${kind}CompleteSeen:${version}${String(identity).trim().toLowerCase()}`;
}

export function resolveMilestoneIdentity(authUser: {
  id?: number | string | null;
  email?: string | null;
  profile?: {
    user?: { id?: number | string | null; email?: string | null } | null;
    organisation?: { id?: number | string | null } | null;
  } | null;
} | null | undefined): string | null {
  const id = authUser?.id ?? authUser?.profile?.user?.id;
  if (id != null && String(id).trim()) return String(id).trim();

  const email = authUser?.email ?? authUser?.profile?.user?.email;
  if (email && String(email).trim()) return String(email).trim().toLowerCase();

  const orgId = authUser?.profile?.organisation?.id;
  if (orgId != null && String(orgId).trim()) return `org:${String(orgId).trim()}`;

  return null;
}

const reservedKeys = new Set<string>();

/** Returns true once, then marks the milestone as seen. */
export async function consumeFirstMilestone(
  kind: MilestoneKind,
  identity?: string | number | null,
): Promise<boolean> {
  if (identity == null || !String(identity).trim()) return false;
  const key = firstMilestoneStorageKey(kind, identity);
  if (reservedKeys.has(key)) return false;
  reservedKeys.add(key);
  try {
    const seen = await SecureStore.getItemAsync(key);
    if (seen) return false;
    await SecureStore.setItemAsync(key, 'true');
    return true;
  } catch {
    reservedKeys.delete(key);
    return false;
  }
}
