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
    Linking,
    Dimensions,
    Modal,
    Animated,
    PanResponder,
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';

import * as Location from 'expo-location';

import MapView, { Marker } from 'react-native-maps';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';

import { Ionicons } from '@expo/vector-icons';

import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';

import { CharityMemberRole, charityService } from '@/services/charity.service';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export default function CreateCharitySiteScreen() {
    const navigation = useNavigation();
    const route = useRoute<any>();
    useEffect(() => {
        if (route.params?.mode === 'manager') {
            setActiveTab('manager');
            setSelectedLocationId(route.params.locationId);
        }
    }, []);

    const [activeTab, setActiveTab] = useState<'site' | 'manager'>('site');
    const [loading, setLoading] = useState(false);
    const [createdLocationId, setCreatedLocationId] = useState<number | null>(null);
    const [locations, setLocations] = useState<any[]>([]);
    const [selectedLocationId, setSelectedLocationId] = useState<number | null>(null);
    const [openLocationDropdown, setOpenLocationDropdown] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [region, setRegion] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [selectedAddress, setSelectedAddress] = useState('');
    const [showPlacesSearch, setShowPlacesSearch] = useState(false);

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

    const goToCurrentLocation = async () => {
        try {

            // CHECK EXISTING STATUS
            let permission =
                await Location.getForegroundPermissionsAsync();

            // ASK ONLY IF NOT GRANTED
            if (permission.status !== 'granted') {

                permission =
                    await Location.requestForegroundPermissionsAsync();
            }

            // STILL DENIED
            if (permission.status !== 'granted') {

                Alert.alert(
                    'Location Permission Required',
                    'Please enable location permission from app settings.',
                    [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: 'Open Settings',
                            onPress: () => Linking.openSettings(),
                        },
                    ]
                );

                return;
            }

            // GET CURRENT LOCATION
            const location =
                await Location.getCurrentPositionAsync({
                    accuracy:
                        Location.Accuracy.High,
                });

            const latitude =
                location.coords.latitude;

            const longitude =
                location.coords.longitude;

            // MOVE MAP
            const newRegion = {
                latitude,
                longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
            };

            setRegion(newRegion);

            setMarker({
                latitude,
                longitude,
            });

            // SAVE LAT LNG
            setSiteForm((prev) => ({
                ...prev,
                latitude,
                longitude,
            }));

            // REVERSE GEOCODE
            const address =
                await Location.reverseGeocodeAsync({
                    latitude,
                    longitude,
                });

            if (address.length > 0) {

                const place = address[0];

                const formattedAddress = [
                    place.name,
                    place.street,
                    place.city,
                    place.region,
                    place.postalCode,
                ]
                    .filter(Boolean)
                    .join(', ');

                setSelectedAddress(
                    formattedAddress
                );

                setSiteForm((prev) => ({
                    ...prev,
                    address:
                        formattedAddress,
                    postcode:
                        place.postalCode || '',
                }));
            }

        } catch (err) {

            console.log(err);

            Alert.alert(
                'Error',
                'Failed to fetch current location'
            );
        }
    };
    const [siteForm, setSiteForm] = useState({
        locationName: '',
        address: '',
        postcode: '',
        adminContactName: '',
        adminEmail: '',
        adminMobile: '',
        adminPassword: '',
        radiusKm: '10',
        latitude: null as number | null,
        longitude: null as number | null,
    });

    const [managerForm, setManagerForm] = useState({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        mobile: '',
        role: 'LOCATION_ADMIN',
        canClaimPickupsDirectly: true,
    });

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            const res = await charityService.listLocations();
            const data = res.data?.locations || res.data || [];
            setLocations(data);
        } catch (e) {
            console.log('Failed to fetch locations');
        }
    };

    useEffect(() => {
        (async () => {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({});
                setRegion({
                    latitude: loc.coords.latitude,
                    longitude: loc.coords.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                });
            } else {
                setRegion({
                    latitude: 20.5937,
                    longitude: 78.9629,
                    latitudeDelta: 5,
                    longitudeDelta: 5,
                });
            }
        })();
    }, []);

    const handleCreateLocation = async () => {
        if (loading) return;
        try {
            const {
                locationName,
                address,
                postcode,
                adminContactName,
                adminEmail,
                adminMobile,
                adminPassword,
                radiusKm,
                latitude,
                longitude,
            } = siteForm;

            if (
                !locationName ||
                !address ||
                !postcode ||
                !adminContactName ||
                !adminEmail ||
                !adminMobile ||
                !adminPassword ||
                !latitude ||
                !longitude
            ) {
                Alert.alert('Error', 'Fill all required fields');
                return;
            }

            setLoading(true);
            const res = await charityService.addLocation({
                locationName,
                address,
                postcode,
                adminContactName,
                adminEmail,
                adminMobile,
                adminPassword,
                radiusKm: Number(radiusKm),
                latitude,
                longitude,
            });

            const locationId = res.data?.id || res.data?.location?.id;
            setCreatedLocationId(locationId);
            Alert.alert('Success', 'Location created successfully');
            await fetchLocations();
            setSelectedLocationId(locationId);
            setActiveTab('manager');

        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to create location');
        } finally {
            setLoading(false);
        }
    };

    const handleAssignManager = async () => {
        if (loading) return;
        try {
            const locationId = createdLocationId || selectedLocationId;
            if (!locationId) {
                Alert.alert('Error', 'Please select a location');
                return;
            }
            const {
                firstName,
                lastName,
                email,
                password,
                mobile,
                role,
                canClaimPickupsDirectly,
            } = managerForm;

            if (
                !firstName ||
                !lastName ||
                !email ||
                !password
            ) {
                Alert.alert('Error', 'Fill all required manager fields');
                return;
            }
            setLoading(true);
            await charityService.addMember({
                firstName,
                lastName,
                email,
                password,
                mobile,
                role: CharityMemberRole.TEAM_MEMBER,
                locationId,
                canClaimPickupsDirectly,
            });

            Alert.alert('Success', 'Manager assigned successfully');
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err?.response?.data?.message || 'Failed to assign manager');
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={normalize(20)}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} >
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
                                                        setSiteForm((prev) => ({ ...prev, latitude: lat, longitude: lng }));
                                                    }
                                                    const addr = details?.formatted_address || data.description;
                                                    const postcode = details?.address_components?.find((c: any) => c.types.includes('postal_code'))?.long_name || '';
                                                    setSelectedAddress(addr);
                                                    setSiteForm((prev) => ({ ...prev, address: addr, postcode }));
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
                                            {region ? (
                                                <MapView
                                                    style={styles.mapView}
                                                    region={region}
                                                    showsUserLocation
                                                    onPress={async (e) => {
                                                        const { latitude, longitude } = e.nativeEvent.coordinate;
                                                        setMarker({ latitude, longitude });
                                                        setSiteForm((prev) => ({ ...prev, latitude, longitude }));
                                                        const res = await Location.reverseGeocodeAsync({ latitude, longitude });
                                                        if (res.length > 0) {
                                                            const place = res[0];
                                                            const addr = [place.name, place.street, place.city, place.region, place.postalCode].filter(Boolean).join(', ');
                                                            setSelectedAddress(addr);
                                                            setSiteForm((prev) => ({ ...prev, address: addr, postcode: place.postalCode || '' }));
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
                        contentContainerStyle={{ paddingBottom: hp(14), }}
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
                                <Ionicons name="arrow-back" size={normalize(24)} color={palette.white} />
                            </Pressable>

                            <AppText variant='h5' style={styles.headerTitle} >
                                Add Charity Site
                            </AppText>
                        </ImageBackground>

                        {/* TABS */}
                        <View
                            style={{
                                flexDirection: 'row',
                                margin: wp(4),
                                gap: wp(2.5),
                            }}
                        >
                            {[
                                {
                                    key: 'site',
                                    label: 'Add Site',
                                },
                                {
                                    key: 'manager',
                                    label: 'Add Manager',
                                },
                            ].map((tab) => (
                                <Pressable
                                    key={tab.key}
                                    onPress={() => {
                                        if (tab.key === 'manager' && locations.length === 0 && !createdLocationId) {
                                            Alert.alert('No locations available. Please create a location first.');
                                            return;
                                        }

                                        setActiveTab(tab.key as any);
                                    }}
                                    style={{
                                        flex: 1,
                                        padding: normalize(10),
                                        borderRadius: normalize(20),
                                        backgroundColor: activeTab === tab.key ? palette.primary : '#eee',
                                        alignItems: 'center',
                                    }}
                                >
                                    <AppText style={{ color: activeTab === tab.key ? 'white' : palette.text, }} >
                                        {tab.label}
                                    </AppText>
                                </Pressable>
                            ))}
                        </View>

                        {/* SITE TAB */}
                        {activeTab === 'site' && (
                            <>
                                {[
                                    {
                                        key: 'locationName',
                                        label: 'Site Name *',
                                    },
                                    {
                                        key: 'address',
                                        label: 'Site Address *',
                                    },
                                    {
                                        key: 'postcode',
                                        label: ' Site Postcode *',
                                    },
                                    {
                                        key: 'adminContactName',
                                        label: 'Site Manager Name *',
                                    },
                                    {
                                        key: 'adminEmail',
                                        label: 'Site Manager Email *',
                                    },
                                    {
                                        key: 'adminMobile',
                                        label: 'Site Manager Mobile *',
                                    },
                                    {
                                        key: 'adminPassword',
                                        label: 'Site Manager Password *',
                                        secure: true,
                                    },
                                    {
                                        key: 'radiusKm',
                                        label: 'SitePickup Radius (km) *',
                                    },
                                ].map((field: any) => (
                                    <View
                                        key={field.key}
                                        style={styles.fieldWrapper}
                                    >
                                        <AppText style={styles.label} >
                                            {field.label}
                                        </AppText>

                                        <View style={styles.inputWrapper}>
                                            <TextInput
                                                style={styles.inputFlex}
                                                secureTextEntry={
                                                    field.key === 'adminPassword' ? !showPassword : false
                                                }
                                                value={
                                                    (siteForm as any)[
                                                    field.key
                                                    ]
                                                }
                                                onChangeText={(v) =>
                                                    setSiteForm(
                                                        {
                                                            ...siteForm,
                                                            [field.key]:
                                                                v,
                                                        }
                                                    )
                                                }
                                            />

                                            {field.key ===
                                                'adminPassword' && (
                                                    <Pressable
                                                        onPress={() =>
                                                            setShowPassword(
                                                                !showPassword
                                                            )
                                                        }
                                                    >
                                                        <Ionicons
                                                            name={showPassword ? 'eye-off' : 'eye'}
                                                            size={normalize(20)}
                                                            color="#777"
                                                        />
                                                    </Pressable>
                                                )}
                                        </View>
                                    </View>
                                ))}

                                {/* LOCATION PICKER */}
                                <View style={styles.locationPickerRow}>
                                    <Pressable style={styles.locationPickerBtn} onPress={goToCurrentLocation}>
                                        <Ionicons name="locate" size={normalize(16)} color={palette.primary} />
                                        <AppText style={styles.locationPickerBtnText}>Use My Location</AppText>
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
                                    {region ? (
                                        <MapView
                                            style={styles.mapView}
                                            region={region}
                                            showsUserLocation
                                            onPress={async (e) => {
                                                const { latitude, longitude } = e.nativeEvent.coordinate;
                                                setMarker({ latitude, longitude });
                                                setSiteForm((prev) => ({ ...prev, latitude, longitude }));
                                                const res = await Location.reverseGeocodeAsync({ latitude, longitude });
                                                if (res.length > 0) {
                                                    const place = res[0];
                                                    const addr = [place.name, place.street, place.city, place.region, place.postalCode].filter(Boolean).join(', ');
                                                    setSelectedAddress(addr);
                                                    setSiteForm((prev) => ({ ...prev, address: addr, postcode: place.postalCode || '' }));
                                                }
                                            }}
                                        >
                                            {marker && <Marker coordinate={marker} />}
                                        </MapView>
                                    ) : (
                                        <View style={styles.mapPlaceholder}>
                                            <Ionicons name="map-outline" size={normalize(32)} color="#ccc" />
                                            <AppText style={styles.mapPlaceholderText}>Select a location to preview map</AppText>
                                        </View>
                                    )}
                                </View>

                                <Pressable
                                    style={styles.createBtn}
                                    disabled={loading}
                                    onPress={handleCreateLocation}
                                >
                                    <AppText style={styles.btnText}>
                                        {loading ? 'Creating...' : 'Create Site'}
                                    </AppText>
                                </Pressable>
                            </>
                        )}

                        {/* MANAGER TAB */}
                        {activeTab === 'manager' && (
                            <>
                                <View
                                    style={{
                                        marginHorizontal: wp(4),
                                        marginBottom: hp(1.8),
                                    }}
                                >
                                    <AppText variant="bodyBold">
                                        Select Site *
                                    </AppText>

                                    <Pressable
                                        onPress={() =>
                                            setOpenLocationDropdown(
                                                !openLocationDropdown
                                            )
                                        }
                                        style={{
                                            backgroundColor: palette.white,
                                            borderRadius: normalize(10),
                                            borderWidth: 1,
                                            borderColor: palette.border,
                                            padding: normalize(12),
                                            marginTop: hp(0.6),
                                            flexDirection: 'row',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                        }}
                                    >
                                        <AppText variant='bodySmall'>
                                            {selectedLocationId
                                                ? locations.find((s) =>
                                                    s.id === selectedLocationId
                                                )
                                                    ?.locationName ||
                                                'Selected Location'
                                                : locations.length === 0
                                                    ? 'No location added yet'
                                                    : 'Select a location'}
                                        </AppText>

                                        <Ionicons name="chevron-down" size={normalize(18)} />
                                    </Pressable>

                                    {/* DROPDOWN */}
                                    {openLocationDropdown && (
                                        <View
                                            style={{
                                                backgroundColor: palette.white,
                                                borderWidth: 1,
                                                borderColor: palette.border,
                                                borderRadius: normalize(10),
                                                marginTop: hp(0.6),
                                            }}
                                        >
                                            {locations.length === 0 ? (
                                                <AppText
                                                    style={{
                                                        padding: normalize(12),
                                                        color: '#888',
                                                    }}
                                                >
                                                    No location added yet
                                                </AppText>
                                            ) : (
                                                locations.map((site) => (
                                                    <Pressable
                                                        key={site.id}
                                                        onPress={() => {
                                                            setSelectedLocationId(site.id);
                                                            setOpenLocationDropdown(false);
                                                        }}
                                                        style={{ padding: normalize(12), }}
                                                    >
                                                        <AppText variant='bodySmall'>
                                                            {site.locationName}{' '}-{' '}{site.address}
                                                        </AppText>
                                                    </Pressable>
                                                )
                                                )
                                            )}
                                        </View>
                                    )}
                                </View>

                                {[
                                    {
                                        key: 'firstName',
                                        label: 'First Name *',
                                    },
                                    {
                                        key: 'lastName',
                                        label: 'Last Name *',
                                    },
                                    {
                                        key: 'email',
                                        label: 'Email *',
                                    },
                                    {
                                        key: 'password',
                                        label: 'Password *',
                                        secure: true,
                                    },
                                    {
                                        key: 'mobile',
                                        label: 'Phone Number (Optional)',
                                    },
                                ].map((field: any) => (
                                    <View
                                        key={field.key}
                                        style={styles.fieldWrapper}
                                    >
                                        <AppText style={styles.label}>
                                            {field.label}
                                        </AppText>

                                        <TextInput
                                            style={styles.inputWrapper}
                                            secureTextEntry={field.key === 'password'}
                                            value={
                                                (managerForm as any)[
                                                field.key
                                                ]
                                            }
                                            onChangeText={(
                                                v
                                            ) =>
                                                setManagerForm(
                                                    {
                                                        ...managerForm,
                                                        [field.key]:
                                                            v,
                                                    }
                                                )
                                            }
                                        />
                                    </View>
                                ))}

                                <Pressable
                                    style={styles.createBtn}
                                    disabled={loading}
                                    onPress={handleAssignManager}>
                                    <AppText style={styles.btnText} >
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
        marginBottom: hp(2.5),
    },

    backBtn: {
        position: 'absolute',
        left: wp(4),
        top: hp(2.2),
    },

    headerTitle: {
        color: palette.white,
    },

    fieldWrapper: {
        marginVertical: hp(1),
        marginHorizontal: wp(4),
    },

    label: {
        marginBottom: hp(1),
        color: '#555',
    },

    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: normalize(10),
        borderWidth: 1,
        borderColor: palette.border,
        paddingHorizontal: wp(2.5),
    },

    inputFlex: {
        flex: 1,
    },

    createBtn: {
        backgroundColor: palette.middlegreen,
        padding: normalize(14),
        marginHorizontal: wp(6),
        borderRadius: normalize(10),
        alignItems: 'center',
        margin: hp(1.5),
    },

    btnText: {
        color: 'white',
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

    // ─── Bottom Sheet Modal ─────────────────────────────────────────
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