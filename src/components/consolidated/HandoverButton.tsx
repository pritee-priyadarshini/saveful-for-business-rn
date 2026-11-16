import React from 'react';

import { ActionButton as Button } from '@/components/consolidated/ui';
import { showConfirmAlert } from '@/store/appAlertStore';
import { consolidatedService } from '@/services/consolidated.service';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { formatTimeInZone, handoverButtonLabel, handoverSuccessLabel } from '@/utils/consolidated';
import type { HandoverMethod } from '@/types/consolidated';

type Props = {
  contributionId: number;
  method?: HandoverMethod | null;
  timezone?: string | null;
  disabled?: boolean;
  size?: 'default' | 'compact';
  onDone?: (at?: string) => void;
};

export function HandoverButton({ contributionId, method, timezone, disabled, size = 'compact', onDone }: Props) {
  const label = handoverButtonLabel(method);

  const confirm = () => {
    showConfirmAlert({
      title: label,
      message: method === 'INTERNAL_COLLECTION'
        ? 'Confirm this food has been collected from the site.'
        : 'Confirm this food has been dropped off at the collection point.',
      confirmLabel: 'Confirm',
      cancelLabel: 'Not yet',
      onConfirm: async () => {
        try {
          await consolidatedService.confirmHandover(contributionId);
          const at = new Date().toISOString();
          showSuccessAlert(
            `${handoverSuccessLabel(method)} at ${formatTimeInZone(at, timezone)}. The receiver will now check it at the collection point.`,
            'Recorded',
          );
          onDone?.(at);
        } catch (error) {
          showErrorAlert(error, 'Could not confirm handover');
        }
      },
    });
  };

  return (
    <Button
      label={label}
      icon={method === 'INTERNAL_COLLECTION' ? 'walk-outline' : 'archive-outline'}
      onPress={confirm}
      disabled={disabled}
      size={size}
    />
  );
}
