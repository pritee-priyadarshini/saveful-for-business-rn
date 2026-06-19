import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Linking,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import { AppText } from './AppText';
import { OsmMapView } from './OsmMapView';
import { palette } from '../theme/colors';
import { GOOGLE_PLACES_API_KEY } from '@/config';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => Math.round(size * (width / 375));

const MODAL_HEIGHT = height * 0.9;

export type SelectedLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (location: SelectedLocation) => void | Promise<void>;
  searchPlaceholder?: string;
  confirming?: boolean;
  initialLocation?: SelectedLocation | null;
};

export function LocationSetupModal({
  visible,
  onClose,
  onConfirm,
  searchPlaceholder = 'Search address or place...',
  confirming = false,
  initialLocation = null,
}: Props) {
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');

  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;

  useEffect(() => {
    if (!visible) return;

    if (initialLocation) {
      setMarker({
        latitude: initialLocation.latitude,
        longitude: initialLocation.longitude,
      });
      setSelectedAddress(initialLocation.address);
    }

    slideAnim.setValue(MODAL_HEIGHT);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, initialLocation, slideAnim]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 8,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) slideAnim.setValue(gesture.dy);
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100 || gesture.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const applyCoords = async (
    latitude: number,
    longitude: number,
    address?: string,
  ) => {
    setMarker({ latitude, longitude });

    if (address) {
      setSelectedAddress(address);
      return;
    }

    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places.length > 0) {
        const place = places[0];
        const label = [place.name, place.street, place.city, place.region, place.postalCode]
          .filter(Boolean)
          .join(', ');
        setSelectedAddress(label || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      } else {
        setSelectedAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      }
    } catch {
      setSelectedAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
    }
  };

  const handleGpsLocation = async () => {
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
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      await applyCoords(position.coords.latitude, position.coords.longitude);
    } catch {
      Alert.alert('Location Error', 'Unable to get your location. Please try again.');
    }
  };

  const handleConfirm = async () => {
    if (!marker) return;

    await onConfirm({
      latitude: marker.latitude,
      longitude: marker.longitude,
      address: selectedAddress,
    });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View
          style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.dragArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
            <AppText style={styles.title}>Set Location</AppText>
            <Pressable onPress={handleClose} style={styles.closeBtn}>
              <Ionicons name="close" size={normalize(22)} color={palette.text} />
            </Pressable>
          </View>

          <View style={styles.searchWrap}>
            <GooglePlacesAutocomplete
              placeholder={searchPlaceholder}
              fetchDetails
              textInputProps={{ autoFocus: visible }}
              onPress={(data, details = null) => {
                const lat = details?.geometry?.location?.lat;
                const lng = details?.geometry?.location?.lng;
                if (lat != null && lng != null) {
                  applyCoords(lat, lng, details?.formatted_address || data.description);
                }
                Keyboard.dismiss();
              }}
              query={{ key: GOOGLE_PLACES_API_KEY, language: 'en' }}
              styles={{
                container: { flex: 0 },
                textInputContainer: {
                  borderRadius: normalize(10),
                  borderWidth: 1,
                  borderColor: palette.border,
                },
                textInput: {
                  height: normalize(46),
                  color: palette.text,
                  fontSize: normalize(14),
                  marginBottom: 0,
                  backgroundColor: palette.white,
                },
                listView: {
                  backgroundColor: palette.white,
                  borderRadius: normalize(10),
                  borderWidth: 1,
                  borderColor: palette.border,
                  marginTop: normalize(4),
                },
                row: { padding: normalize(12), backgroundColor: palette.white },
                description: { fontSize: normalize(13), color: palette.text },
              }}
              enablePoweredByContainer={false}
              debounce={300}
              keepResultsAfterBlur
            />
          </View>

          <Pressable style={styles.gpsRow} onPress={handleGpsLocation}>
            <Ionicons name="locate" size={normalize(18)} color={palette.primary} />
            <AppText style={styles.gpsRowText}>Use my current location</AppText>
          </Pressable>

          <View
            style={styles.mapPreview}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
          >
            <OsmMapView
              style={styles.map}
              active={visible}
              marker={marker}
              selectable
              onLocationSelect={(latitude, longitude) => {
                applyCoords(latitude, longitude);
              }}
            />
            {!marker && (
              <View style={styles.mapHint} pointerEvents="none">
                <AppText style={styles.mapHintText}>
                  Pan, zoom, or tap the map to place your pin
                </AppText>
              </View>
            )}
          </View>

          {!!selectedAddress && (
            <View style={styles.selectedBox}>
              <Ionicons name="checkmark-circle" size={normalize(18)} color={palette.middlegreen} />
              <AppText style={styles.selectedText} numberOfLines={2}>
                {selectedAddress}
              </AppText>
            </View>
          )}

          <Pressable
            style={[styles.confirmBtn, (!marker || confirming) && styles.confirmBtnDisabled]}
            onPress={handleConfirm}
            disabled={!marker || confirming}
          >
            <AppText style={styles.confirmBtnText}>
              {confirming ? 'Saving...' : marker ? 'Confirm Location' : 'Select a location'}
            </AppText>
          </Pressable>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    height: MODAL_HEIGHT,
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    paddingHorizontal: wp(4),
    paddingBottom: hp(2),
  },
  dragArea: {
    alignItems: 'center',
    paddingVertical: hp(1.2),
  },
  dragHandle: {
    width: wp(12),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#D0D0D0',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: hp(1),
  },
  title: {
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(18),
    color: palette.text,
  },
  closeBtn: {
    padding: normalize(4),
  },
  searchWrap: {
    zIndex: 20,
  },
  gpsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(1),
    marginBottom: hp(1),
  },
  gpsRowText: {
    color: palette.primary,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(13),
  },
  mapPreview: {
    flex: 1,
    minHeight: hp(42),
    borderRadius: normalize(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: '#F5F5F5',
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapHint: {
    position: 'absolute',
    left: wp(3),
    right: wp(3),
    bottom: hp(1),
    paddingVertical: hp(0.8),
    paddingHorizontal: wp(3),
    borderRadius: normalize(8),
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  mapHintText: {
    textAlign: 'center',
    color: palette.midgray,
    fontSize: normalize(12),
  },
  selectedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    marginTop: hp(1.2),
    padding: wp(3),
    borderRadius: normalize(10),
    backgroundColor: '#F4F8EF',
  },
  selectedText: {
    flex: 1,
    fontSize: normalize(13),
    color: palette.text,
  },
  confirmBtn: {
    marginTop: hp(1.2),
    backgroundColor: palette.primary,
    borderRadius: normalize(12),
    paddingVertical: hp(1.5),
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmBtnText: {
    color: palette.white,
    fontFamily: 'Saveful-SemiBold',
    fontSize: normalize(15),
  },
});
