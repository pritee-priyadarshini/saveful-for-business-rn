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
import { sitesService } from '@/services/sites.service';

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

    useEffect(() => {
        if (route.params?.mode === 'manager') {
            setActiveTab('manager');
            setSelectedSiteId(route.params.siteId);
        }
    }, []);

    const [activeTab, setActiveTab] = useState<'site' | 'manager'>('site');
    const [loading, setLoading] = useState(false);

    const [createdSiteId, setCreatedSiteId] = useState<number | null>(null);

    const [sites, setSites] = useState<any[]>([]);
    const [selectedSiteId, setSelectedSiteId] = useState<number | null>(null);
    const [openSiteDropdown, setOpenSiteDropdown] = useState(false);

    const [region, setRegion] = useState<any>(null);
    const [marker, setMarker] = useState<any>(null);
    const [selectedAddress, setSelectedAddress] = useState('');

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
        const fetchSites = async () => {
            try {
                const res = await sitesService.getOrganisation();
                setSites(res.data?.sites || []);
            } catch (e) {
                console.log('Failed to fetch sites');
            }
        };

        fetchSites();
    }, []);


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

    const handleCreateSite = async () => {
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

            const res = await sitesService.createSite({
                siteName,
                address,
                postcode,

                // 🔥 dummy system values
                contactName: 'Business Multi Admin',
                contactEmail: 'businessmulti@gmail.com',
                phoneNumber: '9999999999',

                latitude,
                longitude,
            });

            const siteId = res.data.id;
            setCreatedSiteId(siteId);
            Alert.alert('Success', 'Site created. Now assign manager.');
            setActiveTab('manager');
        } catch (err: any) {
            Alert.alert(
                'Error',
                err?.response?.data?.message || 'Failed to create site'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAssignManager = async () => {
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

            await sitesService.assignManager(siteId, managerForm);

            Alert.alert('Success', 'Manager assigned');

            navigation.goBack();

        } catch (err: any) {
            Alert.alert(
                'Error',
                err?.response?.data?.message || 'Failed to assign manager'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={20}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <Screen backgroundColor={palette.creme}>
                    <ScrollView
                        keyboardShouldPersistTaps="handled"
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

                                {/* MAP */}
                                <AppText style={{ textAlign: 'center', marginTop: 20 }}>
                                    Tap map to select location *
                                </AppText>

                                <View style={{ height: 250, margin: 15 }}>
                                    {region && (
                                        <MapView
                                            style={{ flex: 1 }}
                                            region={region}
                                            onPress={async (e) => {
                                                const { latitude, longitude } =
                                                    e.nativeEvent.coordinate;

                                                setMarker({ latitude, longitude });

                                                setSiteForm((prev) => ({
                                                    ...prev,
                                                    latitude,
                                                    longitude,
                                                }));

                                                const res = await Location.reverseGeocodeAsync({
                                                    latitude,
                                                    longitude,
                                                });

                                                if (res.length > 0) {
                                                    const place = res[0];

                                                    const addr = [
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
                                                    }));
                                                }
                                            }}
                                        >
                                            {marker && <Marker coordinate={marker} />}
                                        </MapView>
                                    )}
                                </View>

                                <Pressable style={styles.createBtn} onPress={handleCreateSite}>
                                    <AppText style={styles.btnText}>
                                        {loading ? 'Creating...' : 'Create Site'}
                                    </AppText>
                                </Pressable>
                            </>
                        )}

                        {activeTab === 'manager' && (
                            <>
                                <View style={{ marginHorizontal: 15, marginBottom: 15 }}>
                                    <AppText variant="label">Select Site *</AppText>

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
                                        <AppText style={styles.label}>{field.label}</AppText>

                                        <TextInput
                                            style={styles.inputWrapper}
                                            secureTextEntry={field.key === 'password'}
                                            value={(managerForm as any)[field.key]}
                                            onChangeText={(v) =>
                                                setManagerForm({ ...managerForm, [field.key]: v })
                                            }
                                        />
                                    </View>
                                ))}

                                <Pressable style={styles.createBtn} onPress={handleAssignManager}>
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
});