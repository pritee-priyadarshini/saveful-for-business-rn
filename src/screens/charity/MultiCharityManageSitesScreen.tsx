import React, { useState, useMemo } from 'react';
import {
    View,
    ScrollView,
    Pressable,
    StyleSheet,
    Image,
    ImageBackground,
    Linking,
    Alert,
    TextInput,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { useAppContext } from '@/store/AppContext';
import { useCharityStore } from '@/store/charityStore';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { showErrorAlert, showSuccessAlert } from '@/utils/apiError';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MultiCharityManageSites'>;

type Site = {
    id: number;
    tradingName: string;
    address: string;
    postCode: string;
    contactName: string;
    email: string;
    mobile: string;
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    logoUrl?: string;
};
export default function MultiCharityManageSitesScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { logout, currentProfile, authUser } = useAppContext();
    const {
        locations,
        users,
        isFetchingLocations,
        isFetchingUsers,
        fetchLocations,
        fetchUsers,
        updateLocation,
        deactivateLocation,
        deleteUser,
    } = useCharityStore();

    const [showPassword, setShowPassword] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [refreshing, setRefreshing] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [expandedSite, setExpandedSite] = useState<number | null>(null);
    const businessLogo = currentProfile.logo || authUser?.profile?.organisation?.logoUrl || null;

    const loading = isFetchingLocations || isFetchingUsers;

    const sites = useMemo<Site[]>(() => {
        return locations.map((location: any) => {
            const admin =
                users.find((u) =>
                    u.locations?.some((loc: any) => loc.id === location.id),
                ) || null;

            return {
                id: location.id,
                tradingName: location.locationName,
                address: location.address,
                postCode: location.postcode,
                contactName: admin ? `${admin.firstName} ${admin.lastName}` : 'No Admin',
                email: admin?.email || '-',
                mobile: admin?.mobile || '-',
                latitude: location.latitude,
                longitude: location.longitude,
                radiusKm: location.pickupRadiusKm,
                logoUrl: businessLogo || '',
            };
        });
    }, [locations, users, businessLogo]);

    const actions = [
        { label: 'Create Site', route: 'CreateCharitySite' },
        { label: 'View Analytics', route: 'CharitySiteAnalytics' },
        { label: 'Your Profile', route: 'CharityAdminProfile' },
        {
            label: 'Contact Saveful',
            action: () => Linking.openURL('https://www.saveful.com/contact'),
        },
    ];

    const loadData = async (force = false) => {
        await Promise.all([fetchLocations(force), fetchUsers(force)]);
    };

    const onRefresh = async () => {
        try {
            setRefreshing(true);
            await loadData(true);
        } catch (e) {
            showErrorAlert(e, 'Could not load locations', 'Could not load locations');
        } finally {
            setRefreshing(false);
        }
    };

    React.useEffect(() => {
        loadData().catch((e) =>
            showErrorAlert(e, 'Could not load locations', 'Could not load locations'),
        );
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (loading) {
        return (
            <Screen backgroundColor={palette.creme}>
                <View
                    style={{
                        flex: 1,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <AppText variant="bodyLarge">
                        Loading locations...
                    </AppText>
                </View>
            </Screen>
        );
    }

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />} >

                {/* HERO HEADER */}
                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.heroBg}
                >
                    <View style={styles.heroContent}>
                        <AppText variant="h5" style={styles.businessName}>  {currentProfile.organization}</AppText>

                        {businessLogo && (
                            <Image source={{ uri: businessLogo }} style={styles.logoTopRight} />
                        )}
                    </View>
                </ImageBackground>

                {/* ACTIONS */}
                <AppText variant="subheading" style={styles.sectionTitle}>
                    What to do today !
                </AppText>

                <View style={styles.actionGrid}>
                    {actions.map((item) => (
                        <Pressable
                            key={item.label}
                            style={styles.actionCard}
                            onPress={() => {
                                if (item.route) {
                                    navigation.navigate(item.route as any);
                                } else if (item.action) {
                                    item.action();
                                }
                            }}
                        >
                            <AppText variant="bodyBold" style={styles.actionText}>
                                {item.label}
                            </AppText>
                        </Pressable>
                    ))}
                </View>

                {/* SITES */}
                <AppText variant="subheading" style={styles.sectionTitle}>
                    Your Sites
                </AppText>

                {sites.length === 0 && (
                    <View style={{ paddingHorizontal: wp(5), marginTop: hp(1.2) }}>
                        <AppText variant="bodyLarge">
                            No charity locations added yet
                        </AppText>
                    </View>
                )}

                {sites.map((site, index) => (
                    <View key={site.id} style={styles.siteCard}>

                        <AppText variant="bodyBold" style={styles.siteIndex}>
                            Site {index + 1}
                        </AppText>

                        <View style={styles.siteHeader}>

                            <View style={styles.siteLeft}>
                                <Image source={site.logoUrl
                                    ? { uri: site.logoUrl }
                                    : require('../../../assets/intro/charity_logo.png')
                                }
                                    style={styles.siteLogo}
                                />

                                <View style={{ flex: 1 }}>
                                    <AppText variant="bodyBold" style={styles.siteName}>
                                        {site.tradingName}
                                    </AppText>

                                    <AppText variant="bodySmall" style={styles.siteAddress}>
                                        {site.address}
                                    </AppText>

                                    <AppText variant="bodySmall" style={styles.siteAddress}>
                                        {site.postCode}
                                    </AppText>
                                </View>
                            </View>

                            <View style={{ alignItems: 'flex-end', gap: hp(0.7) }}>

                                {/* VIEW */}
                                <Pressable
                                    style={styles.viewBtn}
                                    onPress={() => {
                                        setEditingSiteId(null); 
                                        setExpandedSite(expandedSite === site.id ? null : site.id);
                                    }}
                                >
                                    <AppText variant="bodyBold" style={styles.viewText}>
                                        View
                                    </AppText>
                                </Pressable>

                                {/* EDIT */}
                                <Pressable
                                    style={styles.editBtn}
                                    onPress={() => {
                                        const location = locations.find((loc) => loc.id === site.id);
                                        if (!location) {
                                            Alert.alert('Error', 'Failed to load location details');
                                            return;
                                        }

                                        setEditingSiteId(site.id);
                                        setEditForm({
                                            tradingName: String(location?.locationName || ''),
                                            address: String(location?.address || ''),
                                            postCode: String(location?.postcode || ''),
                                            radiusKm: String(location?.pickupRadiusKm || ''),
                                            latitude: location?.latitude || '',
                                            longitude: location?.longitude || '',
                                        });
                                        setExpandedSite(site.id);
                                    }}
                                >
                                    <AppText variant="bodyBold" style={{ color: 'white' }} >
                                        Edit
                                    </AppText>
                                </Pressable>

                            </View>
                        </View>

                        {expandedSite === site.id && (
                            <View style={styles.details}>
                                {editingSiteId === site.id ? (
                                    <>
                                        {[
                                            {
                                                key: 'tradingName',
                                                label: 'Location Name',
                                            },
                                            {
                                                key: 'address',
                                                label: 'Address',
                                            },
                                            {
                                                key: 'postCode',
                                                label: 'Post Code',
                                            },
                                            {
                                                key: 'radiusKm',
                                                label: 'Pickup Radius (km)',
                                            },
                                        ].map((field: any) => (
                                            <View
                                                key={field.key}
                                                style={{ marginBottom: hp(1.2) }}
                                            >
                                                <AppText variant="bodyBold">
                                                    {field.label}
                                                </AppText>

                                                <View style={styles.inputWrapper}>
                                                    <TextInput
                                                        value={String(editForm[field.key] || '')
                                                        }
                                                        onChangeText={(v) =>
                                                            setEditForm({
                                                                ...editForm,
                                                                [field.key]: v,
                                                            })
                                                        }
                                                        style={styles.input}
                                                    />
                                                </View>
                                            </View>
                                        ))}

                                        {/* SAVE */}
                                        <Pressable
                                            style={[styles.saveBtn, actionLoading && { opacity: 0.65 }]}
                                            disabled={actionLoading}
                                            onPress={async () => {
                                                if (actionLoading || !editingSiteId) return;
                                                setActionLoading(true);
                                                try {
                                                    await updateLocation(editingSiteId, {
                                                        locationName: editForm.tradingName,
                                                        address: editForm.address,
                                                        postcode: editForm.postCode,
                                                        radiusKm: Number(editForm.radiusKm),
                                                    });
                                                    await loadData(true);

                                                    setEditingSiteId(null);
                                                    setEditForm({});

                                                    showSuccessAlert('Location updated successfully');
                                                } catch (err: unknown) {
                                                    showErrorAlert(
                                                        err,
                                                        'Could not update location',
                                                        'Failed to update location',
                                                    );
                                                } finally {
                                                    setActionLoading(false);
                                                }
                                            }}
                                        >
                                            <AppText variant="bodyBold" style={{ color: 'white' }} >
                                                {actionLoading ? 'Saving...' : 'Save'}
                                            </AppText>
                                        </Pressable>

                                        {/* DELETE */}
                                        <Pressable
                                            style={[
                                                styles.saveBtn,
                                                {
                                                    backgroundColor: '#D9534F',
                                                    marginTop: hp(1.2),
                                                },
                                                actionLoading && { opacity: 0.65 },
                                            ]}
                                            disabled={actionLoading}
                                            onPress={() => {
                                                Alert.alert(
                                                    'Delete Location',
                                                    'Are you sure you want to delete this location?',
                                                    [
                                                        {
                                                            text: 'Cancel',
                                                            style: 'cancel',
                                                        },
                                                        {
                                                            text: 'Delete',
                                                            style: 'destructive',
                                                            onPress: async () => {
                                                                if (actionLoading) return;
                                                                setActionLoading(true);
                                                                try {
                                                                    await deactivateLocation(site.id);
                                                                    await loadData(true);
                                                                    setExpandedSite(null);
                                                                    showSuccessAlert('Location removed successfully', 'Deleted');
                                                                } catch (err) {
                                                                    showErrorAlert(
                                                                        err,
                                                                        'Could not remove location',
                                                                        'Failed to remove location',
                                                                    );
                                                                } finally {
                                                                    setActionLoading(false);
                                                                }
                                                            },
                                                        },
                                                    ]
                                                );
                                            }}
                                        >
                                            <AppText variant="bodyBold" style={{ color: 'white' }} >
                                                {actionLoading ? 'Deleting...' : 'Delete Location'}
                                            </AppText>
                                        </Pressable>
                                    </>
                                ) : (
                                    <>
                                        <AppText variant="bodyBold">
                                            Manager: {site.contactName}
                                        </AppText>

                                        <AppText variant="bodyBold">
                                            Email: {site.email}
                                        </AppText>

                                        <AppText variant="bodyBold">
                                            Mobile: {site.mobile}
                                        </AppText>

                                        {!!site.radiusKm && (
                                            <AppText variant="bodyBold">
                                                Pickup Radius: {site.radiusKm} km
                                            </AppText>
                                        )}

                                        <View style={{ flexDirection: 'row', gap: wp(2.5), marginTop: hp(1.8), }}>
                                            {/* ASSIGN MANAGER */}
                                            <Pressable
                                                style={[styles.saveBtn, {
                                                    flex: 1,
                                                    marginTop: 0,
                                                    backgroundColor: palette.middlegreen,
                                                },
                                                ]}
                                                onPress={() =>
                                                    navigation.navigate(
                                                        'CreateCharitySite',
                                                        {
                                                            mode: 'manager',
                                                            siteId: site.id,
                                                        }
                                                    )
                                                }
                                            >
                                                <AppText variant="bodyBold" style={{ color: 'white' }} >
                                                    Assign Manager
                                                </AppText>
                                            </Pressable>

                                            {/* REMOVE MANAGER */}
                                            <Pressable
                                                style={[
                                                    styles.saveBtn,
                                                    {
                                                        flex: 1,
                                                        marginTop: 0,
                                                        backgroundColor: '#D9534F',
                                                    },
                                                ]}
                                                onPress={() => {
                                                    Alert.alert(
                                                        'Remove Manager',
                                                        'Are you sure you want to remove this manager?',
                                                        [
                                                            {
                                                                text: 'Cancel',
                                                                style: 'cancel',
                                                            },
                                                            {
                                                                text: 'Remove',
                                                                style: 'destructive',
                                                                onPress: async () => {
                                                                    if (actionLoading) return;
                                                                    setActionLoading(true);
                                                                    try {
                                                                        await fetchUsers(true);
                                                                        const admin = users.find((u) =>
                                                                            u.locations?.some(
                                                                                (loc: any) => loc.id === site.id,
                                                                            ),
                                                                        );

                                                                        if (!admin) {
                                                                            Alert.alert('No manager assigned');
                                                                            return;
                                                                        }

                                                                        await deleteUser(admin.id);
                                                                        await loadData(true);

                                                                        showSuccessAlert('Manager removed successfully');

                                                                    } catch (err: unknown) {
                                                                        showErrorAlert(
                                                                            err,
                                                                            'Could not remove manager',
                                                                            'Failed to remove manager',
                                                                        );
                                                                    } finally {
                                                                        setActionLoading(false);
                                                                    }
                                                                },
                                                            },
                                                        ]
                                                    );
                                                }}
                                            >
                                                <AppText variant="bodyBold" style={{ color: 'white' }} >
                                                    Remove Manager
                                                </AppText>
                                            </Pressable>

                                        </View>
                                    </>
                                )}

                            </View>
                        )}
                    </View>
                ))}

                {/* FOOTER */}
                <View style={styles.bottomActions}>

                    <Pressable style={styles.logoutBtn} onPress={logout}>
                        <AppText variant="bodyBold" style={{ color: palette.black }}>
                            Logout
                        </AppText>
                    </Pressable>

                    <Pressable
                        style={styles.logoutBtn}
                        onPress={() =>
                            Alert.alert(
                                'Delete Account',
                                'Are you sure you want to delete your account?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Yes, Delete',
                                        style: 'destructive',
                                        onPress: logout,
                                    },
                                ]
                            )
                        }
                    >
                        <AppText variant="bodyBold" style={{ color: palette.black }}>
                            Delete My Account
                        </AppText>
                    </Pressable>
                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    heroBg: {
        height: hp(18),
        justifyContent: 'center',
        marginBottom: hp(2.5),
    },
    logoTopRight: {
        width: wp(30),
        height: hp(10),
        resizeMode: 'contain',
        position: 'absolute',
        right: wp(5),
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: wp(4),
    },
    businessName: {
        color: 'white',
        textAlign: 'center',
    },
    sectionTitle: {
        marginHorizontal: wp(6),
        marginBottom: hp(2),
        textAlign: 'center',
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: wp(4),
        marginBottom: hp(2.5),
    },
    actionCard: {
        backgroundColor: 'white',
        width: '48%',
        paddingVertical: hp(2.3),
        borderRadius: normalize(14),
        marginBottom: hp(1.4),
        alignItems: 'center',
        elevation: 2,
    },
    actionText: {
        textAlign: 'center',
    },
    bottomActions: {
        marginTop: hp(2),
        paddingHorizontal: wp(4),
        gap: hp(1),
    },
    logoutBtn: {
        backgroundColor: palette.creme,
        paddingVertical: hp(1.5),
        marginHorizontal: wp(4),
        borderRadius: normalize(12),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    siteCard: {
        backgroundColor: 'white',
        marginHorizontal: wp(4),
        marginBottom: hp(1.4),
        padding: wp(4),
        borderRadius: normalize(12),
    },
    siteHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    siteLeft: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'center',
    },
    siteLogo: {
        width: normalize(40),
        height: normalize(40),
        marginRight: wp(2.5),
        resizeMode: 'contain',
    },
    siteIndex: {
        color: palette.primary,
        marginBottom: hp(0.7),
    },
    siteName: {
        flexShrink: 1,
    },
    siteAddress: {
        color: '#777',
    },
    viewBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.7),
        borderRadius: normalize(8),
    },
    viewText: {
        color: 'white',
    },

    editBtn: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.7),
        borderRadius: normalize(8),
    },

    input: {
        backgroundColor: '#FAFAFA',
        padding: normalize(10),
        borderRadius: normalize(8),
        borderWidth: 1,
        borderColor: '#eee',
    },

    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },

    eyeIcon: {
        position: 'absolute',
        right: wp(3),
    },

    saveBtn: {
        marginTop: hp(1.2),
        backgroundColor: palette.middlegreen,
        padding: normalize(12),
        borderRadius: normalize(8),
        alignItems: 'center',
    },
    details: {
        marginTop: hp(1.2),
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: hp(1.2),
    },
});