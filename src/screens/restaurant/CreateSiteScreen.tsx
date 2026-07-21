import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Dimensions,
  Modal,
  Animated,
  PanResponder,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Location from 'expo-location';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { OsmMapView } from '../../components/OsmMapView';
import { PlacesSearchInput } from '../../components/PlacesSearchInput';
import { StackHeroHeader } from '@/components/StackHeroHeader';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { useSitesStore } from '@/store/sitesStore';
import { InputField } from '@/components/InputField';
import { Skeleton } from '@/components/Skeleton';
import { fetchCurrentLocation } from '@/utils/currentLocation';
import { resolveLocationDetails } from '@/utils/postcode';
import { getUserFriendlyErrorMessage, showSuccessAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';

/** Matches AssignSiteManagerDto MinLength(8) in svforb sites.dto.ts */
const MIN_PASSWORD_LENGTH = 8;

type FieldKey =
  | 'siteName'
  | 'postcode'
  | 'address'
  | 'firstName'
  | 'lastName'
  | 'email'
  | 'mobile'
  | 'password'
  | 'confirmPassword';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const inputPropsBase = { compact: true as const, labelVariant: 'label' as const };
const FALLBACK_KEYBOARD_HEIGHT = Platform.OS === 'ios' ? 336 : 280;

function validateManagerPassword(
  password: string,
  confirmPassword: string,
): Partial<Record<'password' | 'confirmPassword', string>> {
  const errors: Partial<Record<'password' | 'confirmPassword', string>> = {};
  if (!password) {
    errors.password = 'Please enter a password.';
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!confirmPassword) {
    errors.confirmPassword = 'Please confirm the password.';
  } else if (password && password !== confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.';
  }
  return errors;
}

function extractCreatedSiteId(res: any): number | null {
  // Axios returns { data: <body> }; body shapes vary by API version.
  const candidates = [
    res?.data?.site?.id,
    res?.data?.data?.site?.id,
    res?.data?.data?.id,
    res?.data?.id,
    res?.site?.id,
    res?.id,
  ];
  for (const raw of candidates) {
    const id = Number(raw);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

export default function CreateSiteScreen() {
  useTransparentStatusBar('light');
  const navigation = useNavigation();
  const route = useRoute<any>();
  const isAssignMode = route.params?.mode === 'manager';
  const assignSiteId = route.params?.siteId ?? null;

  const {
    sites: storeSites,
    sitesWithManagers,
    fetchOrganisation,
    fetchSitesWithManagers,
    createSite,
    assignManager,
    isFetchingManagers,
  } = useSitesStore();

  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  /**
   * After createSite succeeds, we keep this id for the rest of the screen session.
   * Any later submit only calls assignManager — createSite is never called twice.
   */
  const [createdSiteId, setCreatedSiteId] = useState<number | null>(null);
  const createdSiteIdRef = useRef<number | null>(null);
  const submittingRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const scrollYRef = useRef(0);
  const activeFieldRef = useRef<View | null>(null);
  const keyboardHeightRef = useRef(0);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const locationAlreadyCreated = createdSiteId != null;

  const scrollActiveFieldIntoView = useCallback(() => {
    const field = activeFieldRef.current;
    if (!field) return;

    requestAnimationFrame(() => {
      field.measureInWindow((_x, fieldY, _w, fieldH) => {
        const gap = hp(2);
        const activeKeyboardHeight = keyboardHeightRef.current || FALLBACK_KEYBOARD_HEIGHT;
        const visibleBottom = height - activeKeyboardHeight - gap;
        const fieldBottom = fieldY + fieldH;

        if (fieldBottom > visibleBottom) {
          scrollRef.current?.scrollTo({
            y: Math.max(0, scrollYRef.current + (fieldBottom - visibleBottom)),
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
      keyboardHeightRef.current = event.endCoordinates.height;
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
      setTimeout(scrollActiveFieldIntoView, Platform.OS === 'ios' ? 80 : 150);
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
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

  const clearFieldError = (key: FieldKey) => {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    if (formError) setFormError(null);
  };

  const renderFieldError = (key: FieldKey) =>
    fieldErrors[key] ? (
      <AppText variant="caption" color={palette.danger} style={styles.inlineError}>
        {fieldErrors[key]}
      </AppText>
    ) : null;

  const assignSite = useMemo(() => {
    if (!assignSiteId) return null;
    const fromManagers = sitesWithManagers.find((s) => s.id === assignSiteId);
    if (fromManagers) {
      return {
        id: fromManagers.id,
        siteName: fromManagers.tradingName,
        address: fromManagers.address,
      };
    }
    const fromSites = storeSites.find((s: any) => Number(s.id) === Number(assignSiteId));
    if (fromSites) {
      return {
        id: Number(fromSites.id),
        siteName: fromSites.siteName || fromSites.organisationName || `Site ${fromSites.id}`,
        address: fromSites.address || '',
      };
    }
    return null;
  }, [assignSiteId, sitesWithManagers, storeSites]);

  const [mapCenter, setMapCenter] = useState<{ latitude: number; longitude: number } | null>(null);
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedAddress, setSelectedAddress] = useState('');
  const [showPlacesSearch, setShowPlacesSearch] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const MODAL_HEIGHT = height * 0.72;
  const slideAnim = useRef(new Animated.Value(height * 0.72)).current;

  const openModal = () => {
    slideAnim.setValue(MODAL_HEIGHT);
    setShowPlacesSearch(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const closeModal = () => {
    Keyboard.dismiss();
    Animated.timing(slideAnim, {
      toValue: MODAL_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setShowPlacesSearch(false));
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
          Animated.timing(slideAnim, {
            toValue: MODAL_HEIGHT,
            duration: 250,
            useNativeDriver: true,
          }).start(() => setShowPlacesSearch(false));
        } else {
          Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true }).start();
        }
      },
    }),
  ).current;

  const [siteForm, setSiteForm] = useState({
    siteName: '',
    address: '',
    postcode: '',
    managerFirstName: '',
    managerLastName: '',
    adminEmail: '',
    adminMobile: '',
    adminPassword: '',
    adminConfirmPassword: '',
    latitude: null as number | null,
    longitude: null as number | null,
  });

  const [managerForm, setManagerForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });

  const applyMapLocation = async (
    latitude: number,
    longitude: number,
    address?: string,
    postcode?: string,
  ) => {
    clearFieldError('address');
    setMapCenter({ latitude, longitude });
    setMarker({ latitude, longitude });

    const resolved = await resolveLocationDetails(latitude, longitude, { address, postcode });
    setSelectedAddress(resolved.address);
    setSiteForm((prev) => ({
      ...prev,
      latitude,
      longitude,
      address: resolved.address,
      postcode: resolved.postcode,
    }));
  };

  const goToCurrentLocation = async () => {
    if (gpsLoading) return;
    setGpsLoading(true);
    try {
      const location = await fetchCurrentLocation();
      if (!location) return;
      await applyMapLocation(
        location.latitude,
        location.longitude,
        location.address,
        location.postcode,
      );
    } finally {
      setGpsLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganisation().catch(() => {});
    if (isAssignMode) {
      fetchSitesWithManagers(true).catch(() => {});
    }
  }, [fetchOrganisation, fetchSitesWithManagers, isAssignMode]);

  useEffect(() => {
    if (isAssignMode) return;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setMapCenter({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });
      } else {
        setMapCenter({
          latitude: 20.5937,
          longitude: 78.9629,
        });
      }
    })();
  }, [isAssignMode]);

  const handleCreateSiteAndManager = async () => {
    if (loading || submittingRef.current) return;

    const {
      siteName,
      address,
      postcode,
      managerFirstName,
      managerLastName,
      adminEmail,
      adminMobile,
      adminPassword,
      adminConfirmPassword,
      latitude,
      longitude,
    } = siteForm;

    const alreadyCreatedId = createdSiteIdRef.current;
    const nextErrors: Partial<Record<FieldKey, string>> = {};

    // Location step already done — only validate manager fields for retry.
    if (!alreadyCreatedId) {
      if (!siteName.trim()) nextErrors.siteName = 'Please enter a site name.';
      if (!address.trim() || latitude == null || longitude == null) {
        nextErrors.address = 'Please set the site location on the map.';
      } else if (!postcode.trim()) {
        nextErrors.address =
          'We could not detect a postcode from this pin. Search for a full address and try again.';
      }
    }
    if (!managerFirstName.trim()) nextErrors.firstName = 'Please enter a first name.';
    if (!managerLastName.trim()) nextErrors.lastName = 'Please enter a last name.';
    if (!adminEmail.trim()) nextErrors.email = 'Please enter an email.';
    Object.assign(nextErrors, validateManagerPassword(adminPassword, adminConfirmPassword));

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }

    setFieldErrors({});
    setFormError(null);
    submittingRef.current = true;
    setLoading(true);

    try {
      let siteId = alreadyCreatedId;

      // Step 1 — create location at most once per screen session.
      if (!siteId) {
        const createRes = await createSite({
          siteName: siteName.trim(),
          address: address.trim(),
          postcode: postcode.trim(),
          latitude: latitude!,
          longitude: longitude!,
        });

        siteId = extractCreatedSiteId(createRes);
        if (!siteId) {
          throw new Error('Location was created but the server response was missing an id');
        }

        // Lock immediately so any later failure / retry never creates again.
        createdSiteIdRef.current = siteId;
        setCreatedSiteId(siteId);
      }

      // Step 2 — assign manager (safe to retry).
      await assignManager(siteId, {
        firstName: managerFirstName.trim(),
        lastName: managerLastName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
        ...(adminMobile.trim() ? { phoneNumber: adminMobile.trim() } : {}),
      });

      showSuccessAlert(
        'Location and manager created. We emailed the manager their login email and password.',
        'Done',
        () => navigation.goBack(),
      );

      try {
        await fetchSitesWithManagers(true);
      } catch {
        // Non-fatal refresh after successful create.
      }
    } catch (err: unknown) {
      if (createdSiteIdRef.current) {
        try {
          await fetchSitesWithManagers(true);
        } catch {
          // ignore
        }
        setFormError(
          `${getUserFriendlyErrorMessage(err, 'Manager could not be assigned.')} Location is already saved. Fix the manager details below and tap Assign manager — the location will not be created again.`,
        );
      } else {
        setFormError(getUserFriendlyErrorMessage(err, 'Could not add location. Please try again.'));
      }
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const handleAssignManager = async () => {
    if (loading || submittingRef.current) return;

    if (!assignSiteId || !assignSite) {
      setFormError('Could not find the selected site.');
      return;
    }

    const { firstName, lastName, email, password, confirmPassword, phoneNumber } = managerForm;

    const nextErrors: Partial<Record<FieldKey, string>> = {};
    if (!firstName.trim()) nextErrors.firstName = 'Please enter a first name.';
    if (!lastName.trim()) nextErrors.lastName = 'Please enter a last name.';
    if (!email.trim()) nextErrors.email = 'Please enter an email.';
    Object.assign(nextErrors, validateManagerPassword(password, confirmPassword));

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors);
      setFormError('Please fix the highlighted fields and try again.');
      return;
    }

    setFieldErrors({});
    setFormError(null);
    submittingRef.current = true;
    setLoading(true);
    try {
      await assignManager(assignSiteId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
      });

      showSuccessAlert(
        'Site manager assigned. We emailed them their login email and password.',
        'Done',
        () => navigation.goBack(),
      );

      try {
        await fetchSitesWithManagers(true);
      } catch {
        // Non-fatal refresh after successful assign.
      }
    } catch (err: unknown) {
      setFormError(getUserFriendlyErrorMessage(err, 'Could not assign manager. Please try again.'));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  const renderLocationSection = () => (
    <>
      <AppText variant="bodyBold" style={styles.sectionHeading}>
        Site location
      </AppText>
      <AppText variant="bodySmall" style={styles.sectionHint}>
        Search or drop a pin so collections can find this site.
      </AppText>

      <View style={styles.locationPickerRow}>
        <Pressable
          style={[styles.locationPickerBtn, gpsLoading && styles.locationPickerBtnDisabled]}
          onPress={goToCurrentLocation}
          disabled={gpsLoading}
        >
          <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
          <AppText style={styles.locationPickerBtnText}>
            {gpsLoading ? 'Getting location...' : 'Use my location'}
          </AppText>
        </Pressable>
        <Pressable style={[styles.locationPickerBtn, styles.locationPickerBtnSearch]} onPress={openModal}>
          <Ionicons name="search" size={normalize(16)} color={palette.white} />
          <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]}>
            Search address
          </AppText>
        </Pressable>
      </View>

      {selectedAddress ? (
        <View style={styles.selectedAddressBox}>
          <Ionicons name="location" size={normalize(16)} color={palette.primary} />
          <AppText style={styles.selectedAddressText} numberOfLines={2}>
            {selectedAddress}
          </AppText>
          <Pressable
            onPress={() => {
              setSelectedAddress('');
              setMarker(null);
              setSiteForm((prev) => ({
                ...prev,
                latitude: null,
                longitude: null,
                address: '',
                postcode: '',
              }));
            }}
          >
            <Ionicons name="close-circle" size={normalize(18)} color="#aaa" />
          </Pressable>
        </View>
      ) : null}
      {siteForm.postcode ? (
        <AppText variant="caption" style={styles.mapHintText}>
          Postcode auto-filled: {siteForm.postcode}
        </AppText>
      ) : null}
      {renderFieldError('address')}

      <AppText style={styles.mapHintText}>Tap the map to fine-tune the pin</AppText>

      <View style={styles.mapContainer}>
        <OsmMapView
          style={styles.mapView}
          marker={marker}
          selectable
          initialCenter={mapCenter ?? undefined}
          onLocationSelect={(latitude, longitude) => {
            applyMapLocation(latitude, longitude);
          }}
        />
      </View>
    </>
  );

  const renderManagerFields = (
    values: {
      firstName: string;
      lastName: string;
      email: string;
      mobile: string;
      password: string;
      confirmPassword: string;
    },
    onChange: (key: string, value: string) => void,
  ) => (
    <>
      <InputField
        label="First name"
        placeholder="Enter first name"
        {...inputProps}
        value={values.firstName}
        onChangeText={(v) => {
          clearFieldError('firstName');
          onChange('firstName', v);
        }}
      />
      {renderFieldError('firstName')}
      <InputField
        label="Last name"
        placeholder="Enter last name"
        {...inputProps}
        value={values.lastName}
        onChangeText={(v) => {
          clearFieldError('lastName');
          onChange('lastName', v);
        }}
      />
      {renderFieldError('lastName')}
      <InputField
        label="Email"
        placeholder="Enter email"
        {...inputProps}
        value={values.email}
        onChangeText={(v) => {
          clearFieldError('email');
          onChange('email', v);
        }}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      {renderFieldError('email')}
      <InputField
        label="Mobile"
        placeholder="Enter mobile number"
        {...inputProps}
        value={values.mobile}
        onChangeText={(v) => {
          clearFieldError('mobile');
          onChange('mobile', v);
        }}
        keyboardType="phone-pad"
      />
      {renderFieldError('mobile')}
      <InputField
        label="Password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        {...inputProps}
        value={values.password}
        onChangeText={(v) => {
          clearFieldError('password');
          onChange('password', v);
        }}
        isPassword
      />
      {renderFieldError('password')}
      <InputField
        label="Confirm password"
        placeholder="Re-enter password"
        {...inputProps}
        value={values.confirmPassword}
        onChangeText={(v) => {
          clearFieldError('confirmPassword');
          onChange('confirmPassword', v);
        }}
        isPassword
      />
      {renderFieldError('confirmPassword')}
    </>
  );

  const renderAssignSkeleton = () => (
    <View style={styles.formCard}>
      <Skeleton width="100%" height={normalize(72)} borderRadius={normalize(10)} />
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <Skeleton key={i} width="100%" height={normalize(44)} borderRadius={normalize(10)} />
      ))}
      <Skeleton width="100%" height={normalize(48)} borderRadius={normalize(10)} />
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? normalize(8) : 0}
    >
      <Screen backgroundColor={palette.creme} scrollable={false} transparentTop>
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
                      <AppText style={styles.modalTitle}>Set location</AppText>
                      <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                        <Ionicons name="close" size={normalize(22)} color={palette.text} />
                      </Pressable>
                    </View>

                    <View style={styles.modalSearchContainer}>
                      <PlacesSearchInput
                        placeholder="Search address or place..."
                        autoFocus
                        onPlaceSelected={({ latitude, longitude, address, postcode }) => {
                          applyMapLocation(latitude, longitude, address, postcode);
                          Keyboard.dismiss();
                        }}
                      />
                    </View>

                    <View style={styles.modalMapContainer}>
                      <OsmMapView
                        style={styles.mapView}
                        active={showPlacesSearch}
                        marker={marker}
                        selectable
                        initialCenter={mapCenter ?? undefined}
                        onLocationSelect={(latitude, longitude) => {
                          applyMapLocation(latitude, longitude);
                        }}
                      />
                    </View>

                    <Pressable
                      style={[styles.confirmBtn, !marker && styles.confirmBtnDisabled]}
                      onPress={closeModal}
                      disabled={!marker}
                    >
                      <AppText style={styles.confirmBtnText}>
                        {marker ? 'Confirm location' : 'Select a location on the map'}
                      </AppText>
                    </Pressable>
                  </Animated.View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </Modal>

          <ScrollView
            ref={scrollRef}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            onScroll={(event) => {
              scrollYRef.current = event.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingBottom: keyboardVisible ? keyboardHeight + hp(4) : hp(32),
              },
            ]}
          >
            <StackHeroHeader
              title={isAssignMode ? 'Assign Site Manager' : 'Add Location'}
              subtitle={
                isAssignMode
                  ? 'Add a manager to an existing location'
                  : 'Set up the location, map pin, and manager in one step'
              }
              height={hp(16)}
            />

            {isAssignMode ? (
              isFetchingManagers && !assignSite ? (
                renderAssignSkeleton()
              ) : (
                <View style={styles.formCard}>
                  <View style={styles.siteBanner}>
                    <AppText variant="label" style={styles.siteBannerLabel}>
                      Site
                    </AppText>
                    <AppText variant="bodyBold">
                      {assignSite?.siteName || 'Loading site...'}
                    </AppText>
                    {assignSite?.address ? (
                      <AppText variant="bodySmall" style={styles.sectionHint}>
                        {assignSite.address}
                      </AppText>
                    ) : null}
                  </View>

                  <AppText variant="bodyBold" style={styles.sectionHeading}>
                    Manager details
                  </AppText>
                  <AppText variant="bodySmall" style={styles.sectionHint}>
                    This person will manage listings and day-to-day operations for this site.
                  </AppText>

                  {renderManagerFields(
                    {
                      firstName: managerForm.firstName,
                      lastName: managerForm.lastName,
                      email: managerForm.email,
                      mobile: managerForm.phoneNumber,
                      password: managerForm.password,
                      confirmPassword: managerForm.confirmPassword,
                    },
                    (key, value) => {
                      if (key === 'mobile') {
                        setManagerForm({ ...managerForm, phoneNumber: value });
                      } else {
                        setManagerForm({ ...managerForm, [key]: value });
                      }
                    },
                  )}

                  {formError ? (
                    <AppText variant="caption" color={palette.danger} style={styles.formError}>
                      {formError}
                    </AppText>
                  ) : null}

                  <Pressable
                    style={[styles.createBtn, loading && { opacity: 0.65 }]}
                    disabled={loading || !assignSite}
                    onPress={handleAssignManager}
                  >
                    <AppText style={styles.btnText}>
                      {loading ? 'Assigning...' : 'Assign manager'}
                    </AppText>
                  </Pressable>
                </View>
              )
            ) : (
              <View style={styles.formCard}>
                <AppText variant="bodyBold" style={styles.sectionHeading}>
                  Site details
                </AppText>

                {locationAlreadyCreated ? (
                  <View style={styles.siteBanner}>
                    <AppText variant="label" style={styles.siteBannerLabel}>
                      Location saved
                    </AppText>
                    <AppText variant="bodyBold">{siteForm.siteName || 'New location'}</AppText>
                    {siteForm.address ? (
                      <AppText variant="bodySmall" style={styles.sectionHint}>
                        {siteForm.address}
                      </AppText>
                    ) : null}
                    <AppText variant="bodySmall" style={styles.sectionHint}>
                      Only the manager step is left. Fix any details below and assign again — this
                      will not create another location.
                    </AppText>
                  </View>
                ) : (
                  <>
                    <InputField
                      label="Site name"
                      placeholder="Enter site name"
                      {...inputProps}
                      value={siteForm.siteName}
                      onChangeText={(v) => {
                        clearFieldError('siteName');
                        setSiteForm({ ...siteForm, siteName: v });
                      }}
                    />
                    {renderFieldError('siteName')}

                    {renderLocationSection()}
                  </>
                )}

                <AppText variant="bodyBold" style={styles.sectionHeading}>
                  Site manager
                </AppText>
                <AppText variant="bodySmall" style={styles.sectionHint}>
                  {locationAlreadyCreated
                    ? 'Update manager details if needed, then tap Assign manager.'
                    : 'A manager account is created with this location. After you tap Add location, we email them their login email and password.'}
                </AppText>

                {renderManagerFields(
                  {
                    firstName: siteForm.managerFirstName,
                    lastName: siteForm.managerLastName,
                    email: siteForm.adminEmail,
                    mobile: siteForm.adminMobile,
                    password: siteForm.adminPassword,
                    confirmPassword: siteForm.adminConfirmPassword,
                  },
                  (key, value) => {
                    const map: Record<string, keyof typeof siteForm> = {
                      firstName: 'managerFirstName',
                      lastName: 'managerLastName',
                      email: 'adminEmail',
                      mobile: 'adminMobile',
                      password: 'adminPassword',
                      confirmPassword: 'adminConfirmPassword',
                    };
                    const field = map[key];
                    if (field) {
                      setSiteForm({ ...siteForm, [field]: value });
                    }
                  },
                )}

                {formError ? (
                  <AppText variant="caption" color={palette.danger} style={styles.formError}>
                    {formError}
                  </AppText>
                ) : null}

                <Pressable
                  style={[styles.createBtn, loading && { opacity: 0.65 }]}
                  disabled={loading}
                  onPress={handleCreateSiteAndManager}
                >
                  <AppText style={styles.btnText}>
                    {loading
                      ? locationAlreadyCreated
                        ? 'Assigning manager...'
                        : 'Adding location...'
                      : locationAlreadyCreated
                        ? 'Assign manager'
                        : 'Add location & manager'}
                  </AppText>
                </Pressable>
              </View>
            )}
          </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
  },
  inlineError: {
    marginTop: hp(-0.4),
    marginBottom: hp(0.2),
  },
  formError: {
    marginTop: hp(0.4),
    lineHeight: normalize(18),
  },
  formCard: {
    marginHorizontal: wp(4),
    marginBottom: hp(2),
    padding: wp(4),
    borderRadius: normalize(12),
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    gap: spacing.md,
  },
  siteBanner: {
    padding: wp(3.5),
    borderRadius: normalize(10),
    backgroundColor: '#F4FAF6',
    borderWidth: 1,
    borderColor: '#D8EBDF',
    gap: spacing.xs,
  },
  siteBannerLabel: {
    textTransform: 'none',
    color: palette.stone,
  },
  sectionHeading: {
    marginTop: hp(0.5),
  },
  sectionHint: {
    color: palette.stone,
  },
  createBtn: {
    backgroundColor: palette.middlegreen,
    padding: normalize(14),
    borderRadius: normalize(10),
    alignItems: 'center',
    marginTop: hp(0.5),
  },
  btnText: {
    color: palette.white,
    fontWeight: '600',
  },
  locationPickerRow: {
    flexDirection: 'row',
    gap: wp(2.5),
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
  locationPickerBtnDisabled: {
    opacity: 0.7,
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
  mapHintText: {
    textAlign: 'center',
    color: palette.stone,
    fontSize: normalize(12),
  },
  mapContainer: {
    height: hp(28),
    borderRadius: normalize(12),
    overflow: 'hidden',
  },
  mapView: {
    flex: 1,
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
    zIndex: 1000,
    elevation: 1000,
    position: 'relative',
  },
  modalMapContainer: {
    flex: 1,
    marginHorizontal: wp(4),
    marginBottom: normalize(4),
    borderRadius: normalize(12),
    overflow: 'hidden',
    zIndex: 1,
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
});
