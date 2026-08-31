import { Alert, Linking, Platform } from 'react-native';
import * as ExpoImagePicker from 'expo-image-picker';

import { showConfirmAlert } from '@/store/appAlertStore';
import { openCircularImageCrop } from '@/utils/circularImageCrop';
import { showErrorAlert } from '@/utils/apiError';

function androidApiLevel(): number {
  const version = Platform.Version;
  return typeof version === 'number' ? version : Number.parseInt(String(version), 10);
}

/**
 * iOS 14+ PHPicker and Android 13+ photo picker only share the selected asset.
 * They must not request full photo-library permission — that is what shows
 * "would like full access to your Photo Library".
 */
function usesSystemPhotoPicker(): boolean {
  if (Platform.OS === 'ios') return true;
  return Platform.OS === 'android' && Number.isFinite(androidApiLevel()) && androidApiLevel() >= 33;
}

function promptSettings(kind: 'photos' | 'camera') {
  showConfirmAlert({
    title: kind === 'camera' ? 'Camera access needed' : 'Photo access needed',
    message:
      kind === 'camera'
        ? 'Allow the camera for Saveful for Business in Settings, then return here to take a logo photo.'
        : 'Allow photos for Saveful for Business in Settings, then return here to upload your logo.',
    confirmLabel: 'Open Settings',
    cancelLabel: 'Not now',
    onConfirm: () => {
      void Linking.openSettings();
    },
  });
}

async function ensureLegacyAndroidLibraryAccess(): Promise<boolean> {
  if (usesSystemPhotoPicker()) return true;

  let permission = await ExpoImagePicker.getMediaLibraryPermissionsAsync();
  if (!permission.granted && permission.canAskAgain !== false) {
    permission = await ExpoImagePicker.requestMediaLibraryPermissionsAsync();
  }
  if (permission.granted) return true;

  promptSettings('photos');
  return false;
}

async function ensureCameraAccess(): Promise<boolean> {
  let permission = await ExpoImagePicker.getCameraPermissionsAsync();
  if (!permission.granted) {
    permission = await ExpoImagePicker.requestCameraPermissionsAsync();
  }
  if (permission.granted) return true;

  promptSettings('camera');
  return false;
}

/** Opens the device camera. Do not pass mediaTypes — on iOS that can open the library instead. */
export async function takePhoto(quality = 1): Promise<string | null> {
  const allowed = await ensureCameraAccess();
  if (!allowed) return null;

  try {
    const result = await ExpoImagePicker.launchCameraAsync({
      allowsEditing: false,
      quality,
      cameraType: ExpoImagePicker.CameraType.back,
    });
    if (result.canceled) return null;
    return result.assets[0]?.uri ?? null;
  } catch {
    showErrorAlert(
      Platform.OS === 'ios'
        ? 'The iOS Simulator has no camera. Use a real iPhone, or tap Choose photo.'
        : 'Please try again.',
      'Could not open camera',
    );
    return null;
  }
}

function chooseImageSource(): Promise<'camera' | 'library' | null> {
  return new Promise((resolve) => {
    Alert.alert(
      'Add logo',
      'Take a photo in the app, or pick one photo from your library. We never need access to your whole library.',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Take photo', onPress: () => resolve('camera') },
        { text: 'Choose photo', onPress: () => resolve('library') },
      ],
    );
  });
}

async function cropPickedAsset(uri: string | undefined): Promise<string | null> {
  if (!uri) return null;
  return openCircularImageCrop(uri);
}

/**
 * Opens camera or the system photo picker, then the in-app circular crop UI.
 * Does not request full photo-library access on iOS or Android 13+.
 */
export async function pickSquareImage(): Promise<string | null> {
  try {
    const source = await chooseImageSource();
    if (!source) return null;

    if (source === 'camera') {
      const uri = await takePhoto(1);
      return cropPickedAsset(uri ?? undefined);
    }

    const allowed = await ensureLegacyAndroidLibraryAccess();
    if (!allowed) return null;

    const result = await ExpoImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) return null;
    return cropPickedAsset(result.assets[0]?.uri);
  } catch (error) {
    showErrorAlert('Please try again.', 'Could not open gallery');
    return null;
  }
}
