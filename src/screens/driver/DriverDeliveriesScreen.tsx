import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    Modal,
    Dimensions,
    Linking,
    Animated,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { useNavigation } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

type DeliveryStatus =
    | 'Assigned'
    | 'Enroute'
    | 'Arrived'
    | 'Picked'
    | 'Verified'
    | 'Completed';

const mockPickups = [
    {
        id: '1',
        title: 'Pizza Hut',
        address: 'MG Road, Bangalore',
        contact: '+91 98765 43210',
        distance: '2.1 km',
        items: [
            { name: 'Bread', qty: 5 },
            { name: 'Rice', qty: 10 },
        ],
        date: '12/04/26',
        time: '2:00 PM - 4:00 PM',
        storage: '❄ Refrigeration Required',
        lat: 12.9716,
        lng: 77.5946,
        status: 'Assigned' as DeliveryStatus,
    },
    {
        id: '2',
        title: 'Welspoon Hotel',
        address: 'Hossur Road, Bangalore',
        contact: '+91 98765 55555',
        distance: '10.1 km',
        items: [
            { name: 'Cooked Food', qty: 5 },
            { name: 'Rice', qty: 10 },
        ],
        date: '12/04/26',
        time: '5:00 PM - 8:00 PM',
        storage: '❄ Refrigeration Required',
        lat: 12.9352,
        lng: 77.6245,
        status: 'Assigned' as DeliveryStatus,
    },
    {
        id: '3',
        title: 'Hotel Red Dragon',
        address: 'Marathahalli, Bangalore',
        contact: '+91 98765 11111',
        distance: '8.1 km',
        items: [
            { name: 'Cooked Food', qty: 15 },
            { name: 'Raw vegetables', qty: 8 },
        ],
        date: '12/04/26',
        time: '3:00 PM - 6:00 PM',
        storage: '❄ Refrigeration Required',
        lat: 12.9591,
        lng: 77.6974,
        status: 'Assigned' as DeliveryStatus,
    },
];

