import * as ExpoImagePicker from 'expo-image-picker';

import { openCircularImageCrop } from '@/utils/circularImageCrop';
import { showErrorAlert, showInfoAlert } from '@/utils/apiError';

/**
 * Opens the gallery, then the in-app circular crop UI:
 * full-screen image cover, resizable circle, transparent toolbar, white controls.
 */
export async function pickSquareImage(): Promise<string | null> {
  try {
    const permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showInfoAlert(
        'Allow photo library access so you can upload a logo.',
        'Photo access needed',
      );
      return null;
    }

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
    console.warn('[Logo] Image pick/crop failed:', error);
    showErrorAlert('Please try again.', 'Could not open gallery');
    return null;
  }
}
