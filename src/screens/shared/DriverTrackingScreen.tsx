import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ImageBackground,
    Modal,
    Alert,
    Linking,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Card } from '../../components/Card';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { ListingStatus, OrderStatus } from '../../types';

type Params = {
    DriverTracking: {
        trackingId: string;
        source: 'restaurant' | 'charity' | 'farmer';
    };
};

type TrackItem = {
    name: string;
    available: number;
    claimed: number;
};

type TrackData = {
    id: string;
    source: 'restaurant' | 'charity' | 'farmer';
    listingStatus: ListingStatus;
    orderStatus: OrderStatus;
    restaurantName: string;
    restaurantAddress: string;
    restaurantPhone: string;
    charityName: string;
    charityAddress: string;
    charityPhone: string;
    driverName: string | null;
    driverPhone: string | null;
    pickupDate: string;
    pickupTime: string;
    instructions: string;
    distance: string;
    items: TrackItem[];
};

const STEPS: OrderStatus[] = [
    'awaiting_driver',
    'driver_assigned',
    'enroute',
    'collected',
    'verified',
    'completed',
];

const trackingData: TrackData[] = [
    {
        id: '1',
        source: 'charity',
        listingStatus: 'Claimed',
        orderStatus: 'completed',
        restaurantName: 'Spice Route Kitchen',
        restaurantAddress: 'Patia Main Road, Bhubaneswar',
        restaurantPhone: '+91 9876543210',
        charityName: 'Feeding Hands Foundation',
        charityAddress: 'Patia, Bhubaneswar',
        charityPhone: '+91 9876511111',
        driverName: 'Rahul Das',
        driverPhone: '+91 9876512345',
        pickupDate: '28/04/2026',
        pickupTime: '5:30 PM',
        instructions: 'Needs refrigeration',
        distance: '1.8 km away',
        items: [
            { name: 'Rice', available: 10, claimed: 10 },
            { name: 'Dal', available: 8, claimed: 8 },
            { name: 'Sweets', available: 4, claimed: 4 },
        ],
    },
    {
        id: '2',
        source: 'charity',
        listingStatus: 'Partial claimed',
        orderStatus: 'driver_assigned',
        restaurantName: 'Biryani Box',
        restaurantAddress: 'Saheed Nagar, Bhubaneswar',
        restaurantPhone: '+91 9876500000',
        charityName: 'Odisha Food Relief',
        charityAddress: 'Khandagiri, Bhubaneswar',
        charityPhone: '+91 9876533333',
        driverName: null,
        driverPhone: null,
        pickupDate: '28/04/2026',
        pickupTime: '7:00 PM',
        instructions: 'Reheat before serving',
        distance: '3.2 km away',
        items: [
            { name: 'Fruits', available: 15, claimed: 8 },
            { name: 'Bread', available: 10, claimed: 4 },
            { name: 'Vegetables', available: 12, claimed: 6 },
        ],
    },
    {
        id: 'listing-1',
        source: 'restaurant',
        listingStatus: 'Claimed',
        orderStatus: 'enroute',
        restaurantName: 'Your Restaurant',
        restaurantAddress: 'Saheed Nagar, Bhubaneswar',
        restaurantPhone: '+91 9999911111',
        charityName: 'Feeding Hands Foundation',
        charityAddress: 'Patia, Bhubaneswar',
        charityPhone: '+91 9876511111',
        driverName: 'Rakesh Kumar',
        driverPhone: '+91 9876522222',
        pickupDate: '28/04/2026',
        pickupTime: '7:00 PM',
        instructions: 'Needs refrigeration',
        distance: '2.1 km away',
        items: [
            { name: 'Rice', available: 5, claimed: 5 },
            { name: 'Dal', available: 8, claimed: 8 },
            { name: 'Sweets', available: 4, claimed: 4 },
        ],
    },
];

