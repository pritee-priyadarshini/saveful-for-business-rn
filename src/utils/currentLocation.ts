import { Alert, Linking } from 'react-native';
import * as Location from 'expo-location';

export type CurrentLocationResult = {
  latitude: number;
  longitude: number;
  address: string;
};

function formatAddress(place: Location.LocationGeocodedAddress): string {
  return [place.name, place.street, place.city, place.region, place.postalCode]
    .filter(Boolean)
    .join(', ');
}

export async function reverseGeocodeAddress(
  latitude: number,
  longitude: number,
): Promise<string> {
  try {
    const places = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (places.length > 0) {
      const label = formatAddress(places[0]);
      if (label) return label;
    }
  } catch {
    // fall through to coordinates
  }

  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

export async function fetchCurrentLocation(): Promise<CurrentLocationResult | null> {
  try {
    let permission = await Location.getForegroundPermissionsAsync();
    if (permission.status !== 'granted') {
      permission = await Location.requestForegroundPermissionsAsync();
    }

    if (permission.status !== 'granted') {
      Alert.alert(
        'Location Permission Required',
        'Please enable location permission from app settings.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
        ],
      );
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = position.coords;
    const address = await reverseGeocodeAddress(latitude, longitude);

    return { latitude, longitude, address };
  } catch {
    Alert.alert('Location Error', 'Unable to get your location. Please try again.');
    return null;
  }
}
