import React from 'react';
import { StyleSheet } from 'react-native';

import { MfcCta, MfcNotice } from '@/components/makeFoodCount/MfcAppUi';
import { MFC_WRITE_BLOCK_MESSAGE, useMakeFoodCountStore } from '@/store/makeFoodCountStore';

/**
 * Shown when the server refuses the open draft for good — the person can view
 * this site's records but not change them, or the draft is gone. Retrying can't
 * help, so it says so plainly and offers the way out: close the draft on this
 * phone (the server copy is untouched).
 */
export function BlockedDraftNotice({ onClosed }: { onClosed: () => void }) {
  const block = useMakeFoodCountStore((state) => state.writeBlocked);
  if (!block) return null;
  return (
    <MfcNotice
      tone="danger"
      icon={block === 'forbidden' ? 'lock-closed' : 'alert-circle'}
      title={MFC_WRITE_BLOCK_MESSAGE[block]}
      body={
        block === 'forbidden'
          ? 'Ask someone who works at this site to finish it. Close it here to keep recording your own food.'
          : 'Close it here, then start a new record.'
      }
    >
      <MfcCta
        label="Close this draft"
        variant="secondary"
        compact
        onPress={() => {
          useMakeFoodCountStore.getState().clearDraft();
          onClosed();
        }}
        style={styles.action}
      />
    </MfcNotice>
  );
}

const styles = StyleSheet.create({
  action: { alignSelf: 'flex-start' },
});
