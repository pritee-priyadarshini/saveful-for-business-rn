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

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'MultiCharityManageSites'>;

type Site = {
    id: string;
    tradingName: string;
    logo: any;
    address: string;
    postCode: string;
    contactName: string;
    email: string;
    mobile: string;
};

export default function MultiCharityManageSitesScreen() {
    const navigation = useNavigation<NavigationProp>();
    const { logout } = useAppContext();
    const [showPassword, setShowPassword] = useState(false);
    const [editingSiteId, setEditingSiteId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});

    const actions = [
        { label: 'Create Site', route: 'CreateCharitySite' },
        { label: 'View Analytics', route: 'CharitySiteAnalytics' },
        { label: 'Your Profile', route: 'CharityAdminProfile' },
        {
            label: 'Contact Saveful',
            action: () => Linking.openURL('https://www.saveful.com/contact'),
        },
    ];

    const businessName = 'Kindness Welfare Association';
    const [expandedSite, setExpandedSite] = useState<string | null>(null);
    const [sites, setSites] = useState<Site[]>([
        {
            id: '1',
            tradingName: 'Kindness Welfare Association - Patrapada',
            logo: require('../../../assets/intro/charity_logo.png'),
            address: 'Patrapada, Bhubaneswar, Khordha',
            postCode: '751019',
            contactName: 'Amit Sharma',
            email: 'amit@kwa.org',
            mobile: '+91 90000 00000',
        },
        {
            id: '2',
            tradingName: 'Kindness Welfare Association - Baramunda',
            logo: require('../../../assets/intro/charity_logo.png'),
            address: 'Baramunda, Bhubaneswar, Khordha',
            postCode: '751001',
            contactName: 'Priya Das',
            email: 'priya@kwa.org',
            mobile: '+91 98888 88888',
        },

        {
            id: '3',
            tradingName: 'Kindness Welfare Association - Rasulgarh',
            logo: require('../../../assets/intro/charity_logo.png'),
            address: 'Rasulgarh, Bhubaneswar, Khordha',
            postCode: '751010',
            contactName: 'Neha Sahoo',
            email: 'neha@kwa.org',
            mobile: '+91 98888 11111',
        },
    ]);

    const businessLogo = sites[0]?.logo;

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView>

                {/* HERO HEADER */}
                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.heroBg}
                >
                    <View style={styles.heroContent}>
                        <AppText variant="h5" style={styles.businessName}> {businessName} </AppText>

                        {businessLogo && (
                            <Image source={businessLogo} style={styles.logoTopRight} />
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
                                <Image source={site.logo} style={styles.siteLogo} />

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
                                    onPress={() =>
                                        setExpandedSite(
                                            expandedSite === site.id ? null : site.id
                                        )
                                    }
                                >
                                    <AppText variant="label" style={styles.viewText}>
                                        View
                                    </AppText>
                                </Pressable>

                                {/* EDIT */}
                                <Pressable
                                    style={styles.editBtn}
                                    onPress={() => {
                                        setEditingSiteId(site.id);
                                        setEditForm({ ...site });
                                        setExpandedSite(site.id);
                                    }}
                                >
                                    <AppText variant="label" style={{ color: 'white' }}>
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
                                            { key: 'tradingName', label: 'Location Name' },
                                            { key: 'address', label: 'Address' },
                                            { key: 'postCode', label: 'Post Code' },
                                            { key: 'contactName', label: 'Admin Name' },
                                            { key: 'email', label: 'Email' },
                                            { key: 'mobile', label: 'Phone' },
                                            { key: 'password', label: 'Password' },
                                        ].map((field: any) => (
                                            <View key={field.key} style={{ marginBottom: 10 }}>
                                                <AppText variant="label">{field.label}</AppText>

                                                <View style={styles.inputWrapper}>
                                                    <TextInput
                                                        value={editForm[field.key] || ''}
                                                        onChangeText={(v) => setEditForm({ ...editForm, [field.key]: v }) }
                                                        style={[
                                                            styles.input,
                                                            field.key === 'password' && { paddingRight: 40 },
                                                        ]}
                                                        secureTextEntry={field.key === 'password' && !showPassword}
                                                    />

                                                    {field.key === 'password' && (
                                                        <Pressable
                                                            style={styles.eyeIcon}
                                                            onPress={() => setShowPassword(!showPassword)}
                                                        >
                                                            <Ionicons
                                                                name={showPassword ? 'eye-off' : 'eye'}
                                                                size={18}
                                                                color="#777"
                                                            />
                                                        </Pressable>
                                                    )}
                                                </View>
                                            </View>
                                        ))}

                                        {/* SAVE BUTTON */}
                                        <Pressable
                                            style={styles.saveBtn}
                                            onPress={() => {
                                                setSites((prev) =>
                                                    prev.map((s) =>
                                                        s.id === editingSiteId ? { ...s, ...editForm } : s
                                                    )
                                                );
                                                setEditingSiteId(null);
                                                setEditForm({});
                                            }}
                                        >
                                            <AppText variant="label" style={{ color: 'white' }}>
                                                Save
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