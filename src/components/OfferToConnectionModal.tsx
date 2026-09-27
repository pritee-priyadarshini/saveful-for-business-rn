import React from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';

import { AppText } from '@/components/AppText';
import { palette } from '@/theme/colors';
import { formatWindowLabel } from '@/utils/connections';
import { wp } from '@/utils/responsive';

type Props = {
  visible: boolean;
  fromCharity?: string;
  toCharity?: string;
  windowStartAt?: string | null;
  windowEndAt?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function OfferToConnectionModal({
  visible,
  fromCharity,
  toCharity,
  windowStartAt,
  windowEndAt,
  submitting,
  onClose,
  onConfirm,
}: Props) {
  const window = formatWindowLabel(windowStartAt, windowEndAt);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <AppText variant="h6">Move to {toCharity || 'this connection'}?</AppText>
          <AppText variant="bodySmall" color={palette.stone} style={styles.copy}>
            {fromCharity || 'The current charity'} will no longer see this listing.
          </AppText>
          <AppText variant="label">New pickup window</AppText>
          <AppText variant="h6" style={styles.window}>
            {window || 'This connection’s scheduled window'}
          </AppText>
          <AppText variant="caption" color={palette.midgray} style={styles.note}>
            The listing will use this window. Best before stays at or after the end of it, so the
            food does not expire before they can collect.
          </AppText>
          <Pressable
            style={[styles.moveBtn, submitting && { opacity: 0.6 }]}
            disabled={submitting}
            onPress={onConfirm}
          >
            <AppText variant="bodyBold" color={palette.white}>
              {submitting ? 'Moving…' : `Move to ${toCharity || 'them'}`}
            </AppText>
          </Pressable>
          <Pressable style={styles.cancel} disabled={submitting} onPress={onClose}>
            <AppText variant="bodyBold" color={palette.primary}>
              Cancel
            </AppText>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: wp(6),
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 16,
    padding: 20,
  },
  copy: {
    marginTop: 6,
    marginBottom: 14,
  },
  window: {
    marginTop: 4,
  },
  note: {
    marginTop: 8,
  },
  moveBtn: {
    marginTop: 16,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: palette.kale,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  cancel: {
    alignItems: 'center',
    paddingTop: 12,
  },
});
