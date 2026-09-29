import React from 'react';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { AppText } from './AppText';
import { ModalArt, type ModalArtKind } from './ModalArt';
import { palette } from '../theme/colors';
import { hp, normalize, wp } from '@/utils/responsive';
import {
  useAppAlertStore,
  type AppAlertVariant,
} from '@/store/appAlertStore';

const TONE: Record<AppAlertVariant, { accent: string; art: ModalArtKind }> = {
  success: { accent: palette.kale, art: 'success' },
  error: { accent: palette.danger, art: 'caution' },
  info: { accent: palette.kale, art: 'notice' },
  confirm: { accent: palette.kale, art: 'notice' },
};

function artFor(variant: AppAlertVariant, destructive?: boolean): ModalArtKind {
  if (destructive) return 'caution';
  return TONE[variant].art;
}

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
  const onCancel = useAppAlertStore((s) => s.onCancel);
  const close = useAppAlertStore((s) => s.close);
  const setLoading = useAppAlertStore((s) => s.setLoading);

  const isConfirm = variant === 'confirm';
  const showCancel = isConfirm && Boolean(cancelLabel?.trim());
  const accent = destructive ? palette.danger : TONE[variant].accent;

  const handleDismiss = () => {
    if (loading) return;
    close();
  };

  const handleCancel = () => {
    if (loading) return;
    close();
    onCancel?.();
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
      onRequestClose={handleDismiss}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleDismiss} />
        <View style={styles.card}>
          <ModalArt kind={artFor(variant, destructive)} />

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

          <View style={styles.actions}>
            <Pressable
              style={[
                styles.btn,
                styles.btnSolid,
                { backgroundColor: accent },
                loading && styles.btnDisabled,
              ]}
              disabled={loading}
              onPress={handlePrimary}
            >
              <AppText variant="bodyBold" style={styles.btnSolidText}>
                {loading ? 'Please wait…' : confirmLabel}
              </AppText>
            </Pressable>

            {showCancel ? (
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
  const accent = destructive ? palette.danger : palette.kale;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={loading ? undefined : onCancel} />
        <View style={styles.card}>
          <ModalArt kind={destructive ? 'caution' : 'notice'} />
          <AppText variant="h6" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="body" style={styles.message}>
            {message}
          </AppText>
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.btn,
                styles.btnSolid,
                { backgroundColor: accent },
                loading && styles.btnDisabled,
              ]}
              disabled={loading}
              onPress={onConfirm}
            >
              <AppText variant="bodyBold" style={styles.btnSolidText}>
                {loading ? 'Please wait…' : confirmLabel}
              </AppText>
            </Pressable>
            <Pressable
              style={[styles.btn, styles.btnGhost, loading && styles.btnDisabled]}
              disabled={loading}
              onPress={onCancel}
            >
              <AppText variant="bodyBold" style={styles.btnGhostText}>
                {cancelLabel}
              </AppText>
            </Pressable>
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
    paddingHorizontal: wp(7),
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(26, 26, 27, 0.48)',
  },
  card: {
    width: '100%',
    maxWidth: normalize(360),
    backgroundColor: palette.white,
    borderRadius: normalize(22),
    paddingTop: hp(2.4),
    paddingBottom: hp(2.2),
    paddingHorizontal: wp(5.5),
    alignItems: 'center',
    gap: hp(0.4),
    ...Platform.select({
      ios: {
        shadowColor: '#1A1A1B',
        shadowOffset: { width: 0, height: 16 },
        shadowOpacity: 0.16,
        shadowRadius: 28,
      },
      android: {
        elevation: 14,
      },
    }),
  },
  title: {
    textAlign: 'center',
    textTransform: 'none',
    color: palette.black,
    fontSize: normalize(22),
    lineHeight: normalize(28),
    marginTop: hp(1.6),
  },
  message: {
    textAlign: 'center',
    textTransform: 'none',
    color: palette.stone,
    fontSize: normalize(15),
    lineHeight: normalize(22),
    marginTop: hp(0.8),
    marginBottom: hp(1.6),
    paddingHorizontal: wp(1),
  },
  actions: {
    width: '100%',
    gap: hp(1),
  },
  btn: {
    width: '100%',
    minHeight: normalize(50),
    borderRadius: normalize(14),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: wp(4),
  },
  btnSolid: {},
  btnSolidText: {
    color: palette.white,
    textTransform: 'none',
    fontSize: normalize(16),
  },
  btnGhost: {
    backgroundColor: palette.creme,
    borderWidth: 1.5,
    borderColor: '#E2DDD2',
  },
  btnGhostText: {
    color: palette.primary,
    textTransform: 'none',
    fontSize: normalize(16),
  },
  btnDisabled: {
    opacity: 0.6,
  },
});
