import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

import {
  clearPendingReceiverWelcome,
  isReceiverWelcomeRole,
  PENDING_RECEIVER_WELCOME_KEY,
  RECEIVER_WELCOME_CONTENT,
  receiverWelcomeStorageKey,
  type ReceiverWelcomeContent,
  type ReceiverWelcomeVariant,
} from '@/data/receiverWelcome';
import { useAuthStore } from '@/store/authStore';

function resolveWelcomeIdentity(authUser: {
  id?: number | string | null;
  email?: string | null;
  profile?: { user?: { id?: number | string | null; email?: string | null } } | null;
} | null): string | null {
  const id = authUser?.id ?? authUser?.profile?.user?.id;
  if (id != null && String(id).trim()) return String(id).trim();

  const email = authUser?.email ?? authUser?.profile?.user?.email;
  if (email && String(email).trim()) return String(email).trim().toLowerCase();

  return null;
}

function parsePendingVariant(raw: string | null): ReceiverWelcomeVariant | null {
  if (!raw) return null;
  if (raw === 'true' || raw === '1') return null;
  return isReceiverWelcomeRole(raw) ? raw : null;
}

/**
 * Shows the receiver welcome modal only once after signup (pending flag set on
 * email verification). Regular logins and in-app navigation never re-open it.
 */
export function useReceiverWelcomeModal(variant: ReceiverWelcomeVariant | null) {
  const authUser = useAuthStore((s) => s.authUser);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [visible, setVisible] = useState(false);
  const [contentVariant, setContentVariant] = useState<ReceiverWelcomeVariant | null>(variant);
  const evaluatedRef = useRef<string | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const content: ReceiverWelcomeContent | null = useMemo(() => {
    const key = contentVariant ?? variant;
    return key ? RECEIVER_WELCOME_CONTENT[key] : null;
  }, [contentVariant, variant]);

  const evaluate = useCallback(
    async (attempt = 0) => {
      if (!variant || !isAuthenticated || !authUser) {
        setVisible(false);
        return;
      }

      const identity = resolveWelcomeIdentity(authUser);
      const evalKey = `${variant}:${identity ?? 'unknown'}`;

      try {
        const pending = await SecureStore.getItemAsync(PENDING_RECEIVER_WELCOME_KEY);
        const pendingVariant = parsePendingVariant(pending);
        const pendingGeneric = pending === 'true' || pending === '1';
        const pendingForSignup = Boolean(pendingVariant) || pendingGeneric;

        // Signup just finished — SecureStore write can lag auth slightly.
        if (!pendingForSignup && attempt < 4) {
          retryTimerRef.current = setTimeout(() => {
            void evaluate(attempt + 1);
          }, 200 + attempt * 150);
          return;
        }

        if (evaluatedRef.current === evalKey) return;
        evaluatedRef.current = evalKey;

        if (!pendingForSignup) {
          setVisible(false);
          return;
        }

        // Fresh signup pending always wins over a prior "seen" flag (re-signup /
        // role change on same device). Clear seen so dismiss can re-stamp it.
        if (identity) {
          try {
            await SecureStore.deleteItemAsync(receiverWelcomeStorageKey(identity));
          } catch {
            // ignore
          }
        }

        const nextContent =
          pendingVariant && isReceiverWelcomeRole(pendingVariant)
            ? pendingVariant
            : variant;
        setContentVariant(nextContent);
        setVisible(true);
      } catch {
        setVisible(false);
      }
    },
    [authUser, isAuthenticated, variant],
  );

  useEffect(() => {
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    if (!variant || !isAuthenticated) {
      setVisible(false);
      setContentVariant(null);
      evaluatedRef.current = null;
      return;
    }

    setContentVariant(variant);
    const timer = setTimeout(() => {
      void evaluate(0);
    }, 450);

    return () => {
      clearTimeout(timer);
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
        retryTimerRef.current = null;
      }
    };
  }, [evaluate, isAuthenticated, variant]);

  const dismiss = useCallback(async () => {
    setVisible(false);
    const identity = resolveWelcomeIdentity(authUser);
    try {
      await clearPendingReceiverWelcome();
      if (identity) {
        await SecureStore.setItemAsync(receiverWelcomeStorageKey(identity), 'true');
      }
    } catch {
      // Modal already closed for this session.
    }
  }, [authUser]);

  return {
    visible: Boolean(visible && content),
    dismiss,
    content: content ?? RECEIVER_WELCOME_CONTENT.charity_single,
  };
}