function prettyStatus(status: string) {
    return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getStepIndex(status: OrderStatus) {
    return STEPS.indexOf(status);
}

export default function DriverTrackingScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<RouteProp<Params, 'DriverTracking'>>();
    const { trackingId, source } = route.params;
    const isRestaurantView = source === 'restaurant';

    const data =
      trackingData.find(
        (x) =>
          x.id === trackingId &&
          (x.source === source || (source === 'farmer' && x.source === 'charity')),
      ) || trackingData[0];

    const [carCoordinate, setCarCoordinate] = useState({
        latitude: 20.2961,
        longitude: 85.8245,
    });

    useEffect(() => {
        if (data.orderStatus !== 'enroute') return;
        const route = [
            { latitude: 20.2961, longitude: 85.8245 },
            { latitude: 20.3005, longitude: 85.8270 },
            { latitude: 20.3050, longitude: 85.8295 },
            { latitude: 20.3090, longitude: 85.8320 },
            { latitude: 20.3150, longitude: 85.8350 },
        ];
        let index = 0;
        const timer = setInterval(() => {
            index++;
            if (index >= route.length) {
                clearInterval(timer);
                return;
            }
            setCarCoordinate(route[index]);
        }, 1200);
        return () => clearInterval(timer);
    }, [data.orderStatus]);

    const [modalVisible, setModalVisible] = useState(false);
    const trackerAnim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        const step = getStepIndex(data.orderStatus);
        const segment = (Dimensions.get('window').width - 120) / (STEPS.length - 1);
        Animated.spring(trackerAnim, {
            toValue: segment * step,
            useNativeDriver: true,
        }).start();
    }, [data.orderStatus]);

    const makeCall = async (phone?: string | null) => {
        if (!phone) {
            Alert.alert('Unavailable', 'Phone number not available');
            return;
        }
        const clean = phone.replace(/[^+\d]/g, '');
        const url = `tel:${clean}`;
        try {
            await Linking.openURL(url);
        } catch {
            Alert.alert('Error', 'Unable to open dialer');
        }
    };

    const sendMessage = async (phone?: string | null) => {
        if (!phone) return;
        await Linking.openURL(`sms:${phone}`);
    };

    const totalAvailable = useMemo(
        () => data.items.reduce((s, i) => s + i.available, 0),
        [data]
    );

    const totalClaimed = useMemo(
        () => data.items.reduce((s, i) => s + i.claimed, 0),
        [data]
    );

    const currentStep = getStepIndex(data.orderStatus);

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView contentContainerStyle={styles.container}>
                <ImageBackground
                    source={require('../../../assets/placeholder/kale-header.png')}
                    style={styles.headerBg}
                    resizeMode="cover"
                >
                    <Pressable
                        style={styles.backBtn}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={22} color={palette.white} />
                    </Pressable>

                    <AppText variant="h4" style={styles.headerTitle}> Track Pick Up </AppText>
                </ImageBackground>

                {/* MAP */}
                <Card style={styles.mapCard}>
                    <MapView
                        style={styles.map}
                        liteMode={true}
                        initialRegion={{
                            latitude: 20.2961,
                            longitude: 85.8245,
                            latitudeDelta: 0.05,
                            longitudeDelta: 0.05,
                        }}
                    >
                        <Marker coordinate={carCoordinate}>
                            <MaterialCommunityIcons
                                name="car-sports"
                                size={34}
                                color={palette.primary}
                            />
                        </Marker>

                        <Marker coordinate={{ latitude: 20.315, longitude: 85.835 }}>
                            <Ionicons name="flag" size={34} color={palette.middlegreen} />
                        </Marker>

                        <Polyline
                            coordinates={[
                                { latitude: 20.2961, longitude: 85.8245 },
                                { latitude: 20.315, longitude: 85.835 },
                            ]}
                            strokeWidth={4}
                            strokeColor={palette.primary}
                        />
                    </MapView>
                </Card>

                {/* HORIZONTAL TRACKER */}
                <Card style={styles.trackCard}>
                    <View style={styles.line} />

                    <Animated.View
                        style={[
                            styles.carWrap,
                            {
                                transform: [{ translateX: trackerAnim }],
                            },
                        ]}
                    >
                        <MaterialCommunityIcons
                            name="car-sports"
                            size={34}
                            color={palette.primary}
                        />
                    </Animated.View>

                    <View style={styles.stepRow}>
                        {STEPS.map((step, index) => {
                            const active = index <= currentStep;
                            return (
                                <View key={step} style={styles.stepItem}>
                                    <View
                                        style={[
                                            styles.stepDot,
                                            active && styles.stepDotActive,
                                        ]}
                                    />
                                    <AppText
                                        variant="bodySmall"
                                        style={[
                                            styles.stepText,
                                            active && styles.stepTextActive,
                                        ]}
                                    >
                                        {prettyStatus(step)}
                                    </AppText>
                                </View>
                            );
                        })}
                    </View>
                </Card>

                {/* DETAILS */}
                <Card style={styles.detailCard}>
                    <View style={styles.topRow}>
                        <View style={{ flex: 1 }}>
                            <AppText variant="bodyBold">
                                {isRestaurantView
                                    ? `Charity Collecting: ${data.charityName}`
                                    : `Restaurant To Be Collected: ${data.restaurantName}`}
                            </AppText>

                            <AppText variant="bodySmall">
                                📍{' '} {isRestaurantView ? data.charityAddress : data.restaurantAddress}
                            </AppText>
                            <AppText variant="bodyBold">{data.distance}</AppText>
                        </View>

                        <View style={styles.claimPill}>
                            <AppText variant="bodyBold" style={styles.claimText}>
                                {data.listingStatus}
                            </AppText>
                        </View>
                    </View>

                    <View style={styles.driverRow}>
                        <View style={{ flex: 1 }}>
                            <AppText variant="bodySmall">
                                Driver: {data.driverName || 'To be assigned'}
                            </AppText>
                        </View>

                        <View style={styles.iconRow}>
                            {!!data.driverPhone && (
                                <>
                                    <Pressable
                                        style={styles.iconPill}
                                        onPress={() => makeCall(data.driverPhone)}
                                    >
                                        <Ionicons name="call-outline" size={18} color={palette.white} />
                                        <AppText variant="bodyBold" style={styles.iconText}> Call </AppText>
                                    </Pressable>

                                    <Pressable
                                        style={styles.iconPill}
                                        onPress={() => sendMessage(data.driverPhone)}
                                    >
                                        <Ionicons name="chatbubble-outline" size={18} color={palette.white} />
                                        <AppText variant="bodyBold" style={styles.iconText}>  Message </AppText>
                                    </Pressable>
                                </>
                            )}
                        </View>
                    </View>

                    {/* META */}
                    <View style={styles.metaRow}>
                        <Pressable
                            style={styles.metaCard}
                            onPress={() => setModalVisible(true)}
                        >
                            <AppText variant="bodyBold">Items</AppText>
                            <View style={styles.viewBtn}>
                                <AppText variant="bodyBold" style={styles.viewText}> View </AppText>
                            </View>
                        </Pressable>

                        <View style={styles.metaCard}>
                            <AppText variant="bodyBold">Pickup Date</AppText>
                            <AppText variant="bodySmall">{data.pickupDate}</AppText>
                        </View>

                        <View style={styles.metaCard}>
                            <AppText variant="bodyBold">Pickup Time</AppText>
                            <AppText variant="bodySmall">{data.pickupTime}</AppText>
                        </View>
                    </View>

                    <View style={styles.infoBlock}>
                        <AppText variant="caption">
                            Instructions: {data.instructions}
                        </AppText>
                    </View>
                </Card>
            </ScrollView>

            {/* MODAL */}
            <Modal visible={modalVisible} transparent animationType="slide">
                <View style={styles.modalWrap}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalTop}>
                            <AppText variant="subheading">Items To Collect</AppText>
                            <Pressable
                                style={styles.closeBtn}
                                onPress={() => setModalVisible(false)}
                            >
                                <Ionicons name="close" size={20} color={palette.black} />
                            </Pressable>
                        </View>

                        <View style={styles.modalHeader}>
                            <AppText variant="bodyBold" style={{ flex: 2 }}> Item </AppText>
                            <AppText variant="bodyBold" style={styles.modalCol}> Available </AppText>
                            <AppText variant="bodyBold" style={styles.modalCol}> Claimed </AppText>
                        </View>

                        {data.items.map((item, idx) => (
                            <View key={idx} style={styles.modalRow}>
                                <AppText variant="bodyBold" style={{ flex: 2 }}> {item.name} </AppText>
                                <AppText variant="bodySmall" style={styles.modalCol}> {item.available}kg </AppText>
                                <AppText variant="bodySmall" style={styles.modalCol}> {item.claimed}kg </AppText>
                            </View>
                        ))}

                        <AppText variant="bodyBold"> Total Quantity: {totalAvailable} kg </AppText>
                        <AppText variant="bodyBold"> Total Claimed: {totalClaimed} kg </AppText>
                    </View>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.lg,
    },

    headerBg: {
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },

    backBtn: {
        position: 'absolute',
        left: spacing.lg,
        top: spacing.lg,
    },

    headerTitle: {
        color: palette.white,
    },

    mapCard: {
        marginHorizontal: spacing.lg,
        padding: 0,
        overflow: 'hidden',
        borderRadius: 20,
    },

    map: {
        height: 240,
        width: '100%',
    },

    trackCard: {
        marginHorizontal: spacing.lg,
        padding: spacing.lg,
        overflow: 'hidden',
    },

    line: {
        position: 'absolute',
        top: 34,
        left: 24,
        right: 24,
        height: 4,
        backgroundColor: '#ddd',
    },

    carWrap: {
        position: 'absolute',
        top: 18,
        left: 20,
        zIndex: 10,
    },

    stepRow: {
        marginTop: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    stepItem: {
        width: 55,
        alignItems: 'center',
        gap: 6,
    },

    stepDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#ccc',
    },

    stepDotActive: {
        backgroundColor: palette.middlegreen,
    },

    stepText: {
        textAlign: 'center',
        opacity: 0.5,
        fontSize: 10,
    },

    stepTextActive: {
        opacity: 1,
        color: palette.black,
    },

    detailCard: {
        marginHorizontal: spacing.lg,
        gap: spacing.md,
        backgroundColor: palette.radish,
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },

    claimPill: {
        backgroundColor: palette.middlegreen,
        borderRadius: 999,
        paddingHorizontal: 14,
        paddingVertical: 8,
        alignSelf: 'flex-start',
    },

    claimText: {
        color: palette.white,
    },

    driverRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    driverLabel: {
        color: palette.stone,
    },

    iconRow: {
        flexDirection: 'row',
        gap: 10,
    },

    iconPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: palette.middlegreen,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 999,
    },

    iconText: {
        color: palette.white,
    },

    metaRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    metaCard: {
        flex: 1,
        backgroundColor: palette.creme,
        padding: spacing.sm,
        borderRadius: 12,
        gap: 8,
        alignItems: 'center',
    },

    viewBtn: {
        backgroundColor: palette.middlegreen,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 6,
    },

    viewText: {
        color: palette.white,
    },

    infoBlock: {
        backgroundColor: palette.white,
        borderRadius: 10,
        padding: spacing.sm,
    },

    modalWrap: {
        flex: 1,
        justifyContent: 'flex-end',
    },

    modalCard: {
        backgroundColor: palette.white,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: spacing.lg,
        gap: spacing.md,
    },

    modalTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    closeBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#dadbdd',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalHeader: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderColor: palette.border,
        paddingBottom: 10,
    },

    modalRow: {
        flexDirection: 'row',
        paddingVertical: spacing.xs,
    },

    modalCol: {
        flex: 1,
        textAlign: 'center',
    },
});