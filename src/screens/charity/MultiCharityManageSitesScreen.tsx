import React, { useState } from 'react';
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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/AppNavigator';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { useAppContext } from '@/store/AppContext';
import { palette } from '@/theme/colors';
import { spacing } from '@/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { charityService } from '@/services/charity.service';

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
    const [showPassword, setShowPassword] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState<number | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [loading, setLoading] = useState(true);
    const [sites, setSites] = useState<Site[]>([]);
    const [expandedSite, setExpandedSite] = useState<number | null>(null);
    const businessLogo = currentProfile.logo || authUser?.profile?.organisation?.logoUrl || null;

    const actions = [
        { label: 'Create Site', route: 'CreateCharitySite' },
        { label: 'View Analytics', route: 'CharitySiteAnalytics' },
        { label: 'Your Profile', route: 'CharityAdminProfile' },
        {
            label: 'Contact Saveful',
            action: () => Linking.openURL('https://www.saveful.com/contact'),
        },
    ];

    React.useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        try {
            setLoading(true);

            const [locationsRes, usersRes] = await Promise.all([charityService.listLocations(), charityService.listUsers(),]);
            const locations = locationsRes.data || [];
            const users = usersRes.data || [];
            const formattedSites = locations.map(
                (location: any) => {
                    const admin =
                        users.find(
                            (u: any) =>
                                u.locationId === location.id &&
                                (
                                    u.role === 'LOCATION_ADMIN' ||
                                    u.role === 'HEAD_OFFICE_ADMIN'
                                )
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
                        radiusKm: location.radiusKm,
                        logoUrl: currentProfile.logo ||  authUser?.profile?.organisation?.logoUrl || '',
                    };
                }
            );

            setSites(formattedSites);

        } catch (err) {
            Alert.alert('Error', 'Failed to load locations');
        } finally {
            setLoading(false);
        }
    };

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
            <ScrollView>

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
                            <AppText variant="label" style={styles.actionText}>
                                {item.label}
                            </AppText>
                        </Pressable>
                    ))}
                </View>

                {/* SITES */}
                <AppText variant="subheading" style={styles.sectionTitle}>
                    Your Sites
                </AppText>

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
                                    <AppText variant="label" style={styles.siteName}>
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

                            <View style={{ alignItems: 'flex-end', gap: 6 }}>

                                {/* VIEW */}
                                <Pressable
                                    style={styles.viewBtn}
                                    onPress={async () => {
                                        try {
                                            if (!editingSiteId) return;
                                            await charityService.updateLocation(
                                                Number(editingSiteId),
                                                {
                                                    locationName: editForm.tradingName,
                                                    address: editForm.address,
                                                    postcode: editForm.postCode,
                                                    contactName: editForm.contactName,
                                                    contactEmail: editForm.email,
                                                    contactMobile: editForm.mobile,
                                                }
                                            );

                                            await fetchLocations();

                                            setEditingSiteId(null);
                                            setEditForm({});

                                            Alert.alert('Success', 'Location updated');

                                        } catch (err: any) {
                                            Alert.alert('Error', err?.response?.data?.message || 'Failed to update location');
                                        }
                                    }}
                                >
                                    <AppText variant="label" style={styles.viewText}>
                                        View
                                    </AppText>
                                </Pressable>

                                {/* EDIT */}
                                <Pressable
                                    style={styles.editBtn}
                                    onPress={async () => {
                                        try {
                                            const [locationRes, usersRes] =
                                                await Promise.all([
                                                    charityService.getLocation(site.id),
                                                    charityService.listUsers(),
                                                ]);

                                            const location = locationRes.data;
                                            const admin =
                                                usersRes.data?.find(
                                                    (u: any) =>
                                                        u.locationId === site.id &&
                                                        (
                                                            u.role === 'LOCATION_ADMIN' ||
                                                            u.role === 'HEAD_OFFICE_ADMIN'
                                                        )
                                                );

                                            setEditingSiteId(site.id);

                                            setEditForm({
                                                tradingName: location.locationName || '',
                                                address: location.address || '',
                                                postCode: location.postcode || '',
                                                contactName: admin ? `${admin.firstName} ${admin.lastName}` : '',
                                                email: admin?.email || '',
                                                mobile: admin?.mobile || '',
                                                radiusKm: location.radiusKm || '',
                                                latitude: location.latitude || '',
                                                longitude: location.longitude || '',
                                            });

                                            setExpandedSite(site.id);

                                        } catch (err) {
                                            Alert.alert('Error', 'Failed to load location details');
                                        }
                                    }}
                                >
                                    <AppText variant="label" style={{ color: 'white' }} >
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
                                                key: 'contactName',
                                                label: 'Admin Name',
                                            },
                                            {
                                                key: 'email',
                                                label: 'Email',
                                            },
                                            {
                                                key: 'mobile',
                                                label: 'Phone',
                                            },
                                            {
                                                key: 'radiusKm',
                                                label: 'Pickup Radius (km)',
                                            },
                                        ].map((field: any) => (
                                            <View
                                                key={field.key}
                                                style={{ marginBottom: 10 }}
                                            >
                                                <AppText variant="label">
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
                                            style={styles.saveBtn}
                                            onPress={async () => {
                                                try {

                                                    if (!editingSiteId) {
                                                        return;
                                                    }

                                                    await charityService.updateLocation(
                                                        editingSiteId,
                                                        {
                                                            locationName: editForm.tradingName,
                                                            address: editForm.address,
                                                            postcode: editForm.postCode,
                                                            contactName: editForm.contactName,
                                                            contactEmail: editForm.email,
                                                            contactMobile: editForm.mobile,
                                                            radiusKm: Number(editForm.radiusKm),
                                                        }
                                                    );
                                                    const usersRes = await charityService.listUsers();
                                                    const admin =
                                                        usersRes.data?.find(
                                                            (u: any) =>
                                                                u.locationId === editingSiteId &&
                                                                (
                                                                    u.role === 'LOCATION_ADMIN' ||
                                                                    u.role === 'HEAD_OFFICE_ADMIN'
                                                                )
                                                        );

                                                    if (admin) {
                                                        await charityService.updateUser(
                                                            admin.id,
                                                            {
                                                                firstName: editForm.contactName?.split(' ')[0] || '',
                                                                lastName: editForm.contactName?.split(' ')?.slice(1)?.join(' ') || '',
                                                                mobile: editForm.mobile,
                                                            }
                                                        );
                                                    }

                                                    await fetchLocations();

                                                    setEditingSiteId(null);
                                                    setEditForm({});

                                                    Alert.alert('Success', 'Location updated successfully');

                                                } catch (err: any) {
                                                    Alert.alert(
                                                        'Error',
                                                        err?.response?.data?.message ||
                                                        'Failed to update location'
                                                    );
                                                }
                                            }}
                                        >
                                            <AppText variant="label" style={{ color: 'white' }} >
                                                Save
                                            </AppText>
                                        </Pressable>

                                        {/* DELETE */}
                                        <Pressable
                                            style={[
                                                styles.saveBtn,
                                                {
                                                    backgroundColor: '#D9534F',
                                                    marginTop: 10,
                                                },
                                            ]}
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
                                                                try {
                                                                    await charityService.deactivateLocation(site.id);
                                                                    await fetchLocations();
                                                                    setExpandedSite(null);
                                                                    Alert.alert('Deleted', 'Location removed successfully');

                                                                } catch {
                                                                    Alert.alert(
                                                                        'Error',
                                                                        'Failed to remove location'
                                                                    );
                                                                }
                                                            },
                                                        },
                                                    ]
                                                );
                                            }}
                                        >
                                            <AppText variant="label" style={{ color: 'white' }} >
                                                Delete Location
                                            </AppText>
                                        </Pressable>
                                    </>
                                ) : (
                                    <>
                                        <AppText variant="label">
                                            Manager: {site.contactName}
                                        </AppText>

                                        <AppText variant="label">
                                            Email: {site.email}
                                        </AppText>

                                        <AppText variant="label">
                                            Mobile: {site.mobile}
                                        </AppText>

                                        {!!site.radiusKm && (
                                            <AppText variant="label">
                                                Pickup Radius: {site.radiusKm} km
                                            </AppText>
                                        )}
                                    </>
                                )}

                            </View>
                        )}
                    </View>
                ))}

                {/* FOOTER */}
                <View style={styles.bottomActions}>

                    <Pressable style={styles.logoutBtn} onPress={logout}>
                        <AppText variant="label" style={{ color: palette.black }}>
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
                        <AppText variant="label" style={{ color: palette.black }}>
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
        height: 140,
        justifyContent: 'center',
        marginBottom: 20,
    },
    logoTopRight: {
        width: 120,
        height: 80,
        resizeMode: 'contain',
        position: 'absolute',
        right: 20,
    },
    heroContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    businessName: {
        color: 'white',
    },
    sectionTitle: {
        marginHorizontal: spacing.xl,
        marginBottom: spacing.xl,
        textAlign: 'center',
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        marginBottom: 20,
    },
    actionCard: {
        backgroundColor: 'white',
        width: '48%',
        paddingVertical: 20,
        borderRadius: 14,
        marginBottom: 12,
        alignItems: 'center',
        elevation: 2,
    },
    actionText: {
        textAlign: 'center',
    },
    bottomActions: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.lg,
        gap: spacing.sm,
    },
    logoutBtn: {
        backgroundColor: palette.creme,
        paddingVertical: spacing.md,
        marginHorizontal: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: palette.border,
    },
    siteCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 16,
        borderRadius: 12,
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
        width: 40,
        height: 40,
        marginRight: 10,
        resizeMode: 'contain',
    },
    siteIndex: {
        color: palette.primary,
        marginBottom: 6,
    },
    siteName: {
        flexShrink: 1,
    },
    siteAddress: {
        color: '#777',
    },
    viewBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },
    viewText: {
        color: 'white',
    },

    editBtn: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },

    input: {
        backgroundColor: '#FAFAFA',
        padding: 10,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
    },

    inputWrapper: {
        position: 'relative',
        justifyContent: 'center',
    },

    eyeIcon: {
        position: 'absolute',
        right: 12,
    },

    saveBtn: {
        marginTop: 10,
        backgroundColor: palette.middlegreen,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    details: {
        marginTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#eee',
        paddingTop: 10,
    },
});