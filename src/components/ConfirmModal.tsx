/**
 * App-wide alert / confirm UI.
 *
 * Prefer these helpers everywhere instead of React Native `Alert.alert`
 * so success, error, info, and confirm dialogs look the same.
 *
 * - showSuccessAlert / showErrorAlert / showInfoAlert  → from `@/utils/apiError`
 * - showConfirmAlert / showAppAlert                   → from `@/store/appAlertStore`
 * - <AppAlertHost /> is mounted once in App.tsx
 */
export { AppAlertHost, ConfirmModal } from './AppAlertModal';
export {
  showAppAlert,
  showConfirmAlert,
  hideAppAlert,
} from '@/store/appAlertStore';
export {
  showErrorAlert,
  showSuccessAlert,
  showInfoAlert,
} from '@/utils/apiError';
