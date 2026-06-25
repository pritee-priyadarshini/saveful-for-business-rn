import { useCallback, useRef, useState } from 'react';

import { getUserFriendlyErrorMessage, showErrorAlert, showSuccessAlert } from '../utils/apiError';

export type AsyncActionOptions<T> = {
  onSuccess?: (result: T) => void;
  onError?: (message: string) => void;
  successTitle?: string;
  successMessage?: string;
  errorTitle?: string;
  fallbackErrorMessage?: string;
  showSuccessAlert?: boolean;
  showErrorAlert?: boolean;
};

export function useAsyncAction() {
  const [loading, setLoading] = useState(false);
  const lockRef = useRef(false);

  const run = useCallback(
    async <T,>(action: () => Promise<T>, options: AsyncActionOptions<T> = {}): Promise<T | undefined> => {
      if (lockRef.current) return undefined;

      lockRef.current = true;
      setLoading(true);

      try {
        const result = await action();

        if (options.showSuccessAlert && options.successMessage) {
          showSuccessAlert(
            options.successMessage,
            options.successTitle ?? 'Done',
            () => options.onSuccess?.(result),
          );
        } else {
          options.onSuccess?.(result);
        }

        return result;
      } catch (error) {
        const message = getUserFriendlyErrorMessage(error, options.fallbackErrorMessage);
        options.onError?.(message);

        if (options.showErrorAlert !== false) {
          showErrorAlert(error, options.errorTitle ?? 'Something went wrong', options.fallbackErrorMessage);
        }

        return undefined;
      } finally {
        lockRef.current = false;
        setLoading(false);
      }
    },
    [],
  );

  return { run, loading, isLoading: loading };
}
