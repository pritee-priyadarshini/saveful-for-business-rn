import { Linking, Platform } from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';

import { showConfirmAlert } from '@/store/appAlertStore';
import { openCircularImageCrop } from '@/utils/circularImageCrop';
import { showErrorAlert } from '@/utils/apiError';

function androidApiLevel(): number {
  const version = Platform.Version;
  return typeof version === 'number' ? version : Number.parseInt(String(version), 10);
}

/** Android 13+ uses the system photo picker, which does not need Files and media permission. */
function usesSystemPhotoPicker(): boolean {
  return Platform.OS === 'android' && Number.isFinite(androidApiLevel()) && androidApiLevel() >= 33;
}

function canUsePhotoLibrary(
  permission: ExpoImagePicker.MediaLibraryPermissionResponse,
): boolean {
  if (permission.granted) return true;
  if (permission.status === ExpoImagePicker.PermissionStatus.GRANTED) return true;
  return permission.accessPrivileges === 'all' || permission.accessPrivileges === 'limited';
}

function promptPhotoSettings() {
  showConfirmAlert({
    title: 'Photo access needed',
    message:
      'Allow photos for Saveful for Business in Settings, then return here to upload your logo.',
    confirmLabel: 'Open Settings',
    cancelLabel: 'Not now',
    onConfirm: () => {
      void Linking.openSettings();
    },
  });
}

async function ensurePhotoLibraryAccess(): Promise<boolean> {
  if (usesSystemPhotoPicker()) return true;

  let permission = await ExpoImagePicker.getMediaLibraryPermissionsAsync();
  if (!canUsePhotoLibrary(permission) && permission.canAskAgain !== false) {
    permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
  }

  if (canUsePhotoLibrary(permission)) return true;

  promptPhotoSettings();
  return false;
}

/**
 * Opens the gallery, then the in-app circular crop UI:
 * full-screen image cover, resizable circle, transparent toolbar, white controls.
 */
export async function pickSquareImage(): Promise<string | null> {
  try {
    const allowed = await ensurePhotoLibraryAccess();
    if (!allowed) return null;

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled || !result.assets[0]?.uri) {
      return null;
    }

    return openCircularImageCrop(result.assets[0].uri);
  } catch (error) {
    showErrorAlert('Please try again.', 'Could not open gallery');
    return null;
  }
}
