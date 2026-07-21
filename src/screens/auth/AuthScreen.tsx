import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Image,
  Dimensions,
  Platform,
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { pickSquareImage } from '@/utils/pickSquareImage';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '../../components/AppText';
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
import { COUNTRY_CODES, findCountryByIso, appendSignupMobileFields } from '@/data/countryCodes';
import type { CountryCode } from '@/data/countryCodes';
import { fetchCurrentLocation } from '@/utils/currentLocation';
import { resolveLocationDetails } from '@/utils/postcode';
import { getUserFriendlyErrorMessage, showErrorAlert } from '@/utils/apiError';
import { REGION_OPTIONS, getRegionLabel, appendSignupRegionAndCoordinates, isSelectableRegion } from '@/data/regions';
import type { Region } from '@/types';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { hp, normalize, wp } from '@/utils/responsive';
import { DEFAULT_PICKUP_RADIUS_KM } from '@/utils/authSession';

const { height } = Dimensions.get('window');

type NavProp = NativeStackNavigationProp<AuthStackParamList>;

function AuthContinueButton({
  label = 'CONTINUE',
  onPress,
  disabled = false,
}: {
  label?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.authContinueBtn, disabled && styles.authContinueBtnDisabled]}
    >
      <AppText variant="bodyBold" style={styles.authContinueText}>
        {label}
      </AppText>
      <Ionicons name="arrow-forward" size={normalize(18)} color={palette.white} />
    </Pressable>
  );
}

function TermsCheckbox({
  isChecked,
  onToggle,
}: {
  isChecked: boolean;
  onToggle: () => void;
}) {
  return (
    <View style={styles.checkboxContainer}>
      <Pressable
        style={[styles.checkbox, isChecked && styles.checkboxChecked]}
        onPress={onToggle}
      >
        {isChecked ? (
          <Ionicons name="checkmark" size={normalize(14)} color={palette.white} />
        ) : null}
      </Pressable>

      <AppText variant="bodySmall" style={styles.termsText}>
        By continuing, I agree to the Saveful for Business{' '}
        <AppText
          variant="bodySmall"
          style={styles.disclaimerLink}
          onPress={() => Linking.openURL('https://www.saveful.com/saveful-for-business-terms-conditions')}
        >
          Terms & Conditions
        </AppText>
        {' '}and{' '}
        <AppText
          variant="bodySmall"
          style={styles.disclaimerLink}
          onPress={() => Linking.openURL('https://www.saveful.com/privacy-policy')}
        >
          Privacy Policy
        </AppText>
        . We'll send you important updates - you can opt out any time.
      </AppText>
    </View>
  );
}

