import React, { useState, useEffect, useRef } from 'react';
import { GOOGLE_PLACES_API_KEY } from '@/config';
import {
    View,
    ScrollView,
    TextInput,
    Pressable,
    StyleSheet,
    Alert,
    ImageBackground,
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
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { OsmMapView } from '../../components/OsmMapView';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '@/theme/colors';
import { sitesService } from '@/services/sites.service';
import { useSitesStore } from '@/store/sitesStore';
import { InputField } from '@/components/InputField';
import { fetchCurrentLocation, reverseGeocodeAddress } from '@/utils/currentLocation';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';

  const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export default function CreateSiteScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>();
    const {
        sites: storeSites,
        fetchOrganisation,
        fetchStaff,
        createSite,
        assignManager,
    } = useSitesStore();

    useEffect(() => {
        if (route.params?.mode === 'manager') {
            setActiveTab('manager');
            const siteId = route.params.siteId;
            setSelectedSiteId(siteId);

            // Prefill if siteId is provided (Replace manager mode)
            if (siteId) {
                fetchSiteDetails(siteId);
            }
        }
    }, [route.params?.mode, route.params?.siteId]);

    const fetchSiteDetails = async (siteId: number) => {
        try {
            setLoading(true);
            await sitesService.getSiteDetails(siteId);

            const staff = await fetchStaff(siteId, true);
            const managerEntry = staff.find((u) => u.role === 'SITE_ADMIN');

            if (managerEntry) {
                setManagerForm({
                    firstName: managerEntry.firstName || '',
                    lastName: managerEntry.lastName || '',
                    email: managerEntry.email || '',
                    password: '',
                    phoneNumber: managerEntry.mobile || '',
                });
            }
        } catch (error) {
            showErrorAlert(error, 'Could not load site', 'Could not load site details');
        } finally {
            setLoading(false);
        }
    };

    const [activeTab, setActiveTab] = useState<'site' | 'manager'>('site');
    const [loading, setLoading] = useState(false);

    const [createdSiteId, setCreatedSiteId] = useState<number | null>(null);

    const sites = storeSites;
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
    const [openSiteDropdown, setOpenSiteDropdown] = useState(false);

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
        })
    ).current;

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

    const [siteForm, setSiteForm] = useState({
        siteName: '',
        address: '',
        postcode: '',
        latitude: null as number | null,
        longitude: null as number | null,
    });
    const [managerForm, setManagerForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phoneNumber: '',
    });
    useEffect(() => {
        fetchOrganisation();
    }, [fetchOrganisation]);


    useEffect(() => {
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
    }, []);

    const handleCreateSite = async () => {
        if (loading) return;
        try {
            const {
                siteName,
                address,
                postcode,
                latitude,
                longitude,
            } = siteForm;

            if (
                !siteName ||
                !address ||
                !postcode ||
                !latitude ||
                !longitude
            ) {
                Alert.alert('Error', 'Fill all required site fields');
                return;
            }

            setLoading(true);

            const res = await createSite({
                siteName,
                address,
                postcode,

                // dummy system values
                contactName: 'Business Multi Admin',
                contactEmail: 'businessmulti@gmail.com',
                phoneNumber: '9999999999',

                latitude,
                longitude,
            });

            const siteId = res.data.id;
            setCreatedSiteId(siteId);
            showSuccessAlert('Site created. Now assign manager.');
            setActiveTab('manager');
        } catch (err: unknown) {
            showErrorAlert(err, 'Could not create site', 'Failed to create site');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignManager = async () => {
        if (loading) return;
        try {
            const siteId = createdSiteId || selectedSiteId;

            if (!siteId) {
                Alert.alert('Please select a site');
                return;
            }

            const { firstName, lastName, email, password } = managerForm;

            if (!firstName || !lastName || !email || !password) {
                Alert.alert('Fill all required manager fields');
                return;
            }

            setLoading(true);

            await assignManager(siteId, managerForm);

            showSuccessAlert('Manager assigned', 'Done', () => navigation.goBack());

        } catch (err: unknown) {
            showErrorAlert(err, 'Could not assign manager', 'Failed to assign manager');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={10}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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
                                        {/* DRAG HANDLE */}
                                        <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                                            <View style={styles.dragHandle} />
                                        </View>

                                        {/* MODAL HEADER */}
                                        <View style={styles.modalHeader}>
                                            <AppText style={styles.modalTitle}>Set Location</AppText>
                                            <Pressable onPress={closeModal} style={styles.modalCloseBtn}>
                                                <Ionicons name="close" size={normalize(22)} color={palette.text} />
                                            </Pressable>
                                        </View>

                                        {/* SEARCH */}
                                        <View style={styles.modalSearchContainer}>
                                            <GooglePlacesAutocomplete
                                                placeholder="Search address or place..."
                                                fetchDetails
                                                textInputProps={{ autoFocus: true }}
                                                onPress={(data, details = null) => {
                                                    const lat = details?.geometry?.location?.lat;
                                                    const lng = details?.geometry?.location?.lng;
                                                    if (lat != null && lng != null) {
                                                        const addr = details?.formatted_address || data.description;
                                                        const postcode = details?.address_components?.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
                                                        applyMapLocation(lat, lng, addr, postcode);
                                                    }
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

                                        {/* MAP PREVIEW */}
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

                                        {/* CONFIRM BUTTON */}
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
                        keyboardShouldPersistTaps="always"
                        contentContainerStyle={{ paddingBottom: 120 }}
                    >

                        {/* HEADER */}
                        <ImageBackground
                            source={require('../../../assets/placeholder/feed-bg.png')}
                            style={styles.headerBg}
                        >
                            <Pressable
                                onPress={() => navigation.goBack()}
                                style={styles.backBtn}
                            >
                                <Ionicons name="arrow-back" size={24} color={palette.white} />
                            </Pressable>

                            <AppText variant='h5' style={styles.headerTitle}>
                                Create Site
                            </AppText>
                        </ImageBackground>

                        <View style={{ flexDirection: 'row', margin: 15, gap: 10 }}>
                            {[
                                { key: 'site', label: 'Add Site' },
                                { key: 'manager', label: 'Add Manager' },
                            ].map((tab) => (
                                <Pressable
                                    key={tab.key}
                                    onPress={() => {
                                        if (tab.key === 'manager' && sites.length === 0 && !createdSiteId) {
                                            Alert.alert('No sites available. Please create a site first.');
                                            return;
                                        }
                                        setActiveTab(tab.key as any);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: 10,
                                        borderRadius: 20,
                                        backgroundColor:
                                            activeTab === tab.key ? palette.primary : '#eee',
                                        alignItems: 'center',
                                    }}
                                >
                                    <AppText
                                        style={{
                                            color:
                                                activeTab === tab.key ? 'white' : palette.text,
                                        }}
                                    >
                                        {tab.label}
                                    </AppText>
                                </Pressable>
                            ))}
                        </View>

                        {activeTab === 'site' && (
                            <>
                                {[
                                    { key: 'siteName', label: 'Site Name *' },
                                    { key: 'address', label: 'Address *' },
                                    { key: 'postcode', label: 'Postcode *' },
                                ].map((field: any) => (
                                    <View key={field.key} style={styles.fieldWrapper}>
                                        <AppText style={styles.label}>{field.label}</AppText>

                                        <TextInput
                                            style={styles.inputWrapper}
                                            value={(siteForm as any)[field.key]}
                                            onChangeText={(v) =>
                                                setSiteForm({ ...siteForm, [field.key]: v })
                                            }
                                        />
                                    </View>
                                ))}

                                {/* LOCATION PICKER */}
                                <View style={styles.locationPickerRow}>
                                    <Pressable
                                        style={[styles.locationPickerBtn, gpsLoading && styles.locationPickerBtnDisabled]}
                                        onPress={goToCurrentLocation}
                                        disabled={gpsLoading}
                                    >
                                        <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
                                        <AppText style={styles.locationPickerBtnText}>
                                            {gpsLoading ? 'Getting location...' : 'Use My Location'}
                                        </AppText>
                                    </Pressable>
                                    <Pressable style={[styles.locationPickerBtn, styles.locationPickerBtnSearch]} onPress={openModal}>
                                        <Ionicons name="search" size={normalize(16)} color={palette.white} />
                                        <AppText style={[styles.locationPickerBtnText, styles.locationPickerBtnTextWhite]}>Search Address</AppText>
                                    </Pressable>
                                </View>
                                {selectedAddress ? (
                                    <View style={styles.selectedAddressBox}>
                                        <Ionicons name="location" size={normalize(16)} color={palette.primary} />
                                        <AppText style={styles.selectedAddressText} numberOfLines={2}>{selectedAddress}</AppText>
                                        <Pressable onPress={() => {
                                            setSelectedAddress('');
                                            setMarker(null);
                                            setSiteForm(prev => ({ ...prev, latitude: null, longitude: null, address: '', postcode: '' }));
                                        }}>
                                            <Ionicons name="close-circle" size={normalize(18)} color="#aaa" />
                                        </Pressable>
                                    </View>
                                ) : null}

                                {/* MAP */}
                                <AppText style={styles.mapHintText}>Tap on map to fine-tune the pin</AppText>

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

                                <Pressable
                                    style={[styles.createBtn, loading && { opacity: 0.65 }]}
                                    onPress={handleCreateSite}
                                    disabled={loading}
                                >
                                    <AppText style={styles.btnText}>
                                        {loading ? 'Creating...' : 'Create Site'}
                                    </AppText>
                                </Pressable>
                            </>
                        )}

                        {activeTab === 'manager' && (
                            <>
                                <View style={{ marginHorizontal: 15, marginBottom: 15 }}>
                                    <AppText variant="bodyBold">Select Site *</AppText>

                                    <Pressable
                                        onPress={() => setOpenSiteDropdown(!openSiteDropdown)}
                                        style={{
                                            backgroundColor: 'white',
                                            borderRadius: 10,
                                            borderWidth: 1,
                                            borderColor: '#ddd',
                                            padding: 12,
                                            marginTop: 5,
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <AppText variant='bodySmall'>
                                            {selectedSiteId
                                                ? sites.find((s) => s.id === selectedSiteId)?.siteName ||
                                                'Selected Site'
                                                : sites.length === 0
                                                    ? 'No site added yet'
                                                    : 'Select a site'}
                                        </AppText>

                                        <Ionicons name="chevron-down" size={18} />
                                    </Pressable>

                                    {/* DROPDOWN LIST */}
                                    {openSiteDropdown && (
                                        <View
                                            style={{
                                                backgroundColor: 'white',
                                                borderWidth: 1,
                                                borderColor: '#ddd',
                                                borderRadius: 10,
                                                marginTop: 5,
                                            }}
                                        >
                                            {sites.length === 0 ? (
                                                <AppText style={{ padding: 12, color: '#888' }}>
                                                    No site added yet
                                                </AppText>
                                            ) : (
                                                sites.map((site) => (
                                                    <Pressable
                                                        key={site.id}
                                                        onPress={() => {
                                                            setSelectedSiteId(site.id);
                                                            setOpenSiteDropdown(false);
                                                            fetchSiteDetails(site.id);
                                                        }}
                                                        style={{ padding: 12 }}
                                                    >
                                                        <AppText variant='bodySmall'>
                                                            {site.siteName} - {site.address}
                                                        </AppText>
                                                    </Pressable>
                                                ))
                                            )}
                                        </View>
                                    )}
                                </View>
                                {[
                                    { key: 'firstName', label: 'First Name *' },
                                    { key: 'lastName', label: 'Last Name *' },
                                    { key: 'email', label: 'Email *' },
                                    { key: 'password', label: 'Password *' },
                                    { key: 'phoneNumber', label: 'Phone (Optional)' },
                                ].map((field: any) => (
                                    <View key={field.key} style={styles.fieldWrapper}>
                                        <InputField
                                            label={field.label}
                                            value={(managerForm as any)[field.key]}
                                            onChangeText={(v) =>
                                                setManagerForm({
                                                    ...managerForm,
                                                    [field.key]: v,
                                                })
                                            }
                                            secureTextEntry={field.key === 'password'}
                                            isPassword={field.key === 'password'}
                                            editable={true}
                                        />
                                    </View>
                                ))}

                                <Pressable
                                    style={[styles.createBtn, loading && { opacity: 0.65 }]}
                                    onPress={handleAssignManager}
                                    disabled={loading}
                                >
                                    <AppText style={styles.btnText}>
                                        {loading ? 'Assigning...' : 'Assign Manager'}
                                    </AppText>
                                </Pressable>
                            </>
                        )}

                    </ScrollView>
                </Screen>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    headerBg: {
        height: hp(20),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: hp(2),
    },

    backBtn: {
        position: 'absolute',
        left: wp(4),
        top: hp(2.5),
    },

    headerTitle: {
        color: palette.white,
        fontSize: normalize(24),
    },

    fieldWrapper: {
        marginVertical: hp(1),
        marginHorizontal: wp(5),
    },

    label: {
        marginBottom: hp(0.5),
        color: '#555',
        fontSize: normalize(14),
    },

    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: normalize(10),
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: wp(3),
        height: hp(6),
    },

    inputFlex: {
        flex: 1,
        fontSize: normalize(14),
    },

    createBtn: {
        backgroundColor: palette.middlegreen,
        padding: hp(1.8),
        marginHorizontal: wp(10),
        borderRadius: normalize(10),
        alignItems: 'center',
        marginVertical: hp(2),
    },

    btnText: {
        color: 'white',
        fontSize: normalize(16),
        fontWeight: '600',
    },

    // ─── Location Picker ───────────────────────────────────────────
    locationPickerRow: {
        flexDirection: 'row',
        marginHorizontal: wp(4),
        marginTop: hp(2.5),
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
        marginHorizontal: wp(4),
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

    // ─── Map ────────────────────────────────────────────────────────
    mapHintText: {
        textAlign: 'center',
        marginTop: hp(1.5),
        marginBottom: hp(0.5),
        color: '#999',
        fontSize: normalize(12),
    },

    mapContainer: {
        height: hp(28),
        marginHorizontal: wp(4),
        marginVertical: hp(1),
        borderRadius: normalize(12),
        overflow: 'hidden',
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
        zIndex: 10,
    },

    modalMapContainer: {
        flex: 1,
        marginHorizontal: wp(4),
        marginBottom: normalize(4),
        borderRadius: normalize(12),
        overflow: 'hidden',
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