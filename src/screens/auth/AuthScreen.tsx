import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Image,
  ImageBackground,
  Alert,
  Dimensions,
  Platform,
  Linking,
  Modal,
  Animated,
  PanResponder,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authService } from '@/services/auth.service';
import { mapRole } from '@/utils/roleMapper';
import { spacing } from '@/theme/spacing';
import MapView, { Marker } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { GOOGLE_PLACES_API_KEY } from '@/config';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

export function AuthScreen() {
  const {
    restaurantForm,
    charityForm,
    selectedRole,
    updateRestaurantField,
    updateCharityField,
  } = useAppContext();

  const navigation = useNavigation<NavProp>();

  const isRestaurant =
    selectedRole === 'restaurant_single' ||
    selectedRole === 'restaurant_multi';

  const [loading, setLoading] = useState(false);
  //const [openSections, setOpenSections] = useState<string[]>(['personal']);
  const [currentStep, setCurrentStep] = useState(1);

  const [isChecked, setIsChecked] = useState(false);
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [region, setRegion] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  const [selectedAddress, setSelectedAddress] = useState('');

  const MODAL_HEIGHT = height * 0.72;
  const slideAnim = useRef(new Animated.Value(height * 0.72)).current;

  const openModal = () => {
    slideAnim.setValue(MODAL_HEIGHT);
    setShowPlacesSearch(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
  };

  const closeModal = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, { toValue: MODAL_HEIGHT, duration: 250, useNativeDriver: true })
      .start(() => setShowPlacesSearch(false));
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 5,
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) slideAnim.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 80 || gs.vy > 0.5) {
          Keyboard.dismiss();
          Animated.timing(slideAnim, { toValue: MODAL_HEIGHT, duration: 250, useNativeDriver: true })
            .start(() => setShowPlacesSearch(false));
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // const toggle = (section: string) => {
  //   setOpenSections((prev) =>
  //     prev.includes(section)
  //       ? prev.filter((s) => s !== section)
  //       : [...prev, section]
  //   );
  // };

  const currentLogo = isRestaurant
    ? restaurantForm.logo
    : (charityForm as any).logo;

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const uri = result.assets[0].uri;

      if (isRestaurant) {
        updateRestaurantField('logo', uri);
      } else {
        updateCharityField('logo' as any, uri);
      }
    } catch (error: any) {
      Alert.alert('Image selection failed', 'Please try again.');
    }
  };

  const editLogo = async () => {
    if (!currentLogo) return;
    await pickImage();
  };

  const removeLogo = () => {
    if (isRestaurant) {
      updateRestaurantField('logo', '');
    } else {
      updateCharityField('logo' as any, '');
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
          ]
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude } = location.coords;
      const newRegion = { latitude, longitude, latitudeDelta: 0.01, longitudeDelta: 0.01 };
      setRegion(newRegion);
      setMarker({ latitude, longitude });
      updateCharityField('latitude', String(latitude));
      updateCharityField('longitude', String(longitude));

      const addresses = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (addresses.length > 0) {
        const place = addresses[0];
        const addr = [place.name, place.street, place.city, place.region, place.postalCode]
          .filter(Boolean)
          .join(', ');
        setSelectedAddress(addr);
        if (!charityForm.charityAddress) updateCharityField('charityAddress', addr);
      }

      openModal();
    } catch {
      Alert.alert('Error', 'Failed to get current location');
    }
  };

  const handleRegister = async () => {
    try {
      setLoading(true);

      const form = new FormData();

      if (isRestaurant) {
        if (restaurantForm.password !== restaurantForm.confirmPassword) {
          Alert.alert('Passwords do not match');
          return;
        }

        form.append('firstName', restaurantForm.firstName);
        form.append('lastName', restaurantForm.lastName);
        form.append('email', restaurantForm.email);
        form.append('password', restaurantForm.password);
        form.append('mobile', restaurantForm.mobile);
        form.append('businessName', restaurantForm.businessName);
        form.append('businessAddress', restaurantForm.businessAddress);
        form.append('registrationNumber', restaurantForm.registrationNumber);
        form.append('brandName', restaurantForm.branding);
        form.append('venueType', restaurantForm.venueType);
        form.append('orgType', mapRole(selectedRole));
        form.append('region', 'IN');
        form.append('latitude', '20.2961');
        form.append('longitude', '85.8245');

        if (restaurantForm.logo) {
          form.append('logo', {
            uri: restaurantForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerBusiness(form);
      } else {
        if (charityForm.password !== charityForm.confirmPassword) {
          Alert.alert('Passwords do not match');
          return;
        }

        form.append('firstName', charityForm.firstName);
        form.append('lastName', charityForm.lastName);
        form.append('email', charityForm.email);
        form.append('password', charityForm.password);
        form.append('mobile', charityForm.mobile);
        form.append('charityName', charityForm.charityName);
        form.append('charityAddress', charityForm.charityAddress);
        form.append('registrationNumber', charityForm.registrationNumber);
        form.append('brandName', charityForm.branding);
        form.append('charityType', mapRole(selectedRole));
        form.append('pickupPostCode', charityForm.postcodes);
        form.append('pickupRadiusKm', charityForm.pickupRadius || '5');
        form.append('region', 'IN');

        if (charityForm.latitude && charityForm.longitude) {
          form.append('latitude', charityForm.latitude);
          form.append('longitude', charityForm.longitude);
        }

        if (charityForm.logo) {
          form.append('logo', {
            uri: charityForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerCharity(form);
      }

      navigation.navigate('EmailVerification');
    } catch (error: any) {
      Alert.alert('Registration failed', error?.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const stepTwoTitle = isRestaurant ? 'Business Details' : 'Charity Details';
  const stepThreeTitle = isRestaurant ? 'Venue Type' : 'Pickup Radius';

  const venueOptions = [
    { label: 'Cafe / Restaurant', value: 'CAFE_RESTAURANT' },
    { label: 'Bakery', value: 'BAKERY' },
    { label: 'Event Venue', value: 'EVENT_VENUE' },
    { label: 'Grocery Store', value: 'GROCERY_STORE' },
    { label: 'Food Truck', value: 'FOOD_TRUCK' },
    { label: 'Catering Service', value: 'CATERING_SERVICE' },
    { label: 'Hotel', value: 'HOTEL' },
    { label: 'Wedding Venue', value: 'WEDDING_VENUE' },
    { label: 'Cloud Kitchen', value: 'CLOUD_KITCHEN' },
    { label: 'Other', value: 'OTHER' },
  ];

  return (
    <Screen backgroundColor={palette.creme}>
      {/* LOCATION BOTTOM SHEET MODAL */}
      <Modal
        visible={showPlacesSearch}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <Animated.View
                style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}
              >
                <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                  <View style={styles.dragHandle} />
                </View>

                <View style={styles.modalHeader}>
                  <AppText style={styles.modalTitle}>Set Location</AppText>
                  <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                    <Ionicons name="close" size={normalize(22)} color={palette.text} />
                  </Pressable>
                </View>

                <View style={styles.modalSearchContainer}>
                  <GooglePlacesAutocomplete
                    placeholder="Search charity address or place..."
                    fetchDetails
                    textInputProps={{ autoFocus: true }}
                    onPress={(data, details = null) => {
                      const lat = details?.geometry?.location?.lat;
                      const lng = details?.geometry?.location?.lng;
                      if (lat && lng) {
                        const newRegion = { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
                        setRegion(newRegion);
                        setMarker({ latitude: lat, longitude: lng });
                        updateCharityField('latitude', String(lat));
                        updateCharityField('longitude', String(lng));
                      }
                      const addr = details?.formatted_address || data.description;
                      setSelectedAddress(addr);
                      updateCharityField('charityAddress', addr);
                      Keyboard.dismiss();
                    }}
                    query={{ key: GOOGLE_PLACES_API_KEY, language: 'en' }}
                    styles={{
                      container: { flex: 0 },
                      textInputContainer: { borderRadius: normalize(10), borderWidth: 1, borderColor: palette.border },
                      textInput: { height: normalize(46), color: palette.text, fontSize: normalize(14), marginBottom: 0, backgroundColor: palette.white },
                      listView: { backgroundColor: palette.white, borderRadius: normalize(10), borderWidth: 1, borderColor: palette.border, marginTop: normalize(4) },
                      row: { padding: normalize(12), backgroundColor: palette.white },
                      description: { fontSize: normalize(13), color: palette.text },
                    }}
                    enablePoweredByContainer={false}
                    debounce={300}
                    keepResultsAfterBlur
                  />
                </View>

                <View style={styles.modalMapContainer}>
                  {region ? (
                    <MapView
                      style={styles.mapView}
                      region={region}
                      showsUserLocation
                      onPress={async (e) => {
                        const { latitude, longitude } = e.nativeEvent.coordinate;
                        setMarker({ latitude, longitude });
                        updateCharityField('latitude', String(latitude));
                        updateCharityField('longitude', String(longitude));
                        const res = await Location.reverseGeocodeAsync({ latitude, longitude });
                        if (res.length > 0) {
                          const place = res[0];
                          const addr = [place.name, place.street, place.city, place.region, place.postalCode].filter(Boolean).join(', ');
                          setSelectedAddress(addr);
                          updateCharityField('charityAddress', addr);
                        }
                      }}
                    >
                      {marker && <Marker coordinate={marker} />}
                    </MapView>
                  ) : (
                    <View style={styles.mapPlaceholder}>
                      <Ionicons name="map-outline" size={normalize(36)} color="#ccc" />
                      <AppText style={styles.mapPlaceholderText}>Search or tap to select a location</AppText>
                    </View>
                  )}
                </View>

                <Pressable
                  style={[styles.confirmBtn, !marker && styles.confirmBtnDisabled]}
                  onPress={closeModal}
                  disabled={!marker}
                >
                  <AppText style={styles.confirmBtnText}>
                    {marker ? 'Confirm Location' : 'Select a location on the map'}
                  </AppText>
                </Pressable>
              </Animated.View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <ScrollView
        contentContainerStyle={styles.newContent}
        showsVerticalScrollIndicator={false}
      >

        <View style={styles.authContainer}>

          {/* Header */}
          <AppText variant='subheading' style={styles.mainTitle}>
            Complete your profile
          </AppText>

          <AppText variant='caption' style={styles.mainSubtitle}>
            Create your Saveful for Business account and start making an impact.
          </AppText>

          {/* Stepper */}

          <View style={styles.stepperWrapper}>

            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  currentStep >= 1 && styles.stepCircleActive,
                ]}
              >
                <AppText variant='label'
                  style={[
                    styles.stepNumber,
                    currentStep >= 1 && styles.stepNumberActive,
                  ]}
                >
                  1
                </AppText>
              </View>

              <AppText variant='label' style={styles.stepLabel}>
                Your Details
              </AppText>
            </View>

            <View
              style={[
                styles.stepLine,
                currentStep >= 2 && styles.stepLineActive,
              ]}
            />

            {/* Step 2 */}

            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  currentStep >= 2 && styles.stepCircleActive,
                ]}
              >
                <AppText variant='label'
                  style={[
                    styles.stepNumber,
                    currentStep >= 2 && styles.stepNumberActive,
                  ]}
                >
                  2
                </AppText>
              </View>

              <AppText variant='label' style={styles.stepLabel}>
                {stepTwoTitle}
              </AppText>
            </View>

            <View
              style={[
                styles.stepLine,
                currentStep >= 3 && styles.stepLineActive,
              ]}
            />

            {/* Step 3 */}

            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  currentStep >= 3 && styles.stepCircleActive,
                ]}
              >
                <AppText variant='label'
                  style={[
                    styles.stepNumber,
                    currentStep >= 3 && styles.stepNumberActive,
                  ]}
                >
                  3
                </AppText>
              </View>

              <AppText variant='label' style={styles.stepLabel}>
                {stepThreeTitle}
              </AppText>
            </View>
          </View>

          {/* STEP 1 */}

          {currentStep === 1 && (
            <View style={styles.formCard}>
              <AppText variant='bodyLarge' style={styles.sectionTitle}>
                Your Details
              </AppText>

              <InputField
                label="First Name"
                placeholder="Enter first name"
                value={isRestaurant ? restaurantForm.firstName : charityForm.firstName}
                onChangeText={(v) =>
                  isRestaurant
                    ? updateRestaurantField('firstName', v)
                    : updateCharityField('firstName', v)
                }
              />
              <InputField
                label="Last Name"
                placeholder="Enter last name"
                value={isRestaurant ? restaurantForm.lastName : charityForm.lastName}
                onChangeText={(v) =>
                  isRestaurant
                    ? updateRestaurantField('lastName', v)
                    : updateCharityField('lastName', v)
                }
              />

              <InputField
                label="Email"
                placeholder="Enter a valid email id"
                value={isRestaurant ? restaurantForm.email : charityForm.email}
                onChangeText={(v) =>
                  isRestaurant
                    ? updateRestaurantField('email', v)
                    : updateCharityField('email', v)
                }
              />

              <InputField
                label="Mobile"
                placeholder="Enter mobile"
                value={isRestaurant ? restaurantForm.mobile : charityForm.mobile}
                onChangeText={(v) =>
                  isRestaurant
                    ? updateRestaurantField('mobile', v)
                    : updateCharityField('mobile', v)
                }
              />
              <InputField
                label="Password"
                placeholder="Enter password"
                isPassword
                value={isRestaurant ? restaurantForm.password : charityForm.password}
                onChangeText={(v) =>
                  isRestaurant
                    ? updateRestaurantField('password', v)
                    : updateCharityField('password', v)
                }
              />
              <InputField
                label="Confirm Password"
                placeholder="Re-enter password"
                isPassword
                value={
                  isRestaurant ? restaurantForm.confirmPassword : charityForm.confirmPassword
                }
                onChangeText={(v) =>
                  isRestaurant
                    ? updateRestaurantField('confirmPassword', v)
                    : updateCharityField('confirmPassword', v)
                }
              />

              <Button
                label="Continue"
                onPress={() => setCurrentStep(2)}
                style={styles.continueButton}
              />
            </View>
          )}

          {/* STEP 2 */}

          {currentStep === 2 && (
            <View style={styles.formCard}>
              <AppText variant='bodyLarge' style={styles.sectionTitle}>
                {stepTwoTitle}
              </AppText>

              {isRestaurant ? (
                <>
                  <InputField
                    label="Business Name"
                    placeholder="Enter business name"
                    value={restaurantForm.businessName}
                    onChangeText={(v) => updateRestaurantField('businessName', v)}
                  />

                  <InputField
                    label="Address"
                    placeholder="Enter address"
                    value={restaurantForm.businessAddress}
                    onChangeText={(v) => updateRestaurantField('businessAddress', v)}
                  />

                  <InputField
                    label="Business Registration Number"
                    placeholder="Enter registration number"
                    value={restaurantForm.registrationNumber}
                    onChangeText={(v) => updateRestaurantField('registrationNumber', v)}
                  />
                </>
              ) : (
                <>
                  <InputField
                    label="Charity / Non Profit Name"
                    placeholder="Enter charity/non-profit name"
                    value={charityForm.charityName}
                    onChangeText={(v) => updateCharityField('charityName', v)}
                  />
                  <InputField
                    label="Address"
                    placeholder="Enter address"
                    value={charityForm.charityAddress}
                    onChangeText={(v) => updateCharityField('charityAddress', v)}
                  />
                  <InputField
                    label="Registration Number"
                    placeholder="Enter registration number"
                    value={charityForm.registrationNumber}
                    onChangeText={(v) => updateCharityField('registrationNumber', v)}
                  />

                  <InputField
                    label="Postcode"
                    placeholder="Enter postcode"
                    value={charityForm.postcodes}
                    onChangeText={(v) => updateCharityField('postcodes', v)}
                  />
                </>
              )}

              <InputField
                label="Branding"
                placeholder="Brand name"
                value={
                  isRestaurant
                    ? restaurantForm.branding || ''
                    : (charityForm as any).branding || ''
                }
                onChangeText={(v) =>
                  isRestaurant
                    ? updateRestaurantField('branding', v)
                    : updateCharityField('branding' as any, v)
                }
              />

              {/* Logo */}

              <View style={styles.logoSection}>
                <AppText variant="label">Logo</AppText>
                <AppText variant="bodySmall" style={{ color: palette.textMuted }}>
                  Centre your subject — the logo displays as a circle in the app
                </AppText>

                {!currentLogo ? (
                  <Pressable style={styles.uploadBox} onPress={pickImage}>
                    <Ionicons
                      name="cloud-upload-outline"
                      size={28}
                      color={palette.primary}
                    />

                    <AppText variant='label'> Upload Logo </AppText>
                  </Pressable>
                ) : (
                  <View style={styles.logoActions}>
                    <Pressable style={styles.logoPreviewCard} onPress={editLogo}>
                      <Image
                        source={{ uri: currentLogo }}
                        style={styles.logoPreviewImage}
                        resizeMode='cover'
                      />

                      {/* <View style={styles.editBadge}>
                        <AppText style={styles.editBadgeText}>
                          Edit
                        </AppText>
                      </View> */}
                    </Pressable>

                    <View style={styles.logoButtons}>
                      <Pressable style={styles.secondaryButton} onPress={editLogo}>
                        <AppText variant="label">Crop / Zoom</AppText>
                      </Pressable>

                      <Pressable style={styles.secondaryButton} onPress={removeLogo}>
                        <AppText variant="label">Remove</AppText>
                      </Pressable>

                      <Pressable style={styles.primaryButton} onPress={pickImage}>
                        <AppText variant="label" style={{ color: palette.white }}>Replace</AppText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              <View style={styles.buttonRow}>
                <Button
                  label="Back"
                  variant="secondary"
                  onPress={() => setCurrentStep(1)}
                  style={styles.backBtn}
                />

                <Button
                  label="Continue"
                  onPress={() => setCurrentStep(3)}
                  style={styles.nextBtn}
                />
              </View>
            </View>
          )}

          {/* STEP 3 */}

          {currentStep === 3 && (
            <View style={styles.formCard}>
              <AppText variant='label' style={styles.sectionTitle}>
                {stepThreeTitle}
              </AppText>

              {/* BUSINESS FLOW */}

              {isRestaurant ? (
                <>
                  <View style={styles.venueGrid}>
                    {venueOptions.map((venue) => {
                      const isSelected =
                        restaurantForm.venueType === venue.value;

                      return (
                        <Pressable
                          key={venue.value}
                          style={[
                            styles.venueCard,
                            isSelected &&
                            styles.venueCardSelected,
                          ]}
                          onPress={() =>
                            updateRestaurantField(
                              'venueType',
                              venue.value
                            )
                          }
                        >
                          <View
                            style={[
                              styles.radioOuter,
                              isSelected &&
                              styles.radioOuterActive,
                            ]}
                          >
                            {isSelected && (
                              <View style={styles.radioInner} />
                            )}
                          </View>

                          <AppText
                            variant="bodyBold"
                            style={styles.venueText}
                          >
                            {venue.label}
                          </AppText>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : (
                <>
                  <InputField
                    label="Postcode"
                    placeholder="Enter postcode"
                    value={charityForm.postcodes}
                    onChangeText={(v) =>
                      updateCharityField('postcodes', v)
                    }
                  />

                  <InputField
                    label="Pickup Radius in Km (can change it later)"
                    placeholder="50"
                    value={charityForm.pickupRadius}
                    onChangeText={(v) => updateCharityField(
                      'pickupRadius',
                      v
                    )
                    }
                  />
                  <>
                  </>

                  <AppText variant="caption" style={styles.locationHelpText}>
                    Set your charity's location for better pickup matching.
                    You can skip this and add it later from your dashboard.
                  </AppText>

                  <View style={styles.locationPickerRow}>
                    <Pressable style={styles.locationPickerBtn} onPress={handleGpsLocation}>
                      <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
                      <AppText style={styles.locationPickerBtnText}>Use My Location </AppText>
                    </Pressable>

                    <Pressable style={[styles.locationPickerBtn, styles.locationPickerBtnSearch,]} onPress={openModal}>
                      <Ionicons name="search" size={normalize(16)} color={palette.white} />
                      <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]} >Search Address</AppText>
                    </Pressable>
                  </View>

                  {!!selectedAddress && (
                    <View style={styles.selectedAddressBox}>
                      <Ionicons name="checkmark-circle" size={normalize(18)} color={palette.middlegreen} />
                      <AppText style={styles.selectedAddressText} numberOfLines={2} >{selectedAddress}</AppText>
                      <Pressable
                        onPress={() => {
                          setSelectedAddress('');
                          setMarker(null);
                          setRegion(null);
                          updateCharityField('latitude', '');
                          updateCharityField('longitude', '');
                        }}>
                        <Ionicons name="close-circle" size={normalize(18)} color="#aaa" />
                      </Pressable>
                    </View>
                  )}
                </>
              )}

              {/* Terms */}
              <View style={styles.checkboxContainer}>
                <Pressable
                  style={[
                    styles.checkbox,
                    isChecked &&
                    styles.checkboxChecked,
                  ]}
                  onPress={() =>
                    setIsChecked(!isChecked)
                  }
                >
                  {isChecked && <AppText variant="label" style={styles.tick}>✓</AppText>}
                </Pressable>

                <AppText variant="label" style={styles.termsText}>
                  By continuing, I agree to the Saveful for Business{' '}
                  <AppText
                    variant="label"
                    style={styles.disclaimerLink}
                    onPress={() => Linking.openURL('https://www.saveful.com/saveful-for-business-terms-conditions')}
                  >
                    Terms & Conditions
                  </AppText>
                  {' '}and{' '}
                  <AppText
                    variant="label"
                    style={styles.disclaimerLink}
                    onPress={() => Linking.openURL('https://www.saveful.com/privacy-policy')}
                  >
                    Privacy Policy
                  </AppText>
                  . We’ll send you important updates - you can opt out anytime.
                </AppText>
              </View>

              {/* Footer Buttons */}

              <View style={styles.buttonRow}>
                <Button
                  label="Back"
                  variant="secondary"
                  onPress={() => setCurrentStep(2)}
                  style={styles.backBtn}
                />

                <Button
                  label={loading ? 'Creating...' : 'Create Account'}
                  onPress={handleRegister}
                  disabled={!isChecked || loading}
                  style={styles.nextBtn}
                />
              </View>

              <AppText variant="label" style={styles.tip}>
                {isRestaurant && (
                  <AppText variant="label" style={styles.tip}>
                    No payment required to get started
                  </AppText>
                )}
              </AppText>
            </View>
          )}

        </View>
      </ScrollView>
    </Screen>
  );
}

/* SECTION */
// function Section({ title, active, onPress, children }: any) {
//   return (
//     <View style={styles.section}>
//       <Pressable onPress={onPress} style={styles.sectionHeader}>
//         <AppText variant="bodyBold">{title}</AppText>
//         <AppText>{active ? '−' : '+'}</AppText>
//       </Pressable>
//       {active && <View style={styles.sectionContent}>{children}</View>}
//     </View>
//   );
// }

const styles = StyleSheet.create({
  logoActions: {
    gap: hp(1.2),
  },

  editBadge: {
    position: 'absolute',
    right: -wp(2),
    bottom: -hp(0.6),
    backgroundColor: palette.primary,
    paddingHorizontal: wp(3.2),
    paddingVertical: hp(0.4),
    borderRadius: normalize(999),
  },

  editBadgeText: {
    color: palette.white,
    fontSize: normalize(11),
  },

  logoButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: wp(2),
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },

  primaryButton: {
    backgroundColor: palette.middlegreen,
    borderRadius: normalize(12),
    paddingHorizontal: wp(3),
    paddingVertical: hp(0.8),
  },

  tip: {
    textAlign: 'center',
    opacity: 0.6,
    fontSize: normalize(12),
  },

  disclaimerLink: {
    color: palette.primary,
    textDecorationLine: 'underline',
  },

  checkbox: {
    width: normalize(20),
    height: normalize(20),
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: normalize(4),
    alignItems: 'center',
    justifyContent: 'center',
  },

  checkboxChecked: {
    backgroundColor: palette.primary,
  },

  locationHelpText: {
    opacity: 0.7,
    marginBottom: hp(1),
  },

  locationPickerRow: {
    flexDirection: 'row',
    gap: wp(2.5),
    marginTop: hp(0.5),
  },

  locationPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: normalize(6),
    padding: normalize(12),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.primary,
    backgroundColor: palette.primary + '15',
  },

  locationPickerBtnSearch: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },

  locationPickerBtnText: {
    fontSize: normalize(13),
    color: palette.primary,
    fontWeight: '500',
  },

  locationPickerBtnTextWhite: {
    color: palette.white,
  },

  selectedAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: normalize(8),
    marginTop: hp(1.5),
    padding: normalize(12),
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    borderWidth: 1,
    borderColor: palette.border,
  },

  selectedAddressText: {
    flex: 1,
    fontSize: normalize(13),
    color: palette.text,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },

  modalSheet: {
    height: height * 0.72,
    backgroundColor: palette.white,
    borderTopLeftRadius: normalize(20),
    borderTopRightRadius: normalize(20),
    overflow: 'hidden',
  },

  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: normalize(10),
    backgroundColor: palette.white,
  },

  dragHandle: {
    width: normalize(40),
    height: normalize(4),
    borderRadius: normalize(2),
    backgroundColor: '#ddd',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: wp(4),
    paddingBottom: normalize(10),
  },

  modalTitle: {
    flex: 1,
    fontSize: normalize(16),
    fontWeight: '600',
    color: palette.text,
  },

  modalCloseBtn: {
    padding: normalize(4),
  },

  modalSearchContainer: {
    paddingHorizontal: wp(4),
    paddingBottom: normalize(8),
    zIndex: 9999,
    elevation: 9999,
  },

  modalMapContainer: {
    flex: 1,
    marginHorizontal: wp(4),
    marginBottom: normalize(4),
    borderRadius: normalize(12),
    overflow: 'hidden',
    zIndex: 1,
  },

  mapView: {
    flex: 1,
  },

  mapPlaceholder: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    gap: normalize(8),
  },

  mapPlaceholderText: {
    color: '#aaa',
    fontSize: normalize(12),
  },

  confirmBtn: {
    backgroundColor: palette.middlegreen,
    padding: normalize(14),
    marginHorizontal: wp(6),
    marginTop: normalize(8),
    marginBottom: normalize(16),
    borderRadius: normalize(10),
    alignItems: 'center',
  },

  confirmBtnDisabled: {
    backgroundColor: '#bbb',
  },

  confirmBtnText: {
    color: palette.white,
    fontSize: normalize(15),
    fontWeight: '600',
  },

  tick: {
    color: palette.white,
    fontSize: normalize(14),
  },


  newContent: {
    padding: wp(5),
    paddingBottom: hp(10),
  },

  authContainer: {
    gap: hp(2),
  },

  mainTitle: {
    fontSize: normalize(28),
    lineHeight: normalize(40),
    textAlign: 'center',
    color: palette.text,
    marginTop: hp(2),
    paddingBottom: hp(0.3),
  },

  mainSubtitle: {
    textAlign: 'center',
    color: palette.textMuted,
    marginBottom: hp(1),
  },

  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: hp(1),
    marginBottom: hp(2),
  },

  stepItem: {
    alignItems: 'center',
    width: wp(20),
  },

  stepCircle: {
    width: normalize(38),
    height: normalize(38),
    borderRadius: normalize(19),
    borderWidth: 2,
    borderColor: '#D9D9D9',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepCircleActive: {
    backgroundColor: palette.middlegreen,
    borderColor: palette.middlegreen,
  },

  stepNumber: {
    color: '#BDBDBD',
    fontWeight: '700',
  },

  stepNumberActive: {
    color: palette.white,
  },

  stepLabel: {
    marginTop: hp(0.8),
    textAlign: 'center',
    fontSize: normalize(11),
    color: palette.text,
  },

  stepLine: {
    flex: 1,
    height: 3,
    backgroundColor: '#E2E2E2',
    marginTop: normalize(18),
  },

  stepLineActive: {
    backgroundColor: palette.middlegreen,
  },

  formCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(24),
    paddingHorizontal: wp(5),
    paddingVertical: hp(2.5),
    gap: hp(1.8),

    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 4,
    },

    elevation: 3,
  },

  sectionTitle: {
    fontSize: normalize(22),
    lineHeight: normalize(30),
    color: palette.text,
    marginBottom: hp(1.5),
    paddingBottom: hp(0.3),
  },

  logoSection: {
    gap: hp(1),
  },

  uploadBox: {
    height: normalize(120),
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: palette.primary,
    borderRadius: normalize(16),
    justifyContent: 'center',
    alignItems: 'center',
    gap: hp(1),
    backgroundColor: palette.primary + '08',
  },

  logoPreviewCard: {
    alignSelf: 'center',
  },

  logoPreviewImage: {
    width: normalize(120),
    height: normalize(120),
    borderRadius: normalize(60),
  },

  buttonRow: {
    flexDirection: 'row',
    gap: wp(3),
    marginTop: hp(1.5),
  },

  backBtn: {
    flex: 1,
  },

  nextBtn: {
    flex: 1,
    backgroundColor: palette.middlegreen,
    borderColor: palette.middlegreen,
  },

  continueButton: {
    marginTop: hp(1.5),
    backgroundColor: palette.middlegreen,
    borderColor: palette.middlegreen,
  },

  venueGrid: {
    gap: hp(1.2),
  },

  venueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),

    paddingVertical: hp(1.8),
    paddingHorizontal: wp(4),

    borderRadius: normalize(16),
    borderWidth: 1,
    borderColor: '#E5E5E5',

    backgroundColor: palette.white,
  },

  venueCardSelected: {
    borderColor: palette.middlegreen,
    backgroundColor: '#F2FFF5',
  },

  venueText: {
    flex: 1,
    color: palette.text,
  },

  radioOuter: {
    width: normalize(22),
    height: normalize(22),
    borderRadius: normalize(11),

    borderWidth: 2,
    borderColor: '#D0D0D0',

    alignItems: 'center',
    justifyContent: 'center',
  },

  radioOuterActive: {
    borderColor: palette.middlegreen,
  },

  radioInner: {
    width: normalize(10),
    height: normalize(10),
    borderRadius: normalize(5),
    backgroundColor: palette.middlegreen,
  },

  locationBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(1),
    paddingVertical: hp(1.4),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.primary,
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(3),
    marginTop: hp(2),
  },

  termsText: {
    flex: 1,
    fontSize: normalize(12),
    lineHeight: normalize(18),
    color: palette.textMuted,
  },

});