import React, { useState } from 'react';
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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Picker } from '@react-native-picker/picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';
import { InputField } from '../../components/InputField';
import { Screen } from '../../components/Screen';
import { LocationSetupModal, type SelectedLocation } from '../../components/LocationSetupModal';
import { useAppContext } from '../../store/AppContext';
import { palette } from '../../theme/colors';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { authService } from '@/services/auth.service';
import { mapRole } from '@/utils/roleMapper';
import { spacing } from '@/theme/spacing';

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
    farmerForm,
    selectedRole,
    updateRestaurantField,
    updateCharityField,
    updateFarmerField,
  } = useAppContext();

  const navigation = useNavigation<NavProp>();

  const isRestaurant =
    selectedRole === 'restaurant_single' ||
    selectedRole === 'restaurant_multi';

  const isFarmerProducer = selectedRole === 'farm_business';
  const isFarmerConsumer = selectedRole === 'farmer';
  const isFarmer = isFarmerProducer || isFarmerConsumer;

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);

  const [isChecked, setIsChecked] = useState(false);
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');

  const openLocationModal = () => setShowPlacesSearch(true);

  // const toggle = (section: string) => {
  //   setOpenSections((prev) =>
  //     prev.includes(section)
  //       ? prev.filter((s) => s !== section)
  //       : [...prev, section]
  //   );
  // };

  const currentLogo = isFarmer
    ? farmerForm.logo
    : isRestaurant
    ? restaurantForm.logo
    : charityForm.logo;

  const updateLocationCoords = (lat: string, lng: string) => {
    if (isRestaurant) {
      updateRestaurantField('latitude', lat);
      updateRestaurantField('longitude', lng);
    } else if (isFarmer) {
      updateFarmerField('latitude', lat);
      updateFarmerField('longitude', lng);
    } else {
      updateCharityField('latitude', lat);
      updateCharityField('longitude', lng);
    }
  };

  const updateLocationAddress = (addr: string) => {
    if (isRestaurant) {
      if (!restaurantForm.businessAddress?.trim()) {
        updateRestaurantField('businessAddress', addr);
      }
    } else if (isFarmer) {
      if (!farmerForm.businessAddress?.trim()) {
        updateFarmerField('businessAddress', addr);
      }
    } else if (!charityForm.charityAddress?.trim()) {
      updateCharityField('charityAddress', addr);
    }
  };

  const handleAuthLocationConfirm = async ({ latitude, longitude, address }: SelectedLocation) => {
    updateLocationCoords(String(latitude), String(longitude));
    updateLocationAddress(address);
    setSelectedAddress(address);
    setShowPlacesSearch(false);
  };

  const clearSelectedLocation = () => {
    setSelectedAddress('');
    if (isRestaurant) {
      updateRestaurantField('latitude', '');
      updateRestaurantField('longitude', '');
    } else if (isFarmer) {
      updateFarmerField('latitude', '');
      updateFarmerField('longitude', '');
    } else {
      updateCharityField('latitude', '');
      updateCharityField('longitude', '');
    }
  };

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

      if (isFarmer) {
        updateFarmerField('logo', uri);
      } else if (isRestaurant) {
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
    if (isFarmer) {
      updateFarmerField('logo', '');
    } else if (isRestaurant) {
      updateRestaurantField('logo', '');
    } else {
      updateCharityField('logo' as any, '');
    }
  };

  const handleRegister = async () => {
    setFormError(null);
    try {
      setLoading(true);

      const form = new FormData();

      if (isRestaurant) {
        if (restaurantForm.password !== restaurantForm.confirmPassword) {
          setFormError('Passwords do not match. Please re-enter.');
          return;
        }

        if (!restaurantForm.latitude?.trim() || !restaurantForm.longitude?.trim()) {
          setFormError('Please set your business location before creating your account.');
          setCurrentStep(3);
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
        form.append('latitude', restaurantForm.latitude);
        form.append('longitude', restaurantForm.longitude);

        if (restaurantForm.logo) {
          form.append('logo', {
            uri: restaurantForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerBusiness(form);

      } else if (isFarmerProducer) {
        if (farmerForm.password !== farmerForm.confirmPassword) {
          setFormError('Passwords do not match. Please re-enter.');
          return;
        }

        if (!farmerForm.latitude?.trim() || !farmerForm.longitude?.trim()) {
          setFormError('Please set your farm location before creating your account.');
          setCurrentStep(3);
          return;
        }

        form.append('firstName', farmerForm.firstName);
        form.append('lastName', farmerForm.lastName);
        form.append('email', farmerForm.email);
        form.append('password', farmerForm.password);
        form.append('mobileNumber', farmerForm.mobile);
        form.append('businessName', farmerForm.businessName);
        form.append('businessAddress', farmerForm.businessAddress);
        form.append('brandName', farmerForm.branding);
        form.append('venueType', farmerForm.venueType);
        form.append('orgType', 'FARMER_PRODUCER');
        form.append('region', 'IN');
        form.append('latitude', farmerForm.latitude);
        form.append('longitude', farmerForm.longitude);

        if (farmerForm.logo) {
          form.append('logo', {
            uri: farmerForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerFarmerProducer(form);

      } else if (isFarmerConsumer) {
        if (farmerForm.password !== farmerForm.confirmPassword) {
          setFormError('Passwords do not match. Please re-enter.');
          return;
        }

        if (!farmerForm.latitude?.trim() || !farmerForm.longitude?.trim()) {
          setFormError('Please set your farm location before creating your account.');
          setCurrentStep(3);
          return;
        }

        form.append('firstName', farmerForm.firstName);
        form.append('lastName', farmerForm.lastName);
        form.append('email', farmerForm.email);
        form.append('password', farmerForm.password);
        form.append('mobile', farmerForm.mobile);
        form.append('farmName', farmerForm.businessName);
        form.append('businessName', farmerForm.businessName);
        form.append('address', farmerForm.businessAddress);
        form.append('brandName', farmerForm.branding);
        form.append('venueType', farmerForm.venueType);
        form.append('region', 'IN');
        form.append('latitude', farmerForm.latitude);
        form.append('longitude', farmerForm.longitude);

        if (farmerForm.logo) {
          form.append('logo', {
            uri: farmerForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerFarmerConsumer(form);

      } else {
        // Charity (single or multi)
        if (charityForm.password !== charityForm.confirmPassword) {
          setFormError('Passwords do not match. Please re-enter.');
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

      const emailForVerification = isFarmer
        ? farmerForm.email
        : isRestaurant
        ? restaurantForm.email
        : charityForm.email;

      navigation.navigate('EmailVerification', { email: emailForVerification });
    } catch (error: any) {
      const errMsg = error?.response?.data?.message;
      setFormError(
        Array.isArray(errMsg) ? errMsg.join('\n') : errMsg || 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  const stepTwoTitle = isRestaurant
    ? 'Business Details'
    : isFarmerProducer
    ? 'Farm Details'
    : isFarmerConsumer
    ? 'Organisation Details'
    : 'Charity Details';

  const stepThreeTitle = isRestaurant || isFarmer ? 'Venue Type' : 'Pickup Radius';

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

  const farmerVenueOptions = [
    { label: 'Farm', value: 'FARM' },
    { label: 'Produce / Market Garden', value: 'PRODUCE_MARKET_GARDEN' },
    { label: 'Livestock Farm', value: 'LIVESTOCK_FARM' },
    { label: 'Mixed Farm', value: 'MIXED_FARM' },
    { label: 'Orchard', value: 'ORCHARD' },
    { label: 'Processing / Packing Facility', value: 'PROCESSING_FACILITY' },
    { label: 'Other', value: 'OTHER' },
  ];

  return (
    <Screen backgroundColor={palette.creme}>
      <LocationSetupModal
        visible={showPlacesSearch}
        onClose={() => setShowPlacesSearch(false)}
        onConfirm={handleAuthLocationConfirm}
        searchPlaceholder={
          isRestaurant
            ? 'Search business address...'
            : isFarmer
            ? 'Search farm address...'
            : 'Search charity address...'
        }
      />

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
                value={isFarmer ? farmerForm.firstName : isRestaurant ? restaurantForm.firstName : charityForm.firstName}
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('firstName', v)
                    : isRestaurant
                    ? updateRestaurantField('firstName', v)
                    : updateCharityField('firstName', v)
                }
              />
              <InputField
                label="Last Name"
                placeholder="Enter last name"
                value={isFarmer ? farmerForm.lastName : isRestaurant ? restaurantForm.lastName : charityForm.lastName}
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('lastName', v)
                    : isRestaurant
                    ? updateRestaurantField('lastName', v)
                    : updateCharityField('lastName', v)
                }
              />

              <InputField
                label="Email"
                placeholder="Enter a valid email id"
                value={isFarmer ? farmerForm.email : isRestaurant ? restaurantForm.email : charityForm.email}
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('email', v)
                    : isRestaurant
                    ? updateRestaurantField('email', v)
                    : updateCharityField('email', v)
                }
              />

              <InputField
                label="Mobile"
                placeholder="Enter mobile"
                value={isFarmer ? farmerForm.mobile : isRestaurant ? restaurantForm.mobile : charityForm.mobile}
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('mobile', v)
                    : isRestaurant
                    ? updateRestaurantField('mobile', v)
                    : updateCharityField('mobile', v)
                }
              />
              <InputField
                label="Password"
                placeholder="Enter password"
                isPassword
                value={isFarmer ? farmerForm.password : isRestaurant ? restaurantForm.password : charityForm.password}
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('password', v)
                    : isRestaurant
                    ? updateRestaurantField('password', v)
                    : updateCharityField('password', v)
                }
              />
              <InputField
                label="Confirm Password"
                placeholder="Re-enter password"
                isPassword
                value={
                  isFarmer ? farmerForm.confirmPassword : isRestaurant ? restaurantForm.confirmPassword : charityForm.confirmPassword
                }
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('confirmPassword', v)
                    : isRestaurant
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
              ) : isFarmerProducer ? (
                <>
                  <InputField
                    label="Farm / Business Name"
                    placeholder="Enter farm or business name"
                    value={farmerForm.businessName}
                    onChangeText={(v) => updateFarmerField('businessName', v)}
                  />

                  <InputField
                    label="Farm Address"
                    placeholder="Enter farm address"
                    value={farmerForm.businessAddress}
                    onChangeText={(v) => updateFarmerField('businessAddress', v)}
                  />
                </>
              ) : isFarmerConsumer ? (
                <>
                  <InputField
                    label="Organisation / Farm Name"
                    placeholder="Enter organisation or farm name"
                    value={farmerForm.businessName}
                    onChangeText={(v) => updateFarmerField('businessName', v)}
                  />

                  <InputField
                    label="Farm Address"
                    placeholder="Enter farm address"
                    value={farmerForm.businessAddress}
                    onChangeText={(v) => updateFarmerField('businessAddress', v)}
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
                  isFarmer
                    ? farmerForm.branding
                    : isRestaurant
                    ? restaurantForm.branding || ''
                    : (charityForm as any).branding || ''
                }
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('branding', v)
                    : isRestaurant
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

              {/* BUSINESS / FARMER FLOW: venue type picker */}

              {(isRestaurant || isFarmer) ? (
                <>
                  <View style={styles.venueGrid}>
                    {(isFarmer ? farmerVenueOptions : venueOptions).map((venue) => {
                      const currentVenueType = isFarmer
                        ? farmerForm.venueType
                        : restaurantForm.venueType;
                      const isSelected = currentVenueType === venue.value;

                      return (
                        <Pressable
                          key={venue.value}
                          style={[
                            styles.venueCard,
                            isSelected && styles.venueCardSelected,
                          ]}
                          onPress={() =>
                            isFarmer
                              ? updateFarmerField('venueType', venue.value)
                              : updateRestaurantField('venueType', venue.value)
                          }
                        >
                          <View
                            style={[
                              styles.radioOuter,
                              isSelected && styles.radioOuterActive,
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

                  {/* Location picker for restaurant + farmer */}
                  {(isFarmer || isRestaurant) && (
                    <>
                      <AppText variant="caption" style={styles.locationHelpText}>
                        {isRestaurant
                          ? 'Set your business location so charities and collectors can find your surplus listings.'
                          : 'Set your farm location for better matching.'}
                      </AppText>

                      <View style={styles.locationPickerRow}>
                        <Pressable style={styles.locationPickerBtn} onPress={openLocationModal}>
                          <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
                          <AppText style={styles.locationPickerBtnText}>Use My Location</AppText>
                        </Pressable>

                        <Pressable style={[styles.locationPickerBtn, styles.locationPickerBtnSearch]} onPress={openLocationModal}>
                          <Ionicons name="search" size={normalize(16)} color={palette.white} />
                          <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]}>Search Address</AppText>
                        </Pressable>
                      </View>

                      {!!selectedAddress && (
                        <View style={styles.selectedAddressBox}>
                          <Ionicons name="checkmark-circle" size={normalize(18)} color={palette.middlegreen} />
                          <AppText style={styles.selectedAddressText} numberOfLines={2}>{selectedAddress}</AppText>
                          <Pressable onPress={clearSelectedLocation}>
                            <Ionicons name="close-circle" size={normalize(18)} color="#aaa" />
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}
                </>
              ) : (
                /* CHARITY FLOW: postcode, pickup radius, location */
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
                    onChangeText={(v) => updateCharityField('pickupRadius', v)}
                  />

                  <AppText variant="caption" style={styles.locationHelpText}>
                    Set your charity's location for better pickup matching.
                    You can skip this and add it later from your dashboard.
                  </AppText>

                  <View style={styles.locationPickerRow}>
                    <Pressable style={styles.locationPickerBtn} onPress={openLocationModal}>
                      <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
                      <AppText style={styles.locationPickerBtnText}>Use My Location </AppText>
                    </Pressable>

                    <Pressable style={[styles.locationPickerBtn, styles.locationPickerBtnSearch]} onPress={openLocationModal}>
                      <Ionicons name="search" size={normalize(16)} color={palette.white} />
                      <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]}>Search Address</AppText>
                    </Pressable>
                  </View>

                  {!!selectedAddress && (
                    <View style={styles.selectedAddressBox}>
                      <Ionicons name="checkmark-circle" size={normalize(18)} color={palette.middlegreen} />
                      <AppText style={styles.selectedAddressText} numberOfLines={2}>{selectedAddress}</AppText>
                      <Pressable onPress={clearSelectedLocation}>
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

              {!!formError && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle-outline" size={normalize(16)} color={palette.validation} />
                  <AppText variant="bodySmall" style={styles.errorBannerText}>
                    {formError}
                  </AppText>
                </View>
              )}

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

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2),
    backgroundColor: '#FFF0EE',
    borderWidth: 1,
    borderColor: palette.validation,
    borderRadius: normalize(10),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
  },

  errorBannerText: {
    flex: 1,
    color: palette.validation,
    textTransform: 'none',
    lineHeight: normalize(18),
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