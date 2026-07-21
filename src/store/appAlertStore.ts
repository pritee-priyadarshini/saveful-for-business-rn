import { create } from 'zustand';

export type AppAlertVariant = 'success' | 'error' | 'info' | 'confirm';

export type AppAlertPayload = {
  variant: AppAlertVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm?: () => void | Promise<void>;
  /** Called when the primary OK button is pressed (success / error / info). */
  onDismiss?: () => void;
};

type AppAlertState = {
  visible: boolean;
  loading: boolean;
  variant: AppAlertVariant;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  destructive: boolean;
  onConfirm?: () => void | Promise<void>;
  onDismiss?: () => void;
  show: (payload: AppAlertPayload) => void;
  close: (options?: { runPrimaryDismiss?: boolean }) => void;
  setLoading: (loading: boolean) => void;
};

const IDLE: Omit<
  AppAlertState,
  'show' | 'close' | 'setLoading' | 'visible' | 'loading'
> = {
  variant: 'info',
  title: '',
  message: '',
  confirmLabel: 'Ok',
  cancelLabel: 'Cancel',
  destructive: false,
  onConfirm: undefined,
  onDismiss: undefined,
};

export const useAppAlertStore = create<AppAlertState>((set, get) => ({
  visible: false,
  loading: false,
  ...IDLE,

  show: (payload) => {
    set({
      visible: true,
      loading: false,
      variant: payload.variant,
      title: payload.title,
      message: payload.message,
      confirmLabel:
        payload.confirmLabel ??
        (payload.variant === 'confirm' ? 'Confirm' : 'Ok'),
      cancelLabel: payload.cancelLabel ?? 'Cancel',
      destructive: payload.destructive ?? false,
      onConfirm: payload.onConfirm,
      onDismiss: payload.onDismiss,
    });
  },

  close: (options) => {
    const { onDismiss } = get();
    set({ visible: false, loading: false, ...IDLE });
    if (options?.runPrimaryDismiss) {
      onDismiss?.();
    }
  },

  setLoading: (loading) => set({ loading }),
}));

export function showAppAlert(payload: AppAlertPayload) {
  useAppAlertStore.getState().show(payload);
}

export function showConfirmAlert(options: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
}) {
  showAppAlert({
    variant: 'confirm',
    title: options.title,
    message: options.message,
    confirmLabel: options.confirmLabel,
    cancelLabel: options.cancelLabel,
    destructive: options.destructive,
    onConfirm: options.onConfirm,
  });
}

export function hideAppAlert() {
  useAppAlertStore.getState().close();
}
