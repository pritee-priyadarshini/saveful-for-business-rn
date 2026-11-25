import React from 'react';
import { StyleSheet } from 'react-native';

import { MfcCta, MfcNotice } from '@/components/makeFoodCount/MfcAppUi';
import { MFC_WRITE_BLOCK_MESSAGE, useMakeFoodCountStore } from '@/store/makeFoodCountStore';

/**
 * Shown when the server refuses the open draft — the person can view this
 * site's records but not change them, the draft is gone, or the plan lacks
 * Make Food Count. Retrying now can't help, so it says so plainly and offers
 * the way out: close the draft on this phone (the server copy is untouched).
 */
export function BlockedDraftNotice({ onClosed }: { onClosed: () => void }) {
  const block = useMakeFoodCountStore((state) => state.writeBlocked);
  if (!block) return null;
  return (
    <MfcNotice
      tone="danger"
      icon={block === 'missing' ? 'alert-circle' : 'lock-closed'}
      title={MFC_WRITE_BLOCK_MESSAGE[block]}
      body={
        block === 'forbidden'
          ? 'Ask someone who works at this site to finish it. Close it here to keep recording your own food.'
          : block === 'unpaid'
            ? 'Your draft stays on this phone. Once Make Food Count is on your plan, come back and it will save.'
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
