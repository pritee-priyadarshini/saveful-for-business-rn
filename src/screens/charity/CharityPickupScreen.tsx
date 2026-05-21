import React, { useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    ImageBackground,
    Modal,
    Alert,
    Linking,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';

import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { AppText } from '../../components/AppText';

import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';
import { ListingStatus, OrderStatus } from '@/types';

const { width, height } = Dimensions.get("window");
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

type Driver = {
    id: string;
    name: string;
    phone: string;
    online: boolean;
};

type Pickup = {
    id: string;
    restaurantName: string;
    restaurantAddress: string;
    distance: string;
    restaurantPhone: string;
    listingStatus: ListingStatus;
    orderStatus: OrderStatus;
    driverName: string | null;
    driverPhone: string | null;
    pickupDate: string;
    pickupTime: string;
    instructions: string;
    items: any[];
};

const drivers: Driver[] = [
    {
        id: 'd1',
        name: 'Rahul Das',
        phone: '+91 9876512345',
        online: true,
    },
    {
        id: 'd2',
        name: 'Sanjay Rout',
        phone: '+91 9876523456',
        online: false,
    },
    {
        id: 'd3',
        name: 'Amit Sahu',
        phone: '+91 9876534567',
        online: true,
    },
];

const initialPickups: Pickup[] = [
    {
        id: '1',
        restaurantName: 'Spice Route Kitchen',
        restaurantAddress: 'Patia Main Road, Bhubaneswar',
        distance: '1.8 km away',
        restaurantPhone: '+91 9876543210',
        listingStatus: 'CLAIMED',
        orderStatus: 'enroute',
        driverName: 'Rahul Das',
        driverPhone: '+91 9876512345',
        pickupDate: '28/04/2026',
        pickupTime: '5:30 PM',
        instructions: 'Needs refrigeration',
        items: [
            { name: 'Rice', available: 10, claimed: 10 },
            { name: 'Dal', available: 8, claimed: 8 },
            { name: 'Sweets', available: 4, claimed: 4 },
        ],
    },
    {
        id: '2',
        restaurantName: 'Biryani Box',
        restaurantAddress: 'Saheed Nagar, Bhubaneswar',
        distance: '3.2 km away',
        restaurantPhone: '+91 9876500000',
        listingStatus: 'PARTIAL',
        orderStatus: 'driver_assigned',
        driverName: null,
        driverPhone: null,
        pickupDate: '28/04/2026',
        pickupTime: '7:00 PM',
        instructions: 'Reheat before serving',
        items: [
            { name: 'Fruits', available: 15, claimed: 8 },
            { name: 'Bread', available: 10, claimed: 4 },
            { name: 'Vegetables', available: 12, claimed: 6 },
        ],
    },
];

function prettyStatus(status: string) {
    return status
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function prettyListingStatus(status: ListingStatus) {
    if (status === 'PARTIAL') return 'Partial Claimed';
    return status.charAt(0) + status.slice(1).toLowerCase();
}

export default function CharityPickupScreen({ navigation, }: any) {
    const [pickups, setPickups] = useState(initialPickups);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<Record<string, string>>({});
    const modalTotals = useMemo(() => {
        const totalAvailable = selectedItems.reduce((sum, i) => sum + (i.available || 0), 0);
        const totalClaimed = selectedItems.reduce((sum, i) => sum + (i.claimed || 0), 0);
        return { totalAvailable, totalClaimed };
    }, [selectedItems]);

    const makeCall = async (phone?: string | null) => {
        if (!phone) {
            Alert.alert('Unavailable', 'Phone number not available');
            return;
        }

        const url = `tel:${phone.replace(/[^+\d]/g, '')}`;
        try {
            await Linking.openURL(url);
        } catch {
            Alert.alert('Error', 'Unable to open dialer');
        }
    };

    const sendMessage = async (phone?: string | null) => {
        if (!phone) {
            Alert.alert('Unavailable', 'Phone number not available');
            return;
        }
        await Linking.openURL(`sms:${phone}`);
    };

    const assignDriver = (pickupId: string) => {
        const driverId = selectedDriver[pickupId];
        if (!driverId) return;

        const driver = drivers.find(
            d => d.id === driverId
        );

        if (!driver) return;

        setPickups(prev =>
            prev.map(p =>
                p.id === pickupId
                    ? {
                        ...p,
                        driverName: driver.name,
                        driverPhone: driver.phone,
                    }
                    : p
            )
        );

        setExpandedDriverId(null);
    };

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView contentContainerStyle={styles.container} >
                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.headerBg}
                >
                    <AppText variant="h5" style={styles.white} > Your Pickups </AppText>
                </ImageBackground>

                {pickups.map(item => {
                    return (
                        <Card key={item.id} style={styles.card}>
                            {/* TOP */}
                            <View style={styles.topRow}>
                                <View style={styles.leftBlock}>
                                    <AppText variant="bodyBold">{item.restaurantName}</AppText>
                                    <AppText variant="caption"> 📍 {item.restaurantAddress}</AppText>
                                    <AppText variant="caption"> {item.distance} </AppText>
                                    <View style={styles.driverRow}>
                                        <AppText variant="bodySmall" style={styles.driverInline} >
                                            <AppText variant="caption" style={styles.driverLabel} >
                                                Driver:{' '}
                                            </AppText>
                                            {item.driverName || 'To be assigned'}
                                        </AppText>
                                    </View>
                                </View>

                                <View style={styles.statusWrap}>
                                    <View
                                        style={[
                                            styles.statusPill,
                                            item.listingStatus === 'PARTIAL' ? styles.partialPill : styles.claimedPill,
                                        ]}
                                    >
                                        <AppText variant="caption" style={styles.statusText} >
                                            {prettyListingStatus(item.listingStatus)}
                                        </AppText>
                                    </View>

                                    <View style={styles.driverStatusPill}>
                                        <AppText variant="caption" style={styles.statusText} >
                                            {!item.driverName ? 'Awaiting Driver' : prettyStatus(item.orderStatus || 'awaiting_driver')}
                                        </AppText>
                                    </View>

                                    <View>
                                        {item.listingStatus !== 'ACTIVE' ? (
                                            <Pressable
                                                style={styles.trackBtn}
                                                onPress={() =>
                                                    navigation.navigate('DriverTracking', {
                                                        trackingId: item.id,
                                                        source: 'charity',
                                                    })
                                                }
                                            >
                                                <AppText variant="label" style={styles.trackText} > Track </AppText>
                                            </Pressable>
                                        ) : null}
                                    </View>


                                </View>
                            </View>

                            {/* META */}
                            <View style={styles.metaRow}>
                                <Pressable
                                    style={styles.metaCard}
                                    onPress={() => {
                                        setSelectedItems(item.items);
                                        setModalVisible(true);
                                    }}
                                >
                                    <AppText variant="label"> Items </AppText>
                                    <View style={styles.viewBtn}>
                                        <AppText variant="label" style={styles.viewText} > View </AppText>
                                    </View>
                                </Pressable>

                                <View style={styles.metaCard}>
                                    <AppText variant="label"> Pickup Date </AppText>
                                    <AppText variant="bodySmall"> {item.pickupDate} </AppText>
                                </View>

                                <View style={styles.metaCard}>
                                    <AppText variant="label"> Pickup Time </AppText>
                                    <AppText variant="bodySmall"> {item.pickupTime} </AppText>
                                </View>
                            </View>

                            {/* INSTRUCTION */}
                            <View style={styles.infoBlock}>
                                <AppText variant="caption"> Instructions:{" "} {item.instructions} </AppText>
                            </View>

                            {/* DRIVER ASSIGN */}
                            <Pressable
                                style={styles.modifyBtn}
                                onPress={() =>
                                    setExpandedDriverId(
                                        expandedDriverId === item.id ? null : item.id
                                    )
                                }
                            >
                                <AppText variant="label" style={styles.modifyText} >
                                    {item.driverName ? 'Modify Driver' : 'Add Driver'}
                                </AppText>
                            </Pressable>

                            {
                                expandedDriverId === item.id && (
                                    <View style={styles.assignBox}>
                                        <View style={styles.driverDropdown} >
                                            <Picker
                                                selectedValue={
                                                    selectedDriver[
                                                    item.id
                                                    ] || ''
                                                }
                                                onValueChange={v =>
                                                    setSelectedDriver(
                                                        prev => ({
                                                            ...prev,
                                                            [item.id]: v,
                                                        })
                                                    )
                                                }
                                            >
                                                <Picker.Item label="Select driver" value="" />

                                                {drivers.map(driver => (
                                                    <Picker.Item
                                                        key={driver.id}
                                                        label={`${driver.online ? '✓' : '✕'} ${driver.name}`}
                                                        value={driver.id}
                                                    />
                                                ))}
                                            </Picker>
                                        </View>

                                        {selectedDriver[item.id] && (
                                            <View style={styles.driverAssignedRow} >
                                                <AppText variant="bodySmall">
                                                    Driver to be assigned:{' '}
                                                    <AppText variant="label">
                                                        {
                                                            drivers.find(
                                                                d => d.id === selectedDriver[item.id]
                                                            )?.name
                                                        }
                                                    </AppText>
                                                </AppText>

                                                <Ionicons
                                                    name={
                                                        drivers.find(
                                                            d => d.id === selectedDriver[item.id]
                                                        )?.online ? 'checkmark-circle' : 'close-circle'
                                                    }
                                                    size={normalize(22)}
                                                    color={
                                                        drivers.find(
                                                            d => d.id === selectedDriver[item.id]
                                                        )?.online ? palette.middlegreen : palette.chilli
                                                    }
                                                />
                                            </View>
                                        )}

                                        <Pressable
                                            style={styles.saveBtn}
                                            onPress={() => assignDriver(item.id)}
                                        >
                                            <AppText variant="label" style={styles.saveBtnText}> Save Driver </AppText>
                                        </Pressable>
                                    </View>
                                )
                            }

                            {/* CONTACT RESTAURANT */}
                            <View style={styles.contactLine}>
                                <AppText variant="bodyBold"> Contact Restaurant </AppText>

                                <View style={styles.iconRow}>
                                    <Pressable
                                        style={styles.iconPill}
                                        onPress={() => makeCall(item.restaurantPhone)}
                                    >
                                        <Ionicons name="call-outline" size={normalize(18)} color={palette.white} />
                                        <AppText variant="label" style={styles.iconText} > Call </AppText>
                                    </Pressable>

                                    <Pressable
                                        style={styles.iconPill}
                                        onPress={() => sendMessage(item.restaurantPhone)}
                                    >
                                        <Ionicons name="chatbubble-outline" size={normalize(18)} color={palette.white} />
                                        <AppText variant="label" style={styles.iconText} > Message </AppText>
                                    </Pressable>
                                </View>
                            </View>

                            {/* CONTACT DRIVER */}
                            {
                                item.driverPhone && (
                                    <View style={styles.contactLine}>
                                        <AppText variant="bodyBold"> Contact Driver </AppText>
                                        <View style={styles.iconRow}>
                                            <Pressable
                                                style={styles.iconPill}
                                                onPress={() => makeCall(item.driverPhone)}
                                            >
                                                <Ionicons name="call-outline" size={normalize(18)} color={palette.white} />
                                                <AppText variant="label" style={styles.iconText} > Call </AppText>
                                            </Pressable>

                                            <Pressable
                                                style={styles.iconPill}
                                                onPress={() => sendMessage(item.driverPhone)}
                                            >
                                                <Ionicons name="chatbubble-outline" size={normalize(18)} color={palette.white} />
                                                <AppText variant="label" style={styles.iconText} > Message </AppText>
                                            </Pressable>
                                        </View>
                                    </View>
                                )
                            }
                        </Card>
                    );
                })}
            </ScrollView>

            <Modal
                visible={modalVisible}
                transparent
                animationType="slide"
            >
                <View style={styles.modalWrap} >
                    <View style={styles.modalCard} >
                        <View style={styles.modalTopBar}>
                            <AppText variant="h6"> Items </AppText>

                            <Pressable
                                style={styles.closeIconBtn}
                                onPress={() => setModalVisible(false)}
                            >
                                <Ionicons name="close" size={normalize(20)} color={palette.black} />
                            </Pressable>
                        </View>

                        <View style={styles.modalHeaderRow} >
                            <AppText variant="bodyBold" style={{ flex: 2, }}> Item Name </AppText>

                            <AppText variant="bodyBold" style={styles.modalCol} >
                                Available
                            </AppText>

                            <AppText variant="bodyBold" style={styles.modalCol} >
                                Claimed
                            </AppText>
                        </View>

                        {selectedItems.map(
                            (item, idx) => (
                                <View
                                    key={idx}
                                    style={styles.modalItemRow}
                                >
                                    <AppText variant="label" style={{ flex: 2, }} >
                                        {item.name}
                                    </AppText>

                                    <AppText variant="bodySmall" style={styles.modalCol} >
                                        {item.available} kg
                                    </AppText>

                                    <AppText variant="bodySmall" style={styles.modalCol} >
                                        {item.claimed} kg
                                    </AppText>
                                </View>
                            )
                        )}

                        <AppText variant="bodyBold">
                            Total Quantity:{' '}{modalTotals.totalAvailable}{' '} kg
                        </AppText>

                        <AppText variant="bodyBold">
                            Total Claimed:{' '} {modalTotals.totalClaimed}{' '} kg
                        </AppText>
                    </View>
                </View>
            </Modal>
        </Screen >
    );
}

