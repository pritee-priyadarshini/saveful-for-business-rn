import { useCallback, useRef, useState } from 'react';

/** Prevents duplicate API submissions from rapid button taps. */
export function useSubmitLock() {
  const [submitting, setSubmitting] = useState(false);
  const lockRef = useRef(false);

  const withLock = useCallback(async (action: () => Promise<void>) => {
    if (lockRef.current) return;
    lockRef.current = true;
    setSubmitting(true);
    try {
      await action();
    } finally {
      lockRef.current = false;
      setSubmitting(false);
    }
  }, []);

  return { submitting, withLock };
}