function RegionSelector({
  value,
  onChange,
}: {
  value: Region | '';
  onChange: (value: Region) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const displayLabel = value ? getRegionLabel(value) : 'Select your region';

  return (
    <View style={styles.regionSelectorWrap}>
      <AppText variant="label" style={styles.venueSelectorLabel}>
        Operating Region *
      </AppText>
      <AppText variant="bodySmall" style={styles.dropdownHint}>
        Surplus listings are only visible to charities and consumers registered in the same region.
      </AppText>

      <View style={[styles.venueSelectorBox, expanded && styles.venueSelectorBoxExpanded]}>
        <Pressable
          style={styles.venueSelectorHeader}
          onPress={() => setExpanded((prev) => !prev)}
        >
          <AppText
            variant="body1"
            style={[styles.venueSelectorValue, !value && styles.regionPlaceholderText]}
          >
            {displayLabel}
          </AppText>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={normalize(18)}
            color={palette.kale}
          />
        </Pressable>

        {expanded ? (
          <ScrollView
            style={styles.regionOptionsList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {REGION_OPTIONS.map((option) => {
              const isSelected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.venueOptionRow, isSelected && styles.venueOptionRowSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setExpanded(false);
                  }}
                >
                  <View style={[styles.venueRadio, isSelected && styles.venueRadioActive]}>
                    {isSelected ? <View style={styles.venueRadioInner} /> : null}
                  </View>
                  <View style={styles.regionOptionCopy}>
                    <AppText variant="body1" style={styles.venueOptionText}>
                      {option.label}
                    </AppText>
                    <AppText variant="bodySmall" style={styles.regionOptionDescription}>
                      {option.description}
                    </AppText>
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function VenueTypeSelector({
  label,
  value,
  options,
  onChange,
  optional = false,
}: {
  label: string;
  value: string;
  options: { label: string; value: string }[];
  onChange: (value: string) => void;
  optional?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const selectedOption = options.find((option) => option.value === value);
  const displayLabel = selectedOption?.label || (optional ? 'Select venue type (optional)' : 'Select venue type');

  return (
    <View style={styles.venueSelectorWrap}>
      <AppText variant="label" style={styles.venueSelectorLabel}>
        {label}
      </AppText>
      <AppText variant="bodySmall" style={styles.dropdownHint}>
        Please select the venue type that most reflects your organisation
      </AppText>

      <View style={[styles.venueSelectorBox, expanded && styles.venueSelectorBoxExpanded]}>
        <Pressable
          style={styles.venueSelectorHeader}
          onPress={() => setExpanded((prev) => !prev)}
        >
          <AppText variant="body1" style={styles.venueSelectorValue}>
            {displayLabel}
          </AppText>
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={normalize(18)}
            color={palette.kale}
          />
        </Pressable>

        {expanded ? (
          <ScrollView
            style={styles.venueOptionsList}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {options.map((option) => {
              const isSelected = value === option.value;
              return (
                <Pressable
                  key={option.value}
                  style={[styles.venueOptionRow, isSelected && styles.venueOptionRowSelected]}
                  onPress={() => {
                    onChange(option.value);
                    setExpanded(false);
                  }}
                >
                  <View style={[styles.venueRadio, isSelected && styles.venueRadioActive]}>
                    {isSelected ? <View style={styles.venueRadioInner} /> : null}
                  </View>
                  <AppText variant="body1" style={styles.venueOptionText}>
                    {option.label}
                  </AppText>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const inputPropsBase = { compact: false as const, labelVariant: 'label' as const };

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;
const FALLBACK_KEYBOARD_HEIGHT = Platform.OS === 'ios' ? 336 : 280;

function FormErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <View style={styles.errorBanner}>
      <Ionicons name="alert-circle-outline" size={normalize(16)} color={palette.validation} />
      <AppText variant="bodySmall" style={styles.errorBannerText}>
        {message}
      </AppText>
    </View>
  );
}

export function AuthScreen() {
  const insets = useSafeAreaInsets();
  useTransparentStatusBar('dark');

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
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const activeFieldRef = useRef<View | null>(null);
  const keyboardHeightRef = useRef(0);
  const keyboardVisibleRef = useRef(false);

  const scrollActiveFieldIntoView = useCallback(() => {
    const field = activeFieldRef.current;
    if (!field) return;

    requestAnimationFrame(() => {
      field.measureInWindow((_x, fieldY, _w, fieldH) => {
        const gap = hp(1.5);
        const activeKeyboardHeight =
          keyboardHeightRef.current || FALLBACK_KEYBOARD_HEIGHT;
        const visibleBottom = height - activeKeyboardHeight - gap;
        const fieldBottom = fieldY + fieldH;

        if (fieldBottom > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: scrollYRef.current + (fieldBottom - visibleBottom),
            animated: true,
          });
        }
      });
    });
  }, []);

  const handleFieldFocus = useCallback(
    (field: View) => {
      activeFieldRef.current = field;
      const shortDelay = Platform.OS === 'ios' ? 80 : 150;
      const longDelay = Platform.OS === 'ios' ? 320 : 420;
      setTimeout(scrollActiveFieldIntoView, shortDelay);
      setTimeout(scrollActiveFieldIntoView, longDelay);
    },
    [scrollActiveFieldIntoView],
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (event) => {
      keyboardVisibleRef.current = true;
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(scrollActiveFieldIntoView, Platform.OS === 'ios' ? 80 : 150);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardVisibleRef.current = false;
      keyboardHeightRef.current = 0;
      setKeyboardVisible(false);
      setKeyboardHeight(0);
      activeFieldRef.current = null;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollActiveFieldIntoView]);

  const inputProps = {
    ...inputPropsBase,
    onFieldFocus: handleFieldFocus,
  };

  const handleBack = () => {
    setFormError(null);
    if (currentStep === 3) {
      setCurrentStep(2);
    } else if (currentStep === 2) {
      setCurrentStep(1);
    } else {
      navigation.goBack();
    }
  };

  const [isChecked, setIsChecked] = useState(false);
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const [mobileFocused, setMobileFocused] = useState(false);
  const mobileFieldRef = useRef<View>(null);

  const openLocationModal = () => setShowPlacesSearch(true);

  const handleUseGpsLocation = async () => {
    if (gpsLoading) return;

    setGpsLoading(true);
    try {
      const location = await fetchCurrentLocation();
      if (!location) return;

      await handleAuthLocationConfirm(location);
    } finally {
      setGpsLoading(false);
    }
  };

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
      updateRestaurantField('businessAddress', addr);
    } else if (isFarmer) {
      updateFarmerField('businessAddress', addr);
    } else {
      updateCharityField('charityAddress', addr);
    }
  };

  const handleAuthLocationConfirm = async ({
    latitude,
    longitude,
    address,
    postcode,
  }: SelectedLocation) => {
    updateLocationCoords(String(latitude), String(longitude));
    updateLocationAddress(address);
    setSelectedAddress(address);

    const resolved =
      postcode?.trim()
        ? { address, postcode: postcode.trim() }
        : await resolveLocationDetails(latitude, longitude, { address, postcode });

    if (!isRestaurant && !isFarmer) {
      updateCharityField('postcodes', resolved.postcode);
    }

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
      updateCharityField('postcodes', '');
    }
  };

  const pickImage = async () => {
    try {
      const uri = await pickSquareImage();
      if (!uri) return;

      if (isFarmer) {
        updateFarmerField('logo', uri);
      } else if (isRestaurant) {
        updateRestaurantField('logo', uri);
      } else {
        updateCharityField('logo' as any, uri);
      }
    } catch (error: any) {
      showErrorAlert('Please try again.', 'Image selection failed');
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
    if (loading) return;
    setFormError(null);

    const step1Error = validateStep1();
    if (step1Error) {
      setFormError(step1Error);
      setCurrentStep(1);
      return;
    }

    const step2Error = validateStep2();
    if (step2Error) {
      setFormError(step2Error);
      setCurrentStep(2);
      return;
    }

    const step3Error = validateStep3();
    if (step3Error) {
      setFormError(step3Error);
      return;
    }

    try {
      setLoading(true);

      const form = new FormData();

      if (isRestaurant) {
        form.append('firstName', restaurantForm.firstName);
        form.append('lastName', restaurantForm.lastName);
        form.append('email', restaurantForm.email.trim().toLowerCase());
        form.append('password', restaurantForm.password);
        appendSignupMobileFields(form, restaurantForm);

        form.append('businessName', restaurantForm.businessName);
        form.append('businessAddress', restaurantForm.businessAddress.trim());
        form.append('registrationNumber', restaurantForm.registrationNumber);
        form.append('brandName', restaurantForm.branding);
        if (restaurantForm.venueType.trim()) {
          form.append('venueType', restaurantForm.venueType);
        }
        form.append('orgType', mapRole(selectedRole));
        appendSignupRegionAndCoordinates(
          form,
          restaurantForm.region,
          restaurantForm.latitude,
          restaurantForm.longitude,
        );

        if (restaurantForm.logo) {
          form.append('logo', {
            uri: restaurantForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerBusiness(form);

      } else if (isFarmerProducer) {
        form.append('firstName', farmerForm.firstName);
        form.append('lastName', farmerForm.lastName);
        form.append('email', farmerForm.email.trim().toLowerCase());
        form.append('password', farmerForm.password);
        appendSignupMobileFields(form, farmerForm, 'mobileNumber');

        form.append('businessName', farmerForm.businessName);
        form.append('businessAddress', farmerForm.businessAddress.trim());
        form.append('brandName', farmerForm.branding);
        form.append('orgType', 'FARMER_PRODUCER');
        if (farmerForm.venueType.trim()) {
          form.append('venueType', farmerForm.venueType);
        }
        appendSignupRegionAndCoordinates(
          form,
          farmerForm.region,
          farmerForm.latitude,
          farmerForm.longitude,
        );

        if (farmerForm.logo) {
          form.append('logo', {
            uri: farmerForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerFarmerProducer(form);

      } else if (isFarmerConsumer) {
        form.append('firstName', farmerForm.firstName);
        form.append('lastName', farmerForm.lastName);
        form.append('email', farmerForm.email.trim().toLowerCase());
        form.append('password', farmerForm.password);
        appendSignupMobileFields(form, farmerForm);

        form.append('farmName', farmerForm.businessName);
        form.append('businessName', farmerForm.businessName);
        form.append('address', farmerForm.businessAddress.trim());
        form.append('brandName', farmerForm.branding);
        if (farmerForm.venueType.trim()) {
          form.append('venueType', farmerForm.venueType);
        }
        appendSignupRegionAndCoordinates(
          form,
          farmerForm.region,
          farmerForm.latitude,
          farmerForm.longitude,
        );

        if (farmerForm.logo) {
          form.append('logo', {
            uri: farmerForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        // Farmer consumer DTO does not accept pickupRadiusKm.
        await authService.registerFarmerConsumer(form);

      } else {
        form.append('firstName', charityForm.firstName);
        form.append('lastName', charityForm.lastName);
        form.append('email', charityForm.email.trim().toLowerCase());
        form.append('password', charityForm.password);
        appendSignupMobileFields(form, charityForm);

        form.append('charityName', charityForm.charityName);
        form.append('charityAddress', charityForm.charityAddress.trim());
        form.append('registrationNumber', charityForm.registrationNumber);
        form.append('brandName', charityForm.branding);
        form.append('charityType', mapRole(selectedRole));
        form.append('pickupPostCode', charityForm.postcodes.trim());
        form.append('pickupRadiusKm', String(DEFAULT_PICKUP_RADIUS_KM));
        appendSignupRegionAndCoordinates(
          form,
          charityForm.region,
          charityForm.latitude,
          charityForm.longitude,
        );

        if (charityForm.logo) {
          form.append('logo', {
            uri: charityForm.logo,
            name: 'logo.jpg',
            type: 'image/jpeg',
          } as any);
        }

        await authService.registerCharity(form);
      }

      const emailForVerification = (isFarmer
        ? farmerForm.email
        : isRestaurant
        ? restaurantForm.email
        : charityForm.email).trim().toLowerCase();

      navigation.navigate('EmailVerification', { email: emailForVerification });
    } catch (error: unknown) {
      setFormError(
        getUserFriendlyErrorMessage(error, 'Something went wrong. Please try again.'),
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

  const stepThreeTitle = isRestaurant || isFarmer ? 'Venue & Region' : 'Pickup & Region';

  const venueOptions = [
    { label: 'Bakery', value: 'BAKERY' },
    { label: 'Cafe / Restaurant', value: 'CAFE_RESTAURANT' },
    { label: 'Caterer', value: 'CATERER' },
    { label: 'Catering Service', value: 'CATERING_SERVICE' },
    { label: 'Cloud Kitchen', value: 'CLOUD_KITCHEN' },
    { label: 'Food Truck', value: 'FOOD_TRUCK' },
    { label: 'Grocery Store', value: 'GROCERY_STORE' },
    { label: 'Hotel', value: 'HOTEL' },
    { label: 'Wedding Venue', value: 'WEDDING_VENUE' },
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

  const getPersonalForm = () => {
    if (isFarmer) return farmerForm;
    if (isRestaurant) return restaurantForm;
    return charityForm;
  };

  const getCurrentRegion = () => {
    if (isFarmer) return farmerForm.region;
    if (isRestaurant) return restaurantForm.region;
    return charityForm.region;
  };

  const updateRegionField = (value: Region) => {
    if (isFarmer) {
      updateFarmerField('region', value);
    } else if (isRestaurant) {
      updateRestaurantField('region', value);
    } else {
      updateCharityField('region', value);
    }
  };

  const updateMobileField = (field: 'mobile' | 'mobileCountryCode' | 'mobileCountryIso', value: string) => {
    if (isFarmer) {
      updateFarmerField(field, value);
    } else if (isRestaurant) {
      updateRestaurantField(field, value);
    } else {
      updateCharityField(field, value);
    }
  };

  const handleCountryChange = (country: CountryCode) => {
    updateMobileField('mobileCountryCode', country.dialCode);
    updateMobileField('mobileCountryIso', country.iso);
    setCountryPickerOpen(false);
  };

  const mobileCountryIso = isFarmer
    ? farmerForm.mobileCountryIso
    : isRestaurant
    ? restaurantForm.mobileCountryIso
    : charityForm.mobileCountryIso;

  const mobileNumber = isFarmer
    ? farmerForm.mobile
    : isRestaurant
    ? restaurantForm.mobile
    : charityForm.mobile;

  const selectedMobileCountry = findCountryByIso(mobileCountryIso) ?? COUNTRY_CODES[0];

  const validateStep1 = (): string | null => {
    const form = getPersonalForm();

    if (!form.firstName.trim()) return 'Please enter your first name.';
    if (!form.lastName.trim()) return 'Please enter your last name.';
    if (!form.email.trim()) return 'Please enter your email address.';
    if (!EMAIL_REGEX.test(form.email.trim())) return 'Please enter a valid email address.';
    if (!form.mobile.trim()) return 'Please enter your mobile number.';
    const digits = form.mobile.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) return 'Please enter a valid mobile number.';
    if (!form.password) return 'Please enter a password.';
    if (form.password.length < MIN_PASSWORD_LENGTH) {
      return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    if (!form.confirmPassword) return 'Please confirm your password.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match. Please re-enter.';

    return null;
  };

  const validateStep2 = (): string | null => {
    if (!isChecked) return 'Please accept the Terms & Conditions to continue.';

    if (isRestaurant) {
      if (!restaurantForm.businessName.trim()) return 'Please enter your business name.';
      if (!restaurantForm.businessAddress.trim()) return 'Please enter your business address.';
      if (!restaurantForm.registrationNumber.trim()) {
        return 'Please enter your business registration number.';
      }
      if (!restaurantForm.latitude.trim() || !restaurantForm.longitude.trim()) {
        return 'Please set your business location using Location Recommendation.';
      }
    } else if (isFarmer) {
      if (!farmerForm.businessName.trim()) return 'Please enter your farm or business name.';
      if (!farmerForm.businessAddress.trim()) return 'Please enter your farm address.';
      if (!farmerForm.latitude.trim() || !farmerForm.longitude.trim()) {
        return 'Please set your farm location using Location Recommendation.';
      }
    } else {
      if (!charityForm.charityName.trim()) return 'Please enter your charity name.';
      if (!charityForm.charityAddress.trim()) return 'Please enter your charity address.';
      if (!charityForm.registrationNumber.trim()) return 'Please enter your registration number.';
      if (!charityForm.latitude.trim() || !charityForm.longitude.trim()) {
        return 'Please set your charity location using Location Recommendation.';
      }
      if (!charityForm.postcodes.trim()) {
        return 'We could not detect a postcode from this pin. Search for a full address and try again.';
      }
    }

    return null;
  };

  const validateStep3 = (): string | null => {
    if (!isChecked) return 'Please accept the Terms & Conditions to continue.';

    if (!isSelectableRegion(getCurrentRegion())) {
      return 'Please select your operating region.';
    }

    if (isRestaurant && !restaurantForm.venueType.trim()) {
      return 'Please select a venue type.';
    }

    return null;
  };

  const handleContinueStep1 = () => {
    const error = validateStep1();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setCurrentStep(2);
  };

  const handleContinueStep2 = () => {
    const error = validateStep2();
    if (error) {
      setFormError(error);
      return;
    }
    setFormError(null);
    setCurrentStep(3);
  };

  const renderLocationRecommendationSection = () => (
    <View style={styles.locationRecommendationSection}>
      <AppText variant="label" style={styles.locationRecommendationTitle}>
        Location Recommendation
      </AppText>
      <AppText variant="bodySmall" style={styles.locationRecommendationText}>
        Verify your address with map search so collectors can find you when picking up.
      </AppText>

      <View style={styles.locationPickerRow}>
        <Pressable
          style={[styles.locationPickerBtn, gpsLoading && styles.locationPickerBtnDisabled]}
          onPress={handleUseGpsLocation}
          disabled={gpsLoading}
        >
          {gpsLoading ? (
            <ActivityIndicator size="small" color={palette.kale} />
          ) : (
            <Ionicons name="locate" size={normalize(14)} color={palette.kale} />
          )}
          <AppText style={styles.locationPickerBtnText}>
            {gpsLoading ? 'Getting location...' : 'Use My Location'}
          </AppText>
        </Pressable>

        <Pressable
          style={[styles.locationPickerBtn, styles.locationPickerBtnSearch]}
          onPress={openLocationModal}
        >
          <Ionicons name="search" size={normalize(14)} color={palette.white} />
          <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]}>
            Search Address
          </AppText>
        </Pressable>
      </View>

      {!!selectedAddress && (
        <View style={styles.selectedAddressBox}>
          <Ionicons name="checkmark-circle" size={normalize(16)} color={palette.middlegreen} />
          <AppText style={styles.selectedAddressText} numberOfLines={2}>
            {selectedAddress}
          </AppText>
          <Pressable onPress={clearSelectedLocation}>
            <Ionicons name="close-circle" size={normalize(16)} color="#aaa" />
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <View style={[styles.topAccent, { backgroundColor: palette.middlegreen }]} />
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

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
        enabled={keyboardVisible}
      >
        <ScrollView
          ref={scrollRef}
          scrollEnabled
          bounces
          nestedScrollEnabled
          contentContainerStyle={[
            styles.newContent,
            {
              paddingTop: insets.top + hp(1),
              paddingBottom: keyboardVisible
                ? keyboardHeight + hp(3)
                : hp(6),
            },
          ]}
          onScroll={(event) => {
            scrollYRef.current = event.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={keyboardVisible}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
        >
          <View style={styles.authContainer}>
            <Pressable style={styles.backRow} onPress={handleBack} hitSlop={8}>
              <Ionicons name="chevron-back" size={normalize(20)} color={palette.kale} />
              <AppText variant="bodyBold" style={styles.backRowText}>
                Back
              </AppText>
            </Pressable>

            <AppText variant="h6" style={styles.mainTitle}>
              Complete your profile
            </AppText>

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
              <InputField
                label="First Name"
                placeholder="Enter first name"
                {...inputProps}
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
                {...inputProps}
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
                placeholder="Enter email"
                {...inputProps}
                value={isFarmer ? farmerForm.email : isRestaurant ? restaurantForm.email : charityForm.email}
                onChangeText={(v) =>
                  isFarmer
                    ? updateFarmerField('email', v)
                    : isRestaurant
                    ? updateRestaurantField('email', v)
                    : updateCharityField('email', v)
                }
              />

              <View ref={mobileFieldRef} style={styles.mobileFieldWrap}>
                <AppText variant="label" style={styles.mobileLabel}>
                  Mobile
                </AppText>

                <View style={[styles.mobileInputRow, mobileFocused && styles.mobileInputRowFocused]}>
                  <Pressable
                    style={styles.countryCodeBtn}
                    onPress={() => setCountryPickerOpen((open) => !open)}
                  >
                    <AppText style={styles.countryFlag}>{selectedMobileCountry.flag}</AppText>
                    <AppText variant="bodyBold" style={styles.countryDialCode}>
                      {selectedMobileCountry.dialCode}
                    </AppText>
                    <Ionicons
                      name={countryPickerOpen ? 'chevron-up' : 'chevron-down'}
                      size={normalize(14)}
                      color={palette.stone}
                    />
                  </Pressable>

                  <TextInput
                    value={mobileNumber}
                    onChangeText={(v) => updateMobileField('mobile', v.replace(/[^\d]/g, ''))}
                    placeholder="Enter mobile number"
                    placeholderTextColor={palette.stone}
                    keyboardType="phone-pad"
                    textContentType="telephoneNumber"
                    returnKeyType="done"
                    maxLength={15}
                    style={styles.mobileTextInput}
                    onFocus={() => {
                      setMobileFocused(true);
                      setCountryPickerOpen(false);
                      if (mobileFieldRef.current) {
                        handleFieldFocus(mobileFieldRef.current);
                      }
                    }}
                    onBlur={() => setMobileFocused(false)}
                  />
                </View>

                {countryPickerOpen ? (
                  <View style={styles.countryListBox}>
                    <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {COUNTRY_CODES.map((country) => {
                        const isSelected = country.iso === selectedMobileCountry.iso;
                        return (
                          <Pressable
                            key={country.iso}
                            style={[styles.countryOptionRow, isSelected && styles.countryOptionRowSelected]}
                            onPress={() => handleCountryChange(country)}
                          >
                            <AppText style={styles.countryFlag}>{country.flag}</AppText>
                            <AppText variant="bodyBold" style={styles.countryOptionName}>
                              {country.name}
                            </AppText>
                            <AppText variant="bodySmall" style={styles.countryOptionCode}>
                              {country.dialCode}
                            </AppText>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : null}
              </View>
              <InputField
                label="Password"
                placeholder="Enter password"
                isPassword
                {...inputProps}
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
                {...inputProps}
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

              <FormErrorBanner message={formError} />

              <AuthContinueButton onPress={handleContinueStep1} />
            </View>
          )}

          {/* STEP 2 */}

          {currentStep === 2 && (
            <View style={styles.formCard}>
              {isRestaurant ? (
                <>
                  <InputField
                    label="Business Name"
                    placeholder="Enter business name"
                    {...inputProps}
                    value={restaurantForm.businessName}
                    onChangeText={(v) => updateRestaurantField('businessName', v)}
                  />

                  {renderLocationRecommendationSection()}

                  <InputField
                    label="Address"
                    placeholder="Enter address"
                    {...inputProps}
                    value={restaurantForm.businessAddress}
                    onChangeText={(v) => updateRestaurantField('businessAddress', v)}
                  />

                  <InputField
                    label="Business Registration number (eg ABN)"
                    placeholder="Enter number"
                    {...inputProps}
                    value={restaurantForm.registrationNumber}
                    onChangeText={(v) => updateRestaurantField('registrationNumber', v)}
                  />
                </>
              ) : isFarmerProducer ? (
                <>
                  <InputField
                    label="Farm / Business Name"
                    placeholder="Enter farm or business name"
                    {...inputProps}
                    value={farmerForm.businessName}
                    onChangeText={(v) => updateFarmerField('businessName', v)}
                  />

                  {renderLocationRecommendationSection()}

                  <InputField
                    label="Farm Address"
                    placeholder="Enter farm address"
                    {...inputProps}
                    value={farmerForm.businessAddress}
                    onChangeText={(v) => updateFarmerField('businessAddress', v)}
                  />
                </>
              ) : isFarmerConsumer ? (
                <>
                  <InputField
                    label="Organisation / Farm Name"
                    placeholder="Enter organisation or farm name"
                    {...inputProps}
                    value={farmerForm.businessName}
                    onChangeText={(v) => updateFarmerField('businessName', v)}
                  />

                  {renderLocationRecommendationSection()}

                  <InputField
                    label="Farm Address"
                    placeholder="Enter farm address"
                    {...inputProps}
                    value={farmerForm.businessAddress}
                    onChangeText={(v) => updateFarmerField('businessAddress', v)}
                  />
                </>
              ) : (
                <>
                  <InputField
                    label="Charity / Non Profit Name"
                    placeholder="Enter charity/non-profit name"
                    {...inputProps}
                    value={charityForm.charityName}
                    onChangeText={(v) => updateCharityField('charityName', v)}
                  />

                  {renderLocationRecommendationSection()}

                  <InputField
                    label="Address"
                    placeholder="Enter address"
                    {...inputProps}
                    value={charityForm.charityAddress}
                    onChangeText={(v) => updateCharityField('charityAddress', v)}
                  />
                  <InputField
                    label="Registration Number"
                    placeholder="Enter registration number"
                    {...inputProps}
                    value={charityForm.registrationNumber}
                    onChangeText={(v) => updateCharityField('registrationNumber', v)}
                  />

                  {charityForm.postcodes.trim() ? (
                    <View style={styles.autofilledPostcodeBox}>
                      <AppText variant="label" style={styles.autofilledPostcodeLabel}>
                        Postcode
                      </AppText>
                      <AppText variant="body1" style={styles.autofilledPostcodeValue}>
                        {charityForm.postcodes}
                      </AppText>
                      <AppText variant="bodySmall" style={styles.logoHint}>
                        Auto-filled from your map location
                      </AppText>
                    </View>
                  ) : null}
                </>
              )}

              <InputField
                label="Branding"
                placeholder="Brand name"
                optional
                {...inputProps}
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

              <View style={styles.logoSection}>
                <AppText variant="label" style={styles.logoLabel}>
                  Logo (optional)
                </AppText>
                <AppText variant="bodySmall" style={styles.logoHint}>
                  Centre your subject — the logo displays as a circle in the app
                </AppText>

                {!currentLogo ? (
                  <Pressable style={styles.uploadField} onPress={pickImage}>
                    <AppText variant="body1" style={styles.uploadPlaceholder}>
                      Upload
                    </AppText>
                  </Pressable>
                ) : (
                  <View style={styles.logoPreviewRow}>
                    <Image
                      source={{ uri: currentLogo }}
                      style={styles.logoPreviewImageSmall}
                      resizeMode="cover"
                    />
                    <View style={styles.logoPreviewActions}>
                      <Pressable style={styles.logoActionBtn} onPress={editLogo}>
                        <AppText variant="bodySmall" style={styles.logoActionText}>Change</AppText>
                      </Pressable>
                      <Pressable style={styles.logoActionBtn} onPress={removeLogo}>
                        <AppText variant="bodySmall" style={styles.logoActionText}>Remove</AppText>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              <TermsCheckbox isChecked={isChecked} onToggle={() => setIsChecked(!isChecked)} />

              <FormErrorBanner message={formError} />

              <AuthContinueButton
                disabled={!isChecked}
                onPress={handleContinueStep2}
              />
            </View>
          )}

          {/* STEP 3 */}

          {currentStep === 3 && (
            <View style={styles.formCard}>
              {isRestaurant || isFarmerProducer || isFarmerConsumer ? (
                <VenueTypeSelector
                  label={
                    isRestaurant
                      ? 'Please select Venue Type'
                      : 'Please select Venue Type (optional)'
                  }
                  value={
                    isRestaurant ? restaurantForm.venueType : farmerForm.venueType
                  }
                  options={isRestaurant ? venueOptions : farmerVenueOptions}
                  optional={!isRestaurant}
                  onChange={(v) =>
                    isRestaurant
                      ? updateRestaurantField('venueType', v)
                      : updateFarmerField('venueType', v)
                  }
                />
              ) : (
                <>
                  <InputField
                    label="Pickup Radius (km)"
                    {...inputProps}
                    value={String(DEFAULT_PICKUP_RADIUS_KM)}
                    editable={false}
                  />
                  <AppText variant="bodySmall" style={styles.logoHint}>
                    Fixed at {DEFAULT_PICKUP_RADIUS_KM} km for now for ease of operations.
                  </AppText>
                </>
              )}

              <RegionSelector
                value={getCurrentRegion()}
                onChange={updateRegionField}
              />

              <View style={styles.regionInfoBanner}>
                <Ionicons name="information-circle-outline" size={normalize(18)} color={palette.kale} />
                <AppText variant="bodySmall" style={styles.regionInfoText}>
                  Surplus will only be shown to charities and consumers registered in the same region.
                  Pick the region where your organisation operates.
                </AppText>
              </View>

              <FormErrorBanner message={formError} />

              <AuthContinueButton
                label={loading ? 'CREATING...' : 'CREATE ACCOUNT'}
                disabled={!isChecked || loading}
                onPress={handleRegister}
              />

              {isRestaurant ? (
                <AppText variant="bodySmall" style={styles.tip}>
                  No payment required to get started
                </AppText>
              ) : null}
            </View>
          )}

        </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardView: {
    flex: 1,
  },
  topAccent: {
    width: '100%',
    height: hp(0.35),
  },
  authContinueBtn: {
    marginTop: hp(1),
    minHeight: normalize(48),
    borderRadius: normalize(10),
    backgroundColor: palette.kale,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: wp(2),
    paddingHorizontal: wp(4),
  },

  authContinueBtnDisabled: {
    opacity: 0.5,
  },

  authContinueText: {
    color: palette.white,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontSize: normalize(15),
  },

  mobileFieldWrap: {
    gap: spacing.xs,
  },

  mobileLabel: {
    textTransform: 'none',
    color: palette.black,
    fontSize: normalize(14),
  },

  mobileInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: normalize(48),
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    overflow: 'hidden',
  },

  mobileInputRowFocused: {
    borderColor: palette.primary,
  },

  countryCodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(1),
    paddingHorizontal: wp(2.5),
    borderRightWidth: 1,
    borderRightColor: '#E8E8E8',
    height: '100%',
    justifyContent: 'center',
  },

  countryFlag: {
    fontSize: normalize(18),
  },

  countryDialCode: {
    fontSize: normalize(15),
    color: palette.black,
    textTransform: 'none',
  },

  mobileTextInput: {
    flex: 1,
    paddingHorizontal: wp(3.5),
    fontSize: normalize(15),
    color: palette.text,
  },

  countryListBox: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    maxHeight: hp(22),
    overflow: 'hidden',
  },

  countryOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EFEFEF',
  },

  countryOptionRowSelected: {
    backgroundColor: '#F4FAF6',
  },

  countryOptionName: {
    flex: 1,
    textTransform: 'none',
    color: palette.black,
    fontSize: normalize(13),
  },

  countryOptionCode: {
    textTransform: 'none',
    color: palette.stone,
  },

  regionSelectorWrap: {
    gap: hp(0.5),
  },

  regionPlaceholderText: {
    color: palette.stone,
  },

  regionOptionsList: {
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },

  regionOptionCopy: {
    flex: 1,
    gap: hp(0.2),
  },

  regionOptionDescription: {
    color: palette.stone,
    textTransform: 'none',
    lineHeight: normalize(16),
  },

  regionInfoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
    paddingHorizontal: wp(3),
    paddingVertical: hp(1.2),
    borderRadius: normalize(10),
    backgroundColor: '#F4FAF6',
    borderWidth: 1,
    borderColor: '#D8EBDD',
  },

  regionInfoText: {
    flex: 1,
    color: palette.text,
    textTransform: 'none',
    lineHeight: normalize(18),
  },

  venueSelectorWrap: {
    gap: hp(0.5),
  },

  venueSelectorLabel: {
    color: palette.black,
    textTransform: 'none',
    fontSize: normalize(14),
  },

  venueSelectorBox: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    overflow: 'hidden',
  },

  venueSelectorBoxExpanded: {
    minHeight: normalize(44),
  },

  venueSelectorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.25),
    minHeight: normalize(48),
  },

  venueSelectorValue: {
    flex: 1,
    color: palette.black,
    textTransform: 'none',
    paddingRight: wp(2),
    fontSize: normalize(15),
    lineHeight: normalize(21),
  },

  venueOptionsList: {
    maxHeight: hp(28),
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
  },

  venueOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(2.5),
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.15),
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
  },

  venueOptionRowSelected: {
    backgroundColor: '#F7FAF7',
  },

  venueRadio: {
    width: normalize(18),
    height: normalize(18),
    borderRadius: normalize(9),
    borderWidth: 2,
    borderColor: '#C8C8C8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  venueRadioActive: {
    borderColor: palette.kale,
  },

  venueRadioInner: {
    width: normalize(8),
    height: normalize(8),
    borderRadius: normalize(4),
    backgroundColor: palette.kale,
  },

  venueOptionText: {
    flex: 1,
    color: palette.black,
    textTransform: 'none',
    fontSize: normalize(15),
    lineHeight: normalize(21),
  },

  dropdownHint: {
    color: palette.stone,
    textTransform: 'none',
    fontSize: normalize(13),
    lineHeight: normalize(18),
    marginBottom: hp(0.4),
  },

  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: wp(0.5),
    marginBottom: hp(1),
    paddingVertical: hp(0.3),
  },

  backRowText: {
    color: palette.kale,
    textTransform: 'none',
    fontSize: normalize(15),
  },

  logoLabel: {
    color: palette.black,
    textTransform: 'none',
  },

  logoHint: {
    color: palette.stone,
    lineHeight: normalize(16),
  },

  autofilledPostcodeBox: {
    gap: hp(0.35),
  },

  autofilledPostcodeLabel: {
    color: palette.black,
    textTransform: 'none',
    fontSize: normalize(14),
  },

  autofilledPostcodeValue: {
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: normalize(10),
    backgroundColor: '#F4FAF6',
    paddingHorizontal: wp(3.5),
    paddingVertical: hp(1.2),
    color: palette.kale,
    fontSize: normalize(15),
    textTransform: 'none',
  },

  uploadField: {
    minHeight: normalize(44),
    borderWidth: 1,
    borderColor: '#D9D9D9',
    borderRadius: normalize(10),
    backgroundColor: palette.white,
    justifyContent: 'center',
    paddingHorizontal: wp(3.5),
  },

  uploadPlaceholder: {
    color: palette.stone,
    textTransform: 'none',
  },

  logoPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: wp(3),
  },

  logoPreviewImageSmall: {
    width: normalize(44),
    height: normalize(44),
    borderRadius: normalize(22),
  },

  logoPreviewActions: {
    flexDirection: 'row',
    gap: wp(3),
  },

  logoActionBtn: {
    paddingVertical: hp(0.4),
  },

  logoActionText: {
    color: palette.kale,
    textTransform: 'none',
  },

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

  checkbox: {
    width: normalize(20),
    height: normalize(20),
    borderWidth: 1.5,
    borderColor: palette.kale,
    borderRadius: normalize(4),
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    flexShrink: 0,
  },

  checkboxChecked: {
    backgroundColor: palette.kale,
    borderColor: palette.kale,
  },

  locationRecommendationSection: {
    gap: hp(0.8),
    marginTop: hp(0.5),
    padding: wp(3),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.strokecream,
    backgroundColor: palette.white,
  },

  locationRecommendationTitle: {
    color: palette.kale,
  },

  locationRecommendationText: {
    opacity: 0.75,
    lineHeight: normalize(18),
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
    gap: normalize(4),
    paddingVertical: normalize(10),
    paddingHorizontal: normalize(8),
    borderRadius: normalize(10),
    borderWidth: 1,
    borderColor: palette.kale,
    backgroundColor: palette.white,
  },

  locationPickerBtnDisabled: {
    opacity: 0.7,
  },

  locationPickerBtnSearch: {
    backgroundColor: palette.kale,
    borderColor: palette.kale,
  },

  locationPickerBtnText: {
    fontSize: normalize(12),
    color: palette.kale,
    fontWeight: '600',
    textTransform: 'none',
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
    paddingHorizontal: wp(4.5),
    paddingBottom: hp(4),
    flexGrow: 1,
  },

  authContainer: {
    gap: hp(1.2),
  },

  mainTitle: {
    fontSize: normalize(22),
    lineHeight: normalize(28),
    textAlign: 'center',
    color: palette.black,
    textTransform: 'none',
    marginTop: hp(0.5),
  },

  stepperWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: hp(0.8),
    marginBottom: hp(1),
    paddingHorizontal: wp(1),
  },

  stepItem: {
    alignItems: 'center',
    width: wp(22),
  },

  stepCircle: {
    width: normalize(32),
    height: normalize(32),
    borderRadius: normalize(16),
    borderWidth: 2,
    borderColor: '#D9D9D9',
    backgroundColor: palette.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  stepCircleActive: {
    backgroundColor: palette.kale,
    borderColor: palette.kale,
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
    height: 2,
    backgroundColor: '#E2E2E2',
    marginTop: normalize(15),
  },

  stepLineActive: {
    backgroundColor: palette.kale,
  },

  formCard: {
    backgroundColor: palette.white,
    borderRadius: normalize(14),
    borderWidth: 1,
    borderColor: '#E8E8E8',
    paddingHorizontal: wp(4),
    paddingVertical: hp(1.8),
    gap: hp(1.1),
  },

  sectionTitle: {
    fontSize: normalize(22),
    lineHeight: normalize(30),
    color: palette.text,
    marginBottom: hp(1.5),
    paddingBottom: hp(0.3),
  },

  logoSection: {
    gap: hp(0.5),
  },

  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: wp(2.5),
    marginTop: hp(0.4),
  },

  termsText: {
    flex: 1,
    color: palette.black,
    lineHeight: normalize(18),
    textTransform: 'none',
    fontSize: normalize(12),
  },

  disclaimerLink: {
    color: palette.black,
    textDecorationLine: 'underline',
    fontSize: normalize(12),
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

});