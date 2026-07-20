import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  ScrollView,
  Pressable,
  StyleSheet,
  Alert,
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
import { fetchCurrentLocation, reverseGeocodeAddress } from '@/utils/currentLocation';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';

/** Matches AssignSiteManagerDto MinLength(8) in svforb sites.dto.ts */
const MIN_PASSWORD_LENGTH = 8;

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const inputProps = { compact: true as const, labelVariant: 'label' as const };

function validateManagerPassword(password: string, confirmPassword: string): string | null {
  if (!password) return 'Please enter a password.';
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!confirmPassword) return 'Please confirm the password.';
  if (password !== confirmPassword) return 'Passwords do not match.';
  return null;
}

function extractCreatedSiteId(res: any): number | null {
  const raw =
    res?.data?.site?.id ??
    res?.site?.id ??
    res?.data?.id ??
    res?.id ??
    null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
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
    setMapCenter({ latitude, longitude });
    setMarker({ latitude, longitude });
    setSiteForm((prev) => ({ ...prev, latitude, longitude }));

    if (address) {
      setSelectedAddress(address);
      setSiteForm((prev) => ({
        ...prev,
        address,
        postcode: postcode ?? prev.postcode,
      }));
      return;
    }

    const label = await reverseGeocodeAddress(latitude, longitude);
    setSelectedAddress(label);

    try {
      const places = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (places.length > 0) {
        setSiteForm((prev) => ({
          ...prev,
          address: label,
          postcode: places[0].postalCode || prev.postcode,
        }));
      } else {
        setSiteForm((prev) => ({ ...prev, address: label }));
      }
    } catch {
      setSiteForm((prev) => ({ ...prev, address: label }));
    }
  };

  const goToCurrentLocation = async () => {
    if (gpsLoading) return;
    setGpsLoading(true);
    try {
      const location = await fetchCurrentLocation();
      if (!location) return;
      await applyMapLocation(location.latitude, location.longitude, location.address);
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
    if (loading) return;

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

    if (
      !siteName.trim() ||
      !address.trim() ||
      !postcode.trim() ||
      !managerFirstName.trim() ||
      !managerLastName.trim() ||
      !adminEmail.trim() ||
      !adminPassword ||
      latitude == null ||
      longitude == null
    ) {
      Alert.alert('Error', 'Please fill all fields and set the site location on the map');
      return;
    }

    const passwordError = validateManagerPassword(adminPassword, adminConfirmPassword);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    setLoading(true);
    try {
      // CreateSiteDto: siteName, address, postcode, latitude, longitude only
      // https://github.com/appu900/svforb/blob/main/src/modules/sites/dto/sites.dto.ts
      const createRes = await createSite({
        siteName: siteName.trim(),
        address: address.trim(),
        postcode: postcode.trim(),
        latitude,
        longitude,
      });

      const siteId = extractCreatedSiteId(createRes);
      if (!siteId) {
        throw new Error('Site was created but the server response was missing an id');
      }

      await assignManager(siteId, {
        firstName: managerFirstName.trim(),
        lastName: managerLastName.trim(),
        email: adminEmail.trim().toLowerCase(),
        password: adminPassword,
        ...(adminMobile.trim() ? { phoneNumber: adminMobile.trim() } : {}),
      });

      showSuccessAlert(
        'Site and manager created. Login credentials were sent to the manager by email.',
        'Done',
        () => navigation.goBack(),
      );

      try {
        await fetchSitesWithManagers(true);
      } catch {
        // Non-fatal refresh after successful create.
      }
    } catch (err: unknown) {
      showErrorAlert(err, 'Could not create site', 'Failed to create site');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignManager = async () => {
    if (loading) return;

    if (!assignSiteId || !assignSite) {
      Alert.alert('Error', 'Could not find the selected site');
      return;
    }

    const { firstName, lastName, email, password, confirmPassword, phoneNumber } = managerForm;

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      Alert.alert('Error', 'Please fill all required manager fields');
      return;
    }

    const passwordError = validateManagerPassword(password, confirmPassword);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    setLoading(true);
    try {
      await assignManager(assignSiteId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
      });

      showSuccessAlert('Site manager assigned successfully', 'Done', () => navigation.goBack());

      try {
        await fetchSitesWithManagers(true);
      } catch {
        // Non-fatal refresh after successful assign.
      }
    } catch (err: unknown) {
      showErrorAlert(err, 'Could not assign manager', 'Failed to assign manager');
    } finally {
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
        onChangeText={(v) => onChange('firstName', v)}
      />
      <InputField
        label="Last name"
        placeholder="Enter last name"
        {...inputProps}
        value={values.lastName}
        onChangeText={(v) => onChange('lastName', v)}
      />
      <InputField
        label="Email"
        placeholder="Enter email"
        {...inputProps}
        value={values.email}
        onChangeText={(v) => onChange('email', v)}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <InputField
        label="Mobile"
        placeholder="Enter mobile number"
        {...inputProps}
        value={values.mobile}
        onChangeText={(v) => onChange('mobile', v)}
        keyboardType="phone-pad"
      />
      <InputField
        label="Password"
        placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
        {...inputProps}
        value={values.password}
        onChangeText={(v) => onChange('password', v)}
        isPassword
      />
      <InputField
        label="Confirm password"
        placeholder="Re-enter password"
        {...inputProps}
        value={values.confirmPassword}
        onChangeText={(v) => onChange('confirmPassword', v)}
        isPassword
      />
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
      keyboardVerticalOffset={normalize(20)}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
            keyboardShouldPersistTaps="always"
            contentContainerStyle={styles.scrollContent}
          >
            <StackHeroHeader
              title={isAssignMode ? 'Assign Site Manager' : 'Add Site'}
              subtitle={
                isAssignMode
                  ? 'Add a manager to an existing site'
                  : 'Set up the site, location, and manager in one step'
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
                        return;
                      }
                      setManagerForm({ ...managerForm, [key]: value });
                    },
                  )}

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

                <InputField
                  label="Site name"
                  placeholder="Enter site name"
                  {...inputProps}
                  value={siteForm.siteName}
                  onChangeText={(v) => setSiteForm({ ...siteForm, siteName: v })}
                />

                <InputField
                  label="Postcode"
                  placeholder="Enter postcode"
                  {...inputProps}
                  value={siteForm.postcode}
                  onChangeText={(v) => setSiteForm({ ...siteForm, postcode: v })}
                />

                {renderLocationSection()}

                <AppText variant="bodyBold" style={styles.sectionHeading}>
                  Site manager
                </AppText>
                <AppText variant="bodySmall" style={styles.sectionHint}>
                  A manager account is created with the site. They will receive login details by
                  email.
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

                <Pressable
                  style={[styles.createBtn, loading && { opacity: 0.65 }]}
                  disabled={loading}
                  onPress={handleCreateSiteAndManager}
                >
                  <AppText style={styles.btnText}>
                    {loading ? 'Creating site...' : 'Create site & manager'}
                  </AppText>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </Screen>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: hp(14),
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