export function DriverDeliveriesScreen() {
    const navigation = useNavigation<any>();
    const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
    const [data, setData] = useState(mockPickups);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [sharing, setSharing] = useState<string | null>(null);
    const [isAvailable, setIsAvailable] = useState(true);

    const translateX = useRef(new Animated.Value(isAvailable ? 1 : 0)).current;

    const totalQty = useMemo(() => {
        return selectedItems.reduce((sum, item) => sum + (item.qty || 0), 0);
    }, [selectedItems]);

    const mapRef = useRef<MapView>(null);

    /* MAP */
    useEffect(() => {
        if (mapRef.current && data.length > 0) {
            setTimeout(() => {
                mapRef.current?.fitToCoordinates(
                    data.map((item) => ({
                        latitude: item.lat,
                        longitude: item.lng,
                    })),
                    {
                        edgePadding: { top: 80, right: 80, bottom: 80, left: 80 },
                        animated: true,
                    }
                );
            }, 300);
        }
    }, [data, viewMode]);

    const statusFlow: DeliveryStatus[] = [
        'Assigned',
        'Enroute',
        'Arrived',
        'Picked',
        'Verified',
        'Completed',
    ];

    const getNextStatus = (current: DeliveryStatus) => {
        const index = statusFlow.indexOf(current);
        return statusFlow[index + 1] || null;
    };

    /* SORT */
    const sortedData = useMemo(() => {
        return [...data].sort((a, b) => {
            const d1 = new Date(a.date.split('/').reverse().join('-'));
            const d2 = new Date(b.date.split('/').reverse().join('-'));
            return d1.getTime() - d2.getTime();
        });
    }, [data]);

    const statusColor = (status: DeliveryStatus) => {
        switch (status) {
            case 'Assigned':
                return palette.orange;
            case 'Enroute':
                return palette.blueberry;
            case 'Arrived':
                return palette.kale;
            case 'Picked':
                return palette.primary;
            case 'Verified':
                return palette.chilli;
            case 'Completed':
                return palette.middlegreen;
            default:
                return palette.stone;
        }
    };

    const updateStatus = (id: string, status: DeliveryStatus) => {
        setData((prev) => {
            if (status === 'Completed') {
                return prev.filter((item) => item.id !== id);
            }

            return prev.map((item) =>
                item.id === id ? { ...item, status } : item
            );
        });
    };

    const listRef = useRef<FlatList>(null);

    const indexMap = useMemo(() => {
        const map: Record<string, number> = {};
        sortedData.forEach((item, index) => {
            map[item.id] = index;
        });
        return map;
    }, [sortedData]);

    const renderItem = ({ item }: any) => (
        <View style={styles.card}>
            {/* TOP */}
            <View style={styles.rowBetween}>
                <View>
                    <AppText variant="bodyLarge">{item.title}</AppText>
                    <AppText variant="bodySmall" style={{ marginTop: 10 }}>{item.address}</AppText>
                </View>

                <View style={styles.distancePill}>
                    <AppText variant="label">📍 {item.distance}</AppText>
                </View>
            </View>

            {/* INLINE */}
            <View style={styles.inlineRow}>
                <View style={styles.inlineCard}>
                    <AppText variant="label">Items</AppText>
                    <Button
                        label="View"
                        style={{
                            height: 30,
                            marginTop: 5,
                            paddingHorizontal: 18,
                            paddingVertical: 0,
                            minHeight: 0,
                            backgroundColor: palette.middlegreen,
                        }}
                        onPress={() => {
                            setSelectedItems(item.items);
                            setModalVisible(true);
                        }}
                    />
                </View>

                <View style={styles.inlineCard}>
                    <AppText variant="label">Date</AppText>
                    <AppText variant="bodySmall" style={{marginTop: 10}}>{item.date}</AppText>
                </View>

                <View style={styles.inlineCard}>
                    <AppText variant="label">Time</AppText>
                    <AppText variant="bodySmall" style={{marginTop: 6}}>{item.time}</AppText>
                </View>
            </View>

            <View style={styles.contactRow}>
                <AppText variant='label'> Contact:</AppText>
                <AppText variant='bodySmall'>{item.contact}</AppText>

                <View style={styles.contactActions}>
                    <TouchableOpacity
                        style={styles.contactPill}
                        onPress={() => Linking.openURL(`tel:${item.contact}`)}
                    >
                        <AppText variant='label'>📞 Call</AppText>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.contactPill}
                        onPress={() => Linking.openURL(`sms:${item.contact}`)}
                    >
                        <AppText variant='label'>💬 Message</AppText>
                    </TouchableOpacity>
                </View>
            </View>

            <AppText variant="bodyLarge" style={{marginBottom: 10}}>{item.storage}</AppText>

            {/* STATUS + CTA */}
            <View style={styles.rowBetween}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <AppText variant='label' style={{ marginRight: spacing.xs }}>Status</AppText>
                    <View
                        style={[
                            styles.statusPill,
                            { backgroundColor: statusColor(item.status) },
                        ]}
                    >
                        <AppText variant='bodyBold' style={{ color: palette.white }}> {item.status} </AppText>
                    </View>
                </View>

                {activeId !== item.id ? (
                    <Button
                        label="Collect Now"
                        style={styles.collectBtn}
                        onPress={() => setActiveId(item.id)}
                    />
                ) : item.status !== 'Completed' ? (
                    <Button
                        label={getNextStatus(item.status) || 'Done'}
                        style={styles.collectBtn}
                        onPress={() => {
                            const next = getNextStatus(item.status);
                            if (next === 'Picked') {
                                navigation.navigate('DriverPickupConfirm', {
                                    pickup: item,
                                    onConfirm: (id: string) => { updateStatus(id, 'Verified'); },
                                });
                            } else if (next) {
                                updateStatus(item.id, next);
                            }
                        }}
                    />
                ) : null}
            </View>

            {/* SHARE */}
            <TouchableOpacity
                style={styles.shareBtn}
                onPress={() =>
                    setSharing(sharing === item.id ? null : item.id)
                }
            >
                <AppText variant='bodyBold' style={{ color: palette.white }}>
                    {sharing === item.id
                        ? 'Stop Sharing'
                        : 'Share Live Location'}
                </AppText>
            </TouchableOpacity>
        </View>
    );

    const Header = () => (
        <View>
            <ImageBackground
                source={require('../../../assets/placeholder/feed-bg.png')}
                style={styles.headerBg}
            >
                <AppText variant="h4" style={styles.headerText}>
                    My Pickups
                </AppText>
            </ImageBackground>

            {/* AVAILABILITY */}
            <View style={styles.availabilityRow}>
                <AppText variant="subheading"> Are you ready for delivery? </AppText>

                <TouchableOpacity
                    activeOpacity={0.6}
                    style={[
                        styles.switchContainer,
                        isAvailable ? styles.switchOn : styles.switchOff,
                    ]}
                    onPress={() => {
                        const next = !isAvailable;
                        setIsAvailable(next);

                        Animated.timing(translateX, {
                            toValue: next ? 1 : 0,
                            duration: 300,
                            useNativeDriver: true,
                        }).start();
                    }}
                >
                    <AppText variant='label'
                        style={[
                            styles.switchLabel,
                            isAvailable ? styles.labelLeft : styles.labelRight,
                        ]}
                    >
                        {isAvailable ? 'Yes' : 'No'}
                    </AppText>

                    <View
                        style={[
                            styles.switchThumb,
                            isAvailable ? styles.thumbRight : styles.thumbLeft,
                        ]}
                    />
                </TouchableOpacity>
            </View>

            {/* TOGGLE */}
            <View style={styles.toggleWrapper}>
                {['list', 'map'].map((mode) => (
                    <TouchableOpacity
                        key={mode}
                        style={[
                            styles.toggleBtn,
                            viewMode === mode && styles.toggleActive,
                        ]}
                        onPress={() => setViewMode(mode as any)}
                    >
                        <AppText variant='label' style={ viewMode === mode ? styles.toggleTextActive : styles.toggleText  } >
                            {mode.toUpperCase()}
                        </AppText>
                    </TouchableOpacity>
                ))}
            </View>

            {/* COUNT */}
            <View style={styles.rowBetween}>
                <AppText variant='h7'>Assigned Pickups</AppText>

                <View style={styles.countPill}>
                    <AppText variant='label' style={{ color: palette.white }}>
                        {sortedData.length}
                    </AppText>
                </View>
            </View>
        </View>
    );

    const MapViewComponent = () => (
        <View>
            <View style={{ height: height * 0.55, borderRadius: 16, overflow: 'hidden' }}>
                <MapView ref={mapRef} style={{ flex: 1 }}>
                    {sortedData.map((item) => (
                        <Marker
                            key={item.id}
                            coordinate={{
                                latitude: item.lat,
                                longitude: item.lng,
                            }}
                            onPress={() => {
                                const index = indexMap[item.id];
                                if (index !== undefined) {
                                    listRef.current?.scrollToIndex({
                                        index,
                                        animated: true,
                                    });
                                }
                            }}
                        />
                    ))}
                </MapView>
            </View>

            {/* HORIZONTAL CARD LIST */}
            <FlatList
                ref={listRef}
                data={sortedData}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            />
        </View>
    );

    return (
        <Screen scrollable={false} backgroundColor={palette.creme}>
            <View>
                {viewMode === 'list' ? (
                    <FlatList
                        data={sortedData}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        ListHeaderComponent={Header}
                    />
                ) : (
                    <FlatList
                        data={[{ key: 'map' }]}
                        renderItem={() => (
                            <>
                                <Header />
                                <MapViewComponent />
                            </>
                        )}
                    />
                )}
            </View>

            {/* MODAL */}
            <Modal visible={modalVisible} transparent animationType="fade">
                <View style={styles.modalOverlay}>
                    <View style={styles.modalBox}>
                        <AppText
                            variant="bodyBold"
                            style={{ textAlign: 'center', marginBottom: spacing.sm, }}
                        >
                            Item List
                        </AppText>

                        <FlatList
                            data={selectedItems}
                            keyExtractor={(_, i) => i.toString()}
                            style={{ maxHeight: height * 0.8 }}
                            renderItem={({ item }) => (
                                <View style={styles.rowBetween}>
                                    <AppText variant='bodySmall'>{item.name}</AppText>
                                    <AppText variant='bodySmall'>{item.qty}kg</AppText>
                                </View>
                            )}
                            showsVerticalScrollIndicator={false}
                        />

                        {/* TOTAL */}
                        <View
                            style={[
                                styles.rowBetween,
                                {
                                    marginTop: spacing.sm,
                                    borderTopWidth: 1,
                                    borderColor: palette.border,
                                    paddingTop: spacing.sm,
                                },
                            ]}
                        >
                            <AppText variant='bodyBold'>Total</AppText>
                            <AppText variant='bodyBold'>{totalQty} kg</AppText>
                        </View>

                        <Button
                            label="Close"
                            style={{
                                minHeight: 28,
                                height: 28,
                                paddingHorizontal: 20,
                                alignSelf: 'center',
                                marginTop: spacing.sm,
                            }}
                            onPress={() => setModalVisible(false)}
                        />
                    </View>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    headerBg: {
        height: 140,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerText: { color: palette.white },

    toggleWrapper: {
        flexDirection: 'row',
        margin: spacing.md,
        borderColor: palette.border,
        borderWidth: 1,
        borderRadius: 20,
    },
    toggleBtn: {
        flex: 1,
        padding: spacing.sm,
        alignItems: 'center',
    },
    toggleActive: {
        backgroundColor: palette.primary,
        borderRadius: 20,
    },
    toggleText: { color: palette.black },
    toggleTextActive: { color: palette.white },

    rowBetween: {
        marginHorizontal: spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    countPill: {
        backgroundColor: palette.success,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },

    card: {
        backgroundColor: palette.white,
        marginHorizontal: spacing.lg,
        marginVertical: spacing.sm,
        padding: spacing.sm,
        gap: spacing.sm,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: palette.border,
    },

    distancePill: {
        backgroundColor: palette.radish,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
    },

    inlineRow: {
        flexDirection: 'row',
        marginVertical: spacing.md,
    },

    inlineCard: {
        flex: 1,
        backgroundColor: palette.radish,
        padding: spacing.sm,
        marginHorizontal: 4,
        borderRadius: 10,
        alignItems: 'center',
    },

    contactRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },

    contactNumber: {
        flex: 1,
        marginRight: spacing.sm,
    },

    contactActions: {
        flexDirection: 'row',
    },

    contactPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.radish,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: palette.border,
    },

    statusPill: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },

    collectBtn: {
        height: 40,
        paddingHorizontal: 12,
        paddingVertical: 0,
        minHeight: 0,
    },

    shareBtn: {
        marginTop: spacing.sm,
        backgroundColor: palette.primary,
        padding: spacing.md,
        borderRadius: 10,
        alignItems: 'center',
    },

    modalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#00000055',
    },

    modalBox: {
        width: width * 0.75,
        maxHeight: height * 0.8,
        backgroundColor: palette.white,
        padding: spacing.md,
        borderRadius: 16,
    },








    availabilityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
    },

    switchContainer: {
        width: 86,
        height: 40,
        borderRadius: 25,
        justifyContent: 'center',
        position: 'relative',
        paddingHorizontal: 6,
    },

    switchOn: {
        backgroundColor: palette.success, 
    },

    switchOff: {
        backgroundColor: palette.danger,
    },

    switchThumb: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: palette.white,
        position: 'absolute',
        top: 3,
    },

    thumbRight: {
        right: 3,
    },

    thumbLeft: {
        left: 3,
    },

    switchLabel: {
        color: palette.white,
    },

    labelLeft: {
        alignSelf: 'flex-start',
        marginLeft: 10,
    },

    labelRight: {
        alignSelf: 'flex-end',
        marginRight: 10,
    },
});