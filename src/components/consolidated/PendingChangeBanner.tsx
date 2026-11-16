import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '@/components/AppText';
import { ActionButton as Button } from '@/components/consolidated/ui';
import { SavefulModal } from '@/components/SavefulModal';
import { palette } from '@/theme/colors';
import { consolidatedService } from '@/services/consolidated.service';
import { showErrorAlert } from '@/utils/apiError';
import { normalize } from '@/utils/responsive';

type Props = {
  claimId: number;
  changeId?: number | null;
  summary?: string | null;
  onAcknowledged?: () => void;
  onCancelPickup: () => void;
};

export function PendingChangeBanner({ claimId, changeId, summary, onAcknowledged, onCancelPickup }: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(summary || '');
  const [working, setWorking] = useState(false);

  const review = async () => {
    setOpen(true);
    if (text || !claimId) return;
    try {
      const view = await consolidatedService.getItemCheck(claimId);
      if (view.pendingChange?.summary) setText(view.pendingChange.summary);
    } catch {
      setText('Your pickup details have changed. Please review them before you collect.');
    }
  };

  const confirm = async () => {
    const id = changeId;
    if (!id) {
      setOpen(false);
      return;
    }
    setWorking(true);
    try {
      await consolidatedService.acknowledgeChange(id);
      setOpen(false);
      onAcknowledged?.();
    } catch (error) {
      showErrorAlert(error, 'Could not confirm');
    } finally {
      setWorking(false);
    }
  };

  return (
    <View>
      <Pressable onPress={() => { void review(); }} style={styles.banner} accessibilityRole="button">
        <Ionicons name="notifications" size={normalize(18)} color="#A35A0B" />
        <View style={styles.flex}>
          <AppText variant="bodyBold" color={palette.black}>Your pickup has changed</AppText>
          <AppText variant="meta" color={palette.midgray}>Tap to review and confirm before collecting</AppText>
        </View>
        <Ionicons name="chevron-forward" size={normalize(16)} color="#A35A0B" />
      </Pressable>
      <SavefulModal visible={open} onClose={() => setOpen(false)} title="Pickup changed" subtitle="Please review and confirm">
        <AppText variant="bodySmall" color={palette.midgray}>{text || 'Your pickup details have changed.'}</AppText>
        <View style={styles.actions}>
          <Button label={working ? 'Saving…' : 'Confirm'} onPress={() => { void confirm(); }} loading={working} />
          <Button label="Cancel pickup" variant="secondary" onPress={() => { setOpen(false); onCancelPickup(); }} />
        </View>
      </SavefulModal>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFF4E5',
    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: '#F6D3A6',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  flex: { flex: 1 },
  actions: { gap: 8, marginTop: 12 },
});
