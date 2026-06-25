import {
  TokenManager,
  TokenManagerEvents,
  TokenManagerPermissionStatus,
} from '../modules/pushNotifications/TokenManager';
import React from 'react';

export default function usePushNotificationPermission() {
  const [permission, setPermission] =
    React.useState<TokenManagerPermissionStatus>(
      TokenManager.shared.getPermission(),
    );

  const onPermissionChanged = React.useCallback(
    (newPermission: TokenManagerPermissionStatus) => {
      setPermission(newPermission);
    },
    [],
  );

  React.useEffect(() => {
    TokenManager.shared.addListener(
      TokenManagerEvents.PermissionChanged,
      onPermissionChanged,
    );

    return () => {
      TokenManager.shared.removeListener(
        TokenManagerEvents.PermissionChanged,
        onPermissionChanged,
      );
    };
  }, [onPermissionChanged]);

  const registerForPushNotifications = React.useCallback(() => {
    TokenManager.shared.registerForPushNotifications();
  }, []);

  return {
    permission,
    registerForPushNotifications,
    canAskForPermission: TokenManager.shared.canAskForPermission,
  };
}
