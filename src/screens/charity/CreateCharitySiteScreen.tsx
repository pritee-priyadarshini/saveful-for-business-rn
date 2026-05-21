import React, { useState, useEffect } from 'react';
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
} from 'react-native';

import { useNavigation, useRoute } from '@react-navigation/native';

import * as Location from 'expo-location';

import MapView, { Marker } from 'react-native-maps';

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
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={normalize(20)}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} >
                <Screen backgroundColor={palette.creme}>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
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

                                {/* MAP */}
                                <AppText style={{ textAlign: 'center', marginTop: hp(2.4), }}>
                                    Tap map to select location *
                                </AppText>

                                <View
                                    style={{ height: hp(30), margin: wp(4), position: 'relative', }}>
                                    {region && (
                                        <MapView
                                            style={{ flex: 1, }}
                                            region={region}
                                            showsUserLocation
                                            showsMyLocationButton={false}
                                            onPress={async (e) => {
                                                const { latitude, longitude, } = e.nativeEvent.coordinate;
                                                setMarker({ latitude, longitude, });

                                                setSiteForm((prev) => ({
                                                    ...prev,
                                                    latitude,
                                                    longitude,
                                                })
                                                );

                                                const res = await Location.reverseGeocodeAsync({ latitude, longitude, });

                                                if (res.length > 0) {
                                                    const place = res[0];
                                                    const addr =
                                                        [
                                                            place.name,
                                                            place.street,
                                                            place.city,
                                                            place.region,
                                                            place.postalCode,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(', ');
                                                    setSelectedAddress(addr);

                                                    setSiteForm((prev) => ({
                                                        ...prev,
                                                        address: addr,
                                                        postcode: place.postalCode || '',
                                                    })
                                                    );
                                                }
                                            }}
                                        >
                                            {marker && (
                                                <Marker
                                                    coordinate={
                                                        marker
                                                    }
                                                />
                                            )}
                                        </MapView>
                                    )}

                                    <Pressable
                                        onPress={goToCurrentLocation}
                                        style={{
                                            position: 'absolute',
                                            bottom: hp(1.8),
                                            right: wp(4),
                                            backgroundColor: palette.white,
                                            width: normalize(50),
                                            height: normalize(50),
                                            borderRadius: normalize(25),
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            elevation: 4,
                                        }}
                                    >
                                        <Ionicons
                                            name="locate"
                                            size={normalize(24)}
                                            color={palette.primary}
                                        />
                                    </Pressable>
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
                                    <AppText variant="label">
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
});