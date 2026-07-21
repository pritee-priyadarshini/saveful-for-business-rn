import { Linking } from 'react-native';
import * as Location from 'expo-location';

import { showConfirmAlert } from '@/store/appAlertStore';
import { showErrorAlert } from '@/utils/apiError';
import { resolveLocationDetails } from '@/utils/postcode';

export type CurrentLocationResult = {
  latitude: number;
  longitude: number;
  address: string;
  postcode: string;
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
      showConfirmAlert({
        title: 'Location Permission Required',
        message: 'Please enable location permission from app settings.',
        confirmLabel: 'Open Settings',
        cancelLabel: 'Cancel',
        onConfirm: () => {
          Linking.openSettings();
        },
      });
      return null;
    }

    const position = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    const { latitude, longitude } = position.coords;
    const { address, postcode } = await resolveLocationDetails(latitude, longitude);

    return { latitude, longitude, address, postcode };
  } catch {
    showErrorAlert('Unable to get your location. Please try again.', 'Location Error');
    return null;
  }
}
