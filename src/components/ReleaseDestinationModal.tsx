import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AppText } from '@/components/AppText';
import { ModalArt } from '@/components/ModalArt';
import { palette } from '@/theme/colors';
import { formatWindowLabel } from '@/utils/connections';
import { hp, wp } from '@/utils/responsive';

export type ReleaseDestinationOption = {
  connectionId: number;
  charityName?: string;
  windowStartAt?: string | null;
  windowEndAt?: string | null;
};

type Props = {
  visible: boolean;
  currentCharity?: string;
  others: ReleaseDestinationOption[];
  onClose: () => void;
  onOpenNetwork: () => void;
  onOfferTo: (other: ReleaseDestinationOption) => void;
};

export function ReleaseDestinationModal({
  visible,
  currentCharity,
  others,
  onClose,
  onOpenNetwork,
  onOfferTo,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.card} onPress={() => undefined}>
          <View style={styles.art}>
            <ModalArt kind="notice" />
          </View>
          <AppText variant="h6" style={styles.title}>Where should this go?</AppText>
          <AppText variant="bodySmall" color={palette.stone} style={styles.copy}>
            {currentCharity || 'This charity'} will no longer have it reserved.
          </AppText>
          <ScrollView
            style={others.length > 3 ? styles.list : undefined}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            <Pressable style={styles.choice} onPress={onOpenNetwork}>
              <AppText variant="bodyBold">Open network</AppText>
              <AppText variant="caption" color={palette.stone}>
                Nearby charities can claim it
              </AppText>
            </Pressable>
            {others.map((other) => (
              <Pressable key={other.connectionId} style={styles.choice} onPress={() => onOfferTo(other)}>
                <AppText variant="bodyBold">{other.charityName || 'Another connection'}</AppText>
                <AppText variant="caption" color={palette.stone}>
                  Reserve for this connection
                  {formatWindowLabel(other.windowStartAt, other.windowEndAt)
                    ? ` · ${formatWindowLabel(other.windowStartAt, other.windowEndAt)}`
                    : ''}
                </AppText>
              </Pressable>
            ))}
          </ScrollView>
          <Pressable style={styles.cancel} onPress={onClose}>
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
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: palette.white,
    borderRadius: 22,
    padding: 20,
    maxHeight: '78%',
  },
  art: {
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    textAlign: 'center',
  },
  copy: {
    marginTop: 6,
    marginBottom: 12,
    textAlign: 'center',
  },
  list: {
    maxHeight: hp(42),
  },
  choice: {
    borderWidth: 1,
    borderColor: '#D9DED2',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: palette.creme,
  },
  cancel: {
    alignItems: 'center',
    paddingTop: 8,
  },
});
