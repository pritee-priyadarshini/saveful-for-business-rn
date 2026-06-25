import React, { useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { useNotificationsStore } from '../store/notificationsStore';
import type { NotificationPermissionState } from '../store/notificationsStore';
import { palette } from '../theme/colors';
import { spacing } from '../theme/spacing';

function getStatusPresentation(state: NotificationPermissionState) {
  if (!state.supported) {
    return {
      label: 'Unavailable',
      description: 'Push notifications need a development or production app build (not Expo Go).',
      tone: 'muted' as const,
      icon: 'information-circle-outline' as const,
    };
  }

  if (state.granted) {
    return {
      label: 'Allowed',
      description: state.firebaseEnabled
        ? 'You will receive pickup updates, claims, and nearby listing alerts.'
        : 'Permission is on, but this build is not configured for remote push yet.',
      tone: 'success' as const,
      icon: 'checkmark-circle' as const,
    };
  }

  if (state.status === 'denied' && !state.canAskAgain) {
    return {
      label: 'Blocked',
      description: 'Notifications are turned off in system settings. Open settings to enable them.',
      tone: 'warning' as const,
      icon: 'close-circle' as const,
    };
  }

  return {
    label: 'Not allowed',
    description: 'Turn on notifications to get pickup updates, claims, and nearby listing alerts.',
    tone: 'warning' as const,
    icon: 'notifications-off-outline' as const,
  };
}

export function NotificationPermissionSettings() {
  const permission = useNotificationsStore((s) => s.permission);
  const isFetchingPermission = useNotificationsStore((s) => s.isFetchingPermission);
  const isUpdatingPermission = useNotificationsStore((s) => s.isUpdatingPermission);
  const error = useNotificationsStore((s) => s.error);
  const fetchPermission = useNotificationsStore((s) => s.fetchPermission);
  const enableNotifications = useNotificationsStore((s) => s.enableNotifications);
  const openSystemSettings = useNotificationsStore((s) => s.openSystemSettings);

  useFocusEffect(
    React.useCallback(() => {
      void fetchPermission();
    }, [fetchPermission]),
  );

  const presentation = useMemo(
    () => (permission ? getStatusPresentation(permission) : null),
    [permission],
  );

  const showEnableButton =
    permission?.supported && !permission.granted && permission.canAskAgain;
  const showSettingsButton =
    permission?.supported &&
    ((!permission.granted && !permission.canAskAgain) || permission.granted);

  if (isFetchingPermission && !permission) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={palette.primary} />
      </View>
    );
  }

  if (!permission || !presentation) {
    return null;
  }

  const toneStyles =
    presentation.tone === 'success'
      ? styles.statusSuccess
      : presentation.tone === 'warning'
        ? styles.statusWarning
        : styles.statusMuted;

  const toneTextColor =
    presentation.tone === 'success'
      ? palette.kale
      : presentation.tone === 'warning'
        ? palette.orange
        : palette.textMuted;

  return (
    <View style={styles.wrap}>
      <View style={[styles.statusRow, toneStyles]}>
        <Ionicons name={presentation.icon} size={22} color={toneTextColor} />
        <View style={styles.statusCopy}>
          <AppText variant="bodyBold" style={{ color: toneTextColor }}>
            {presentation.label}
          </AppText>
          <AppText variant="bodySmall" color={palette.textMuted}>
            {presentation.description}
          </AppText>
        </View>
      </View>

      {error ? (
        <AppText variant="bodySmall" color={palette.danger}>
          {error}
        </AppText>
      ) : null}

      {showEnableButton ? (
        <Pressable
          style={[styles.actionBtn, isUpdatingPermission && styles.actionBtnDisabled]}
          disabled={isUpdatingPermission}
          onPress={() => void enableNotifications()}
        >
          <Ionicons name="notifications-outline" size={18} color={palette.white} />
          <AppText variant="bodyBold" style={styles.actionBtnText}>
            {isUpdatingPermission ? 'Updating...' : 'Turn on notifications'}
          </AppText>
        </Pressable>
      ) : null}

      {showSettingsButton ? (
        <Pressable style={styles.secondaryBtn} onPress={openSystemSettings}>
          <AppText variant="bodyBold" style={styles.secondaryBtnText}>
            {permission.granted ? 'Manage in settings' : 'Open settings'}
          </AppText>
          <Ionicons name="chevron-forward" size={16} color={palette.primary} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.md,
  },
  loadingWrap: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusSuccess: {
    backgroundColor: '#E6FFF0',
    borderColor: '#D8EBDF',
  },
  statusWarning: {
    backgroundColor: '#FFF3E4',
    borderColor: '#FFE8CC',
  },
  statusMuted: {
    backgroundColor: '#F5F5F5',
    borderColor: palette.strokecream,
  },
  statusCopy: {
    flex: 1,
    gap: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: palette.primary,
    padding: spacing.md,
    borderRadius: 12,
  },
  actionBtnDisabled: {
    opacity: 0.65,
  },
  actionBtnText: {
    color: palette.white,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderColor: palette.border,
  },
  secondaryBtnText: {
    color: palette.primary,
  },
});