const styles = StyleSheet.create({
    container: {
        gap: hp(2),
        paddingBottom: hp(4),
    },

    headerBg: {
        width: '100%',
        height: hp(18),
        justifyContent: 'center',
        alignItems: 'center',
    },

    white: {
        color: palette.white,
    },

    card: {
        padding: wp(4),
        marginHorizontal: wp(4),
        borderRadius: normalize(16),
        gap: hp(1.2),
        backgroundColor: palette.radish,
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },

    leftBlock: {
        flex: 1,
        gap: hp(0.5),
    },

    statusWrap: {
        alignItems: 'flex-end',
        gap: hp(0.8),
    },

    statusPill: {
        width: wp(30),
        paddingVertical: hp(0.7),
        borderRadius: normalize(999),
        alignItems: 'center',
    },

    claimedPill: {
        backgroundColor: palette.middlegreen,
    },

    partialPill: {
        backgroundColor: palette.primary,
    },

    statusText: {
        color: palette.white,
    },

    driverRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        marginTop: hp(0.5),
    },

    driverLabel: {
        color: palette.stone,
    },

    driverInline: {
        flex: 1,
        lineHeight: normalize(22),
        paddingRight: wp(2.5),
    },

    driverStatusPill: {
        backgroundColor: palette.orange,
        width: wp(30),
        paddingVertical: hp(0.7),
        borderRadius: normalize(999),
        alignItems: 'center',
    },

    trackBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'flex-end',
        backgroundColor: palette.primary,
        paddingVertical: hp(0.7),
        borderRadius: normalize(999),
        width: wp(30),
    },

    trackText: {
        color: palette.white,
    },

    metaRow: {
        flexDirection: 'row',
        gap: wp(2.5),
    },

    metaCard: {
        flex: 1,
        backgroundColor: palette.creme,
        padding: wp(2.5),
        borderRadius: normalize(12),
        gap: hp(0.8),
        alignItems: 'center',
    },

    viewBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: wp(4),
        paddingVertical: hp(0.7),
        borderRadius: normalize(999),
    },

    viewText: {
        color: palette.white,
    },

    infoBlock: {
        backgroundColor: palette.white,
        padding: wp(2.5),
        borderRadius: normalize(10),
    },

    modifyBtn: {
        backgroundColor: palette.primary,
        paddingVertical: hp(1.3),
        borderRadius: normalize(14),
        alignItems: 'center',
    },

    modifyText: {
        color: palette.white,
    },

    assignBox: {
        gap: hp(1.2),
    },

    driverDropdown: {
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: normalize(12),
        overflow: 'hidden',
        backgroundColor: palette.white,
    },

    driverAssignedRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    saveBtn: {
        backgroundColor: palette.middlegreen,
        paddingVertical: hp(1.3),
        borderRadius: normalize(14),
        alignItems: 'center',
    },

    saveBtnText: {
        color: palette.white,
    },

    contactLine: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    iconRow: {
        flexDirection: 'row',
        gap: wp(2.5),
    },

    iconPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.5),
        backgroundColor: palette.middlegreen,
        paddingHorizontal: wp(3),
        paddingVertical: hp(0.9),
        borderRadius: normalize(999),
    },

    iconText: {
        color: palette.white,
    },

    modalWrap: {
        flex: 1,
        justifyContent: 'flex-end',
    },

    modalCard: {
        backgroundColor: palette.white,
        padding: wp(4),
        borderTopLeftRadius: normalize(24),
        borderTopRightRadius: normalize(24),
        gap: hp(1.2),
    },

    modalTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    closeIconBtn: {
        width: normalize(36),
        height: normalize(36),
        borderRadius: normalize(18),
        backgroundColor: '#dadbdd',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalHeaderRow: {
        flexDirection: 'row',
        paddingBottom: hp(1.2),
        borderBottomWidth: 1,
        borderColor: palette.border,
    },

    modalItemRow: {
        flexDirection: 'row',
        paddingVertical: hp(0.5),
    },

    modalCol: {
        flex: 1,
        textAlign: 'center',
    },
});