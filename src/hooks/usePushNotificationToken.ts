import {
  TokenManager,
  TokenManagerEvents,
} from '../modules/pushNotifications/TokenManager';
import React from 'react';

export default function usePushNotificationToken() {
  const [token, setToken] = React.useState<string | undefined>(
    TokenManager.shared.getToken(),
  );

  const onTokenChanged = React.useCallback((newToken?: string) => {
    setToken(newToken);
  }, []);

  React.useEffect(() => {
    TokenManager.shared.addListener(
      TokenManagerEvents.TokenChanged,
      onTokenChanged,
    );

    return () => {
      TokenManager.shared.removeListener(
        TokenManagerEvents.TokenChanged,
        onTokenChanged,
      );
    };
  }, [onTokenChanged]);

  return { token };
}
