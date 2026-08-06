import * as SecureStore from 'expo-secure-store';

import type { UserRole } from '@/types';

export type ReceiverWelcomeVariant = Extract<
  UserRole,
  'charity_single' | 'charity_multi' | 'farmer'
>;

export type ReceiverWelcomeContent = {
  emoji: string;
  titleLead: string;
  titleBrand: string;
  paragraphs: string[];
  tip: string;
  closing: string;
  cta: string;
};

const SHARED_EMPTY_STATE =
  "If there aren't any listings just yet, don't worry - we're welcoming new businesses every day, and new surplus is shared in real time.";

const SHARED_TIP =
  'Tip: You can update your pickup radius and availability anytime by going to Account ⟼ Pickup Preferences.';

const SHARED_CLOSING =
  'Checking back regularly and enabling notifications will help ensure you never miss an opportunity.';

export const RECEIVER_WELCOME_CONTENT: Record<ReceiverWelcomeVariant, ReceiverWelcomeContent> = {
  charity_single: {
    emoji: '🎉',
    titleLead: 'Welcome to',
    titleBrand: 'Saveful for Business',
    paragraphs: [
      "You're now part of a growing network helping good food go further.",
      "As you enter the app, you'll see surplus food listings from businesses within your pickup area as they become available.",
      SHARED_EMPTY_STATE,
    ],
    tip: SHARED_TIP,
    closing: SHARED_CLOSING,
    cta: 'Start exploring',
  },
  farmer: {
    emoji: '🎉',
    titleLead: 'Welcome to',
    titleBrand: 'Saveful for Business',
    paragraphs: [
      "You're now part of a growing network helping surplus food create value on farms.",
      "As you enter the app, you'll see surplus food suitable for livestock feed within your selected collection area as it becomes available.",
      SHARED_EMPTY_STATE,
    ],
    tip: SHARED_TIP,
    closing: SHARED_CLOSING,
    cta: 'Start exploring',
  },
  charity_multi: {
    emoji: '🎉',
    titleLead: 'Welcome to',
    titleBrand: 'Saveful for Business',
    paragraphs: [
      "You're now part of a growing network helping good food go further.",
      "As you enter the app, you'll see surplus food listings from businesses within your pickup area as they become available.",
      SHARED_EMPTY_STATE,
      'Managing multiple locations? Start by adding your collection sites so each location can manage its own pickup preferences and receive surplus listings relevant to its area.',
    ],
    tip: SHARED_TIP,
    closing: SHARED_CLOSING,
    cta: 'Start exploring',
  },
};

export const PENDING_RECEIVER_WELCOME_KEY = 'pendingReceiverWelcome';

export function isReceiverWelcomeRole(role: UserRole | null | undefined): role is ReceiverWelcomeVariant {
  return role === 'charity_single' || role === 'charity_multi' || role === 'farmer';
}

export function receiverWelcomeStorageKey(identity: string | number) {
  return `receiverWelcomeSeen:${String(identity).trim().toLowerCase()}`;
}

export async function markPendingReceiverWelcome(
  role: UserRole,
  identity?: string | number | null,
) {
  if (!isReceiverWelcomeRole(role)) return;
  try {
    await SecureStore.setItemAsync(PENDING_RECEIVER_WELCOME_KEY, role);
    // Fresh signup must show even if this device previously dismissed welcome.
    if (identity != null && String(identity).trim()) {
      await SecureStore.deleteItemAsync(receiverWelcomeStorageKey(identity));
    }
  } catch {
    // Non-fatal — hook retries briefly after auth.
  }
}

export async function clearPendingReceiverWelcome() {
  try {
    await SecureStore.deleteItemAsync(PENDING_RECEIVER_WELCOME_KEY);
  } catch {
    // ignore
  }
}
