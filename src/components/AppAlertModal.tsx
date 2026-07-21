import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from './AppText';
import { palette } from '../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import {
  useAppAlertStore,
  type AppAlertVariant,
} from '@/store/appAlertStore';

const ICON_SIZE = normalize(72);

const TONE: Record<
  AppAlertVariant,
  {
    icon: keyof typeof Ionicons.glyphMap;
    accent: string;
    iconBg: string;
  }
> = {
  success: {
    icon: 'checkmark',
    accent: palette.middlegreen,
    iconBg: palette.middlegreen,
  },
  error: {
    icon: 'close',
    accent: palette.danger,
    iconBg: palette.danger,
  },
  info: {
    icon: 'information',
    accent: palette.blueberry,
    iconBg: palette.blueberry,
  },
  confirm: {
    icon: 'help',
    accent: palette.middlegreen,
    iconBg: palette.middlegreen,
  },
};

export function AppAlertHost() {
  const visible = useAppAlertStore((s) => s.visible);
  const loading = useAppAlertStore((s) => s.loading);
  const variant = useAppAlertStore((s) => s.variant);
  const title = useAppAlertStore((s) => s.title);
  const message = useAppAlertStore((s) => s.message);
  const confirmLabel = useAppAlertStore((s) => s.confirmLabel);
  const cancelLabel = useAppAlertStore((s) => s.cancelLabel);
  const destructive = useAppAlertStore((s) => s.destructive);
  const onConfirm = useAppAlertStore((s) => s.onConfirm);
  const close = useAppAlertStore((s) => s.close);
  const setLoading = useAppAlertStore((s) => s.setLoading);

  const isConfirm = variant === 'confirm';
  const accent = destructive ? palette.danger : TONE[variant].accent;
  const iconBg = destructive ? palette.danger : TONE[variant].iconBg;
  const iconName =
    destructive && isConfirm ? 'warning' : TONE[variant].icon;

  const handleCancel = () => {
    if (loading) return;
    close();
  };

  const handlePrimary = async () => {
    if (loading) return;

    if (!isConfirm) {
      close({ runPrimaryDismiss: true });
      return;
    }

    if (!onConfirm) {
      close();
      return;
    }

    try {
      setLoading(true);
      await onConfirm();
      const current = useAppAlertStore.getState();
      if (current.variant === 'confirm' && current.visible) {
        close();
      } else {
        setLoading(false);
      }
    } catch {
      const current = useAppAlertStore.getState();
      if (current.variant === 'confirm') {
        setLoading(false);
      }
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleCancel} />

        <View style={styles.sheet}>
          <View style={[styles.badge, { backgroundColor: iconBg }, styles.badgeShadow]}>
            <Ionicons name={iconName} size={normalize(34)} color={palette.white} />
          </View>

          <View style={styles.card}>
            {!!title ? (
              <AppText variant="h6" style={styles.title}>
                {title}
              </AppText>
            ) : null}

            {!!message ? (
              <AppText variant="body" style={styles.message}>
                {message}
              </AppText>
            ) : null}

            <View style={[styles.actions, isConfirm && styles.actionsRow]}>
              {isConfirm ? (
                <Pressable
                  style={[styles.btn, styles.btnGhost, loading && styles.btnDisabled]}
                  disabled={loading}
                  onPress={handleCancel}
                >
                  <AppText variant="bodyBold" style={styles.btnGhostText}>
                    {cancelLabel}
                  </AppText>
                </Pressable>
              ) : null}

              <Pressable
                style={[
                  styles.btn,
                  styles.btnOutline,
                  { borderColor: accent },
                  isConfirm && styles.btnFlex,
                  loading && styles.btnDisabled,
                ]}
                disabled={loading}
                onPress={handlePrimary}
              >
                <AppText variant="bodyBold" style={[styles.btnOutlineText, { color: accent }]}>
                  {loading ? 'Please wait…' : confirmLabel}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

/** Local confirm sheet — prefer `showConfirmAlert` for app-wide consistency. */
export function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const accent = destructive ? palette.danger : palette.middlegreen;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel} />
        <View style={styles.sheet}>
          <View style={[styles.badge, { backgroundColor: accent }, styles.badgeShadow]}>
            <Ionicons
              name={destructive ? 'warning' : 'help'}
              size={normalize(34)}
              color={palette.white}
            />
          </View>
          <View style={styles.card}>
            <AppText variant="h6" style={styles.title}>
              {title}
            </AppText>
            <AppText variant="body" style={styles.message}>
              {message}
            </AppText>
            <View style={[styles.actions, styles.actionsRow]}>
              <Pressable
                style={[styles.btn, styles.btnGhost, loading && styles.btnDisabled]}
                disabled={loading}
                onPress={onCancel}
              >
                <AppText variant="bodyBold" style={styles.btnGhostText}>
                  {cancelLabel}
                </AppText>
              </Pressable>
              <Pressable
                style={[
                  styles.btn,
                  styles.btnOutline,
                  styles.btnFlex,
                  { borderColor: accent },
                  loading && styles.btnDisabled,
                ]}
                disabled={loading}
                onPress={onConfirm}
              >
                <AppText variant="bodyBold" style={[styles.btnOutlineText, { color: accent }]}>
                  {loading ? 'Please wait…' : confirmLabel}
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: wp(8),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 27, 0.42)',
  },
  sheet: {
    width: '100%',
    maxWidth: normalize(340),
    alignItems: 'center',
  },
  badge: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: ICON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    marginBottom: -ICON_SIZE / 2,
  },
  badgeShadow: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  card: {
    width: '100%',
    backgroundColor: palette.white,
    borderRadius: normalize(16),
    paddingTop: ICON_SIZE / 2 + hp(2.2),
    paddingBottom: hp(2.4),
    paddingHorizontal: wp(6),
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  title: {
    textAlign: 'center',
    textTransform: 'none',
    color: palette.black,
    fontSize: normalize(22),
    lineHeight: normalize(28),
    marginBottom: hp(1),
  },
  message: {
    textAlign: 'center',
    textTransform: 'none',
    color: palette.midgray,
    fontSize: normalize(15),
    lineHeight: normalize(22),
    marginBottom: hp(2.4),
    paddingHorizontal: wp(1),
  },
  actions: {
    width: '100%',
    gap: hp(1),
  },
  actionsRow: {
    flexDirection: 'row',
    gap: wp(2.5),
  },
  btn: {
    minHeight: normalize(48),
    borderRadius: normalize(10),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  btnFlex: {
    flex: 1,
  },
  btnOutline: {
    width: '100%',
    backgroundColor: palette.white,
    borderWidth: 1.5,
  },
  btnOutlineText: {
    textTransform: 'none',
    fontSize: normalize(16),
  },
  btnGhost: {
    flex: 1,
    backgroundColor: palette.white,
    borderWidth: 1.5,
    borderColor: '#D8D8D8',
  },
  btnGhostText: {
    color: palette.midgray,
    textTransform: 'none',
    fontSize: normalize(16),
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
