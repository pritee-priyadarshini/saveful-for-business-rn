import React, { useState, useEffect, useRef, useMemo } from 'react';
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

import { CharityMemberRole } from '@/services/charity.service';
import { useCharityStore } from '@/store/charityStore';
import { fetchCurrentLocation, reverseGeocodeAddress } from '@/utils/currentLocation';
import { InputField } from '@/components/InputField';
import { Skeleton } from '@/components/Skeleton';
import { getUserFriendlyErrorMessage, showSuccessAlert } from '@/utils/apiError';
import { useTransparentStatusBar } from '@/hooks/useTransparentStatusBar';
import { DEFAULT_PICKUP_RADIUS_KM } from '@/utils/authSession';

const MIN_PASSWORD_LENGTH = 6;

type FieldKey =
    | 'locationName'
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

const inputProps = { compact: true as const, labelVariant: 'label' as const };

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

export default function CreateCharitySiteScreen() {
    useTransparentStatusBar('light');
    const navigation = useNavigation();
    const route = useRoute<any>();
    const isAssignMode = route.params?.mode === 'assign-manager';
    const assignSiteId = route.params?.siteId ?? route.params?.locationId ?? null;

    const {
        locations: storeLocations,
        fetchLocations,
        addLocation,
        addMember,
        isFetchingLocations,
    } = useCharityStore();

    const [loading, setLoading] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<Partial<Record<FieldKey, string>>>({});
    const [formError, setFormError] = useState<string | null>(null);
    const submittingRef = useRef(false);
    const scrollRef = useRef<ScrollView>(null);

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
    const locations = storeLocations;
    const assignSite = useMemo(
        () => locations.find((site) => site.id === assignSiteId) ?? null,
        [locations, assignSiteId],
    );

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
        }),
    ).current;

    const applyMapLocation = async (
        latitude: number,
        longitude: number,
        address?: string,
        postcode?: string,
    ) => {
        clearFieldError('address');
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

    const [siteForm, setSiteForm] = useState({
        locationName: '',
        address: '',
        postcode: '',
        managerFirstName: '',
        managerLastName: '',
        adminEmail: '',
        adminMobile: '',
        adminPassword: '',
        adminConfirmPassword: '',
        radiusKm: String(DEFAULT_PICKUP_RADIUS_KM),
        latitude: null as number | null,
        longitude: null as number | null,
    });

    const [managerForm, setManagerForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        mobile: '',
    });

    useEffect(() => {
        if (isAssignMode) {
            fetchLocations(true).catch(() => {});
        }
    }, [fetchLocations, isAssignMode]);

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

    const handleCreateLocation = async () => {
        if (loading || submittingRef.current) return;

        const {
            locationName,
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

        const nextErrors: Partial<Record<FieldKey, string>> = {};
        if (!locationName.trim()) nextErrors.locationName = 'Please enter a site name.';
        if (!postcode.trim()) nextErrors.postcode = 'Please enter a postcode.';
        if (!address.trim() || !latitude || !longitude) {
            nextErrors.address = 'Please set the site location on the map.';
        }
        if (!managerFirstName.trim()) nextErrors.firstName = 'Please enter a first name.';
        if (!managerLastName.trim()) nextErrors.lastName = 'Please enter a last name.';
        if (!adminEmail.trim()) nextErrors.email = 'Please enter an email.';
        if (!adminMobile.trim()) nextErrors.mobile = 'Please enter a mobile number.';
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
            await addLocation({
                locationName: locationName.trim(),
                address: address.trim(),
                postcode: postcode.trim(),
                adminContactName: `${managerFirstName.trim()} ${managerLastName.trim()}`,
                adminEmail: adminEmail.trim().toLowerCase(),
                adminMobile: adminMobile.trim(),
                adminPassword,
                radiusKm: DEFAULT_PICKUP_RADIUS_KM,
                latitude: latitude!,
                longitude: longitude!,
            });

            showSuccessAlert(
                'Location and manager created. We emailed the manager their login email and password.',
                'Done',
                () => navigation.goBack(),
            );

            try {
                await fetchLocations(true);
            } catch {
                // Non-fatal refresh after successful create.
            }
        } catch (err: unknown) {
            // Show the real API message inline — do not block by matching existing addresses.
            setFormError(getUserFriendlyErrorMessage(err, 'Could not add location. Please try again.'));
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

        const { firstName, lastName, email, password, confirmPassword, mobile } = managerForm;

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
            await addMember({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                email: email.trim().toLowerCase(),
                password,
                mobile: mobile.trim(),
                role: CharityMemberRole.LOCATION_ADMIN,
                locationId: assignSiteId,
                canClaimPickupsDirectly: true,
            });

            showSuccessAlert(
                'Site manager assigned. We emailed them their login email and password.',
                'Done',
                () => navigation.goBack(),
            );

            try {
                await fetchLocations(true);
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
                Search or drop a pin so charities and drivers can find this site.
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
                placeholder="Enter password"
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
            behavior="padding"
            keyboardVerticalOffset={Platform.OS === 'ios' ? normalize(12) : 0}
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
                                                placeholder="Search charity address or place..."
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
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                        contentContainerStyle={styles.scrollContent}
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
                            isFetchingLocations && !assignSite ? (
                                renderAssignSkeleton()
                            ) : (
                            <View style={styles.formCard}>
                                <View style={styles.siteBanner}>
                                    <AppText variant="label" style={styles.siteBannerLabel}>
                                        Site
                                    </AppText>
                                    <AppText variant="bodyBold">
                                        {assignSite?.locationName || 'Loading site...'}
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
                                    This person will manage pickups and day-to-day operations for this site.
                                </AppText>

                                {renderManagerFields(managerForm, (key, value) => {
                                    setManagerForm({ ...managerForm, [key]: value });
                                    if (key === 'password' || key === 'confirmPassword') {
                                        requestAnimationFrame(() => {
                                            scrollRef.current?.scrollToEnd({ animated: true });
                                        });
                                    }
                                })}

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

                                <InputField
                                    label="Site name"
                                    placeholder="Enter site name"
                                    {...inputProps}
                                    value={siteForm.locationName}
                                    onChangeText={(v) => {
                                        clearFieldError('locationName');
                                        setSiteForm({ ...siteForm, locationName: v });
                                    }}
                                />
                                {renderFieldError('locationName')}

                                <InputField
                                    label="Postcode"
                                    placeholder="Enter postcode"
                                    {...inputProps}
                                    value={siteForm.postcode}
                                    onChangeText={(v) => {
                                        clearFieldError('postcode');
                                        setSiteForm({ ...siteForm, postcode: v });
                                    }}
                                />
                                {renderFieldError('postcode')}

                                <View style={styles.radiusBlock}>
                                    <AppText variant="label" style={styles.radiusLabel}>
                                        Pickup radius
                                    </AppText>
                                    <View style={styles.radiusValueBox}>
                                        <AppText style={styles.radiusValue}>
                                            {DEFAULT_PICKUP_RADIUS_KM} km
                                        </AppText>
                                    </View>
                                    <AppText style={styles.radiusHelper}>
                                        Fixed at {DEFAULT_PICKUP_RADIUS_KM} km for now for ease of operations.
                                    </AppText>
                                </View>

                                {renderLocationSection()}

                                <AppText variant="bodyBold" style={styles.sectionHeading}>
                                    Site manager
                                </AppText>
                                <AppText variant="bodySmall" style={styles.sectionHint}>
                                    A manager account is created with this location. After you tap Add location, we
                                    email them their login email and password.
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
                                        if (key === 'password' || key === 'confirmPassword') {
                                            requestAnimationFrame(() => {
                                                scrollRef.current?.scrollToEnd({ animated: true });
                                            });
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
                                    onPress={handleCreateLocation}
                                >
                                    <AppText style={styles.btnText}>
                                        {loading ? 'Adding location...' : 'Add location & manager'}
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
        paddingBottom: hp(32),
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
    radiusBlock: {
        gap: hp(0.55),
    },
    radiusLabel: {
        textTransform: 'none',
    },
    radiusValueBox: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: normalize(10),
        backgroundColor: '#F4FAF6',
        paddingHorizontal: wp(3.5),
        paddingVertical: hp(1.2),
    },
    radiusValue: {
        fontFamily: 'Saveful-Bold',
        fontSize: normalize(15),
        color: palette.kale,
        textTransform: 'none',
    },
    radiusHelper: {
        fontFamily: 'Saveful-Regular',
        fontSize: normalize(12),
        lineHeight: normalize(17),
        color: palette.midgray,
        textTransform: 'none',
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
