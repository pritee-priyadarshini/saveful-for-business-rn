import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    Linking,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { InputField } from '../../components/InputField';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useAppContext } from '../../store/AppContext';

export function DriverProfileScreen() {
    const { logout } = useAppContext();
    const [openSection, setOpenSection] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [vehicleOpen, setVehicleOpen] = useState(false);
    const [formData, setFormData] = useState({
        firstName: 'John',
        lastName: 'Doe',
        email: 'driver@email.com',
        mobile: '+91 9876543210',
        password: '',
        license: 'DL-123456',
        vehicle: 'Bike',
        availability: 'Full-time',
    });

    const handleSave = () => {
        console.log('Saving data:', formData);
        Alert.alert('Success', 'Profile updated successfully');
    };

    const updateField = (key: string, value: string) => {
        setFormData((prev) => ({ ...prev, [key]: value }));
    };

    const toggle = (key: string) => {
        setOpenSection(openSection === key ? null : key);
    };

    const openLink = (url: string) => {
        Linking.openURL(url);
    };

    const handleLogout = () => {
        logout();
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: logout },
            ]
        );
    };

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>

                {/* HEADER */}
                <View style={styles.header}>
                    <Image
                        source={require('../../../assets/placeholder/feed-bg.png')}
                        style={styles.headerBg}
                    />

                    <View style={styles.headerContent}>
                        <View>
                            <AppText variant="heading" style={styles.white}>
                                {formData.firstName} {formData.lastName}
                            </AppText>

                            <AppText variant="caption" style={styles.white}>
                                Saveful for Business since 2025
                            </AppText>
                        </View>

                        <Pressable style={styles.profileCircle}>
                            <AppText variant='h5'>
                                {formData.firstName[0]}
                            </AppText>
                        </Pressable>
                    </View>

                    <View style={styles.helpOverlay}>
                        <Card style={styles.helpCard}>
                            <AppText variant="body" style={{ textAlign: 'center' }}>Need a hand?</AppText>

                            <View style={styles.centerDivider} />

                            <AppText variant="bodySmall">
                                We're here to help! If you need a hand with anything in the app, or have any questions feel free to reach out and we'll help out.
                            </AppText>


                            <Pressable
                                style={styles.supportBtn}
                                onPress={() => openLink('https://www.saveful.com/contact')}
                            >
                                <AppText variant="bodyBold">Contact Support </AppText>
                            </Pressable>
                        </Card>
                    </View>
                </View>

                <View style={styles.content}>

                    {/* ACCORDIONS */}
                    {['personal', 'contact', 'driver'].map((key) => (
                        <View key={key}>
                            <Pressable
                                style={styles.accordionHeader}
                                onPress={() => toggle(key)}
                            >
                                <AppText variant="bodyLarge">
                                    {key === 'personal'
                                        ? 'Personal Details'
                                        : key === 'contact'
                                            ? 'Contact Details'
                                            : 'Driver Details'}
                                </AppText>

                                <Ionicons
                                    name={openSection === key ? 'remove' : 'add'}
                                    size={18}
                                />
                            </Pressable>

                            {openSection === key && (
                                <Card style={styles.accordionContent}>

                                    {key === 'personal' && (
                                        <>
                                            <InputField label="First Name" value={formData.firstName} editable={false} />
                                            <InputField label="Last Name" value={formData.lastName} editable={false} />
                                        </>
                                    )}

                                    {key === 'contact' && (
                                        <>
                                            <InputField label="Email" value={formData.email} editable={false} />
                                            <InputField
                                                label="Mobile"
                                                value={formData.mobile}
                                                onChangeText={(v) => updateField('mobile', v)}
                                            />

                                            <View style={styles.passwordWrapper}>
                                                <InputField
                                                    label="Password"
                                                    value={formData.password}
                                                    secureTextEntry={!showPassword}
                                                    onChangeText={(v) => updateField('password', v)}
                                                />

                                                <Pressable
                                                    style={styles.eyeIcon}
                                                    onPress={() => setShowPassword(!showPassword)}
                                                >
                                                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} />
                                                </Pressable>
                                            </View>
                                        </>
                                    )}

                                    {key === 'driver' && (
                                        <>
                                            <InputField label="License" value={formData.license} onChangeText={(v) => updateField('license', v)} />
                                            {/* VEHICLE */}
                                            <View style={{ marginTop: spacing.sm }}>
                                                <AppText variant="bodyBold">Vehicle</AppText>
                                                <Pressable
                                                    style={[
                                                        styles.dropdownTrigger,
                                                        vehicleOpen && styles.dropdownActive,
                                                    ]}
                                                    onPress={() => setVehicleOpen((prev) => !prev)}
                                                >
                                                    <AppText variant="bodyBold" style={{ color: formData.vehicle ? palette.black : palette.stone }}>
                                                        {formData.vehicle || 'Select vehicle'}
                                                    </AppText>

                                                    <Ionicons
                                                        name={vehicleOpen ? 'chevron-up' : 'chevron-down'}
                                                        size={18}
                                                        color="#666"
                                                    />
                                                </Pressable>
                                            </View>
                                            {vehicleOpen && (
                                                <View style={styles.dropdownMenu}>
                                                    {['Bike', 'Scooter', 'Car', 'Mini Van', 'Mini Truck'].map((v) => (
                                                        <Pressable
                                                            key={v}
                                                            style={styles.dropdownItem}
                                                            onPress={() => {
                                                                updateField('vehicle', v);
                                                                setVehicleOpen(false);
                                                            }}
                                                        >
                                                            <AppText variant="bodySmall">{v}</AppText>
                                                        </Pressable>
                                                    ))}
                                                </View>
                                            )}
                                        </>
                                    )}

                                    {key !== 'personal' && (
                                        <Pressable style={styles.saveBtn} onPress={handleSave}>
                                            <AppText variant="bodyBold" style={{ color: palette.white }}>Save Changes</AppText>
                                        </Pressable>
                                    )}

                                </Card>
                            )}
                        </View>
                    ))}

                    {/* LINKS */}
                    {[
                        { label: 'Privacy Policy', url: 'https://www.saveful.com/privacy-policy' },
                        { label: 'Terms of Service', url: 'https://www.saveful.com/app-terms-conditions' },
                        { label: 'FAQ', url: 'https://www.saveful.com/faq' },
                    ].map((item, i) => (
                        <Pressable
                            key={i}
                            style={styles.linkRow}
                            onPress={() => openLink(item.url)}
                        >
                            <AppText variant="bodyLarge">{item.label}</AppText>
                            <Ionicons name="open-outline" size={18} />
                        </Pressable>
                    ))}

                    {/* UN FACT */}
                    <Card style={styles.card}>
                        <Pressable onPress={() => openLink('https://wedocs.unep.org/items/dbe2cd4c-8384-4636-8359-5847f42b9711')}>
                            <AppText variant="bodySmall">
                                🌍 ^United Nations Environment Programs's Food Waste Index Report
                                2024: Think, Eat, Save, Tracking Food Waste to Halve Global Food Waste.
                            </AppText>
                        </Pressable>
                    </Card>

                    {/* ACTIONS */}
                    <Pressable style={styles.actionBtn} onPress={handleLogout}>
                        <AppText variant="bodyBold">Log out</AppText>
                    </Pressable>

                    <Pressable style={styles.actionBtn} onPress={handleDelete}>
                        <AppText variant="bodyBold">Delete my account</AppText>
                    </Pressable>

                </View>
            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    header: { height: 220 },

    headerBg: { width: '100%', height: '100%' },

    headerContent: {
        position: 'absolute',
        top: 20,
        left: spacing.md,
        right: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    helpOverlay: {
        position: 'absolute',
        bottom: -70,
        left: spacing.xl,
        right: spacing.xl,
    },

    helpCard: {
        padding: spacing.xl,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        backgroundColor: palette.white,
        gap: spacing.sm,
    },

    centerDivider: {
        width: '96%',
        height: 1,
        backgroundColor: palette.border,
    },

    content: {
        marginTop: 80,
        padding: spacing.md,
        marginHorizontal: spacing.sm,
    },

    profileCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: palette.radish,
        alignItems: 'center',
        justifyContent: 'center',
    },

    avatar: { width: '100%', height: '100%' },

    white: { color: palette.white },

    accordionHeader: {
        paddingVertical: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 0.5,
        borderColor: palette.border,
    },

    accordionContent: {
        padding: spacing.sm,
        backgroundColor: palette.white,
        borderRadius: 12,
    },

    passwordWrapper: { position: 'relative' },

    eyeIcon: { position: 'absolute', right: 10, top: 38 },

    saveBtn: {
        marginTop: spacing.sm,
        backgroundColor: palette.primary,
        padding: spacing.md,
        borderRadius: 10,
        alignItems: 'center',
    },

    linkRow: {
        paddingVertical: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderBottomWidth: 0.5,
        borderColor: palette.border,
    },

    actionBtn: {
        marginHorizontal: spacing.lg,
        marginTop: spacing.md,
        padding: spacing.md,
        borderRadius: 6,
        borderWidth: 1,
        alignItems: 'center',
    },
    supportBtn: {
        borderWidth: 1,
        padding: spacing.sm,
        borderRadius: 10,
        alignItems: 'center',
    },

    card: {
        padding: spacing.md,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: palette.border,
        marginTop: spacing.md,
    },

    dropdownTrigger: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 10,
        padding: spacing.sm,
        marginTop: spacing.xs,
        backgroundColor: palette.white,

        flexDirection: 'row',              // 🔥 important
        justifyContent: 'space-between',   // 🔥 space text + icon
        alignItems: 'center',
    },

    dropdownActive: {
        borderColor: palette.middlegreen,      // highlight when open
    },

    dropdownMenu: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 10,
        marginTop: 4,
        backgroundColor: palette.white,
        overflow: 'hidden',
    },

    dropdownItem: {
        padding: spacing.sm,
        borderBottomWidth: 0.5,
        borderColor: palette.border,
    },
});