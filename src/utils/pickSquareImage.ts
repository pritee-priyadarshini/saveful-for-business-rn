import * as ImagePicker from 'expo-image-picker';

export async function pickSquareImage(): Promise<string | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]?.uri) {
    return null;
  }

  return result.assets[0].uri;
}
