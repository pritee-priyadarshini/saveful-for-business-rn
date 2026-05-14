import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, ImageBackground, Modal, Dimensions } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { palette } from '../../theme/colors';
import { foodListingService } from '@/services/foodListing.service';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_MONTH_INDEX = new Date().getMonth(); // 0-based

const MONTHS = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

const getMonthsForYear = (year: string) => {
    if (year === 'All') return ['All'];

    const y = parseInt(year);

    if (y === CURRENT_YEAR) {
        return ['All', ...MONTHS.slice(0, CURRENT_MONTH_INDEX + 1)];
    }

    return ['All', ...MONTHS];
};

export default function CollectionHistoryScreen({ navigation }: any) {
    const [selectedYear, setSelectedYear] = useState('All');
    const [selectedMonth, setSelectedMonth] = useState('All');

    const [showYearDropdown, setShowYearDropdown] = useState(false);
    const [showMonthDropdown, setShowMonthDropdown] = useState(false);

    const [modalVisible, setModalVisible] = useState(false);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);
    const [selectedStatus, setSelectedStatus] = useState('');

    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            setLoading(true);

            const res = await foodListingService.getListings({
                page: 1,
                limit: 200,
            });

            setHistory(res.data?.listings || []);
        } catch (error) {
            console.log('history fetch failed', error);
        } finally {
            setLoading(false);
        }
    };

    const months = getMonthsForYear(selectedYear);
    const years = useMemo(() => {
        const uniqueYears = [
            ...new Set(
                history.map((item) =>
                    new Date(item.createdAt)
                        .getFullYear()
                        .toString()
                )
            ),
        ];

        uniqueYears.sort((a, b) => Number(b) - Number(a));

        return ['All', ...uniqueYears];
    }, [history]);

    const filteredData = useMemo(() => {
        return history
            .filter((item) => {
                const date = new Date(item.createdAt);
                const itemMonth = date.toLocaleString('default', { month: 'short', });
                const itemYear = date.getFullYear().toString();
                const yearMatch = selectedYear === 'All' || itemYear === selectedYear;
                const monthMatch = selectedMonth === 'All' || itemMonth === selectedMonth;
                return yearMatch && monthMatch;
            })
            .sort(
                (a, b) =>
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
            );
    }, [history, selectedMonth, selectedYear]);

    function prettyStatus(status: string) {
        if (status === 'PARTIAL') return 'Partial Claimed';

        return (
            status.charAt(0) +
            status.slice(1).toLowerCase()
        );
    }

    if (loading) {
        return (
            <Screen>
                <AppText>
                    Loading collection history...
                </AppText>
            </Screen>
        );
    }

    return (
        <Screen backgroundColor={palette.creme} scrollable={false}>
            <View style={styles.container}>

                {/* HEADER */}
                <ImageBackground
                    source={require('../../../assets/placeholder/kale-header.png')}
                    style={styles.headerBg}
                    resizeMode="cover"
                >
                    <>
                        <Pressable
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}>
                            <Ionicons name="arrow-back" size={normalize(22)} color={palette.white} />
                        </Pressable>

                        <AppText variant="h5" style={styles.headerTitle}>
                            Collection History
                        </AppText>
                        <View style={{ width: normalize(22) }} />
                    </>
                </ImageBackground>

                {/* FILTERS */}
                <View style={styles.filterContainer}>

                    {/* YEAR */}
                    <View style={styles.filterBlock}>
                        <AppText variant="label">Year</AppText>

                        <View style={styles.dropdownWrapper}>
                            <Pressable
                                style={styles.dropdown}
                                onPress={() => setShowYearDropdown(!showYearDropdown)}
                            >
                                <AppText variant="bodyBold" >{selectedYear}</AppText>
                                <Ionicons name="chevron-down" size={normalize(16)} />
                            </Pressable>

                            {showYearDropdown && (
                                <View style={styles.dropdownList}>
                                    {years.map((y) => (
                                        <Pressable
                                            key={y}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedYear(y);
                                                setSelectedMonth('All');
                                                setShowYearDropdown(false);
                                            }}
                                        >
                                            <AppText variant="bodySmall">{y}</AppText>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* MONTH */}
                    <View style={styles.filterBlock}>
                        <AppText variant="label" >Month</AppText>

                        <View style={styles.dropdownWrapper}>
                            <Pressable
                                style={styles.dropdown}
                                onPress={() => setShowMonthDropdown(!showMonthDropdown)}
                            >
                                <AppText variant="bodyBold" >{selectedMonth}</AppText>
                                <Ionicons name="chevron-down" size={normalize(16)} />
                            </Pressable>

                            {showMonthDropdown && (
                                <View style={styles.dropdownList}>
                                    {months.map((m) => (
                                        <Pressable
                                            key={m}
                                            style={styles.dropdownItem}
                                            onPress={() => {
                                                setSelectedMonth(m);
                                                setShowMonthDropdown(false);
                                            }}
                                        >
                                            <AppText variant="bodySmall">{m}</AppText>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                </View>

                {/* LIST */}
                <FlatList
                    data={filteredData}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: hp(5) }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <AppText variant="body">No Collection Found </AppText>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.newCard}>
                            {/* TOP */}
                            <View style={styles.topRow}>
                                <View style={{ flex: 1 }}>
                                    <AppText variant="bodyLarge" style={{ lineHeight: normalize(22) }}>
                                        {item.foodClaims?.[0]?.charityName || 'No charity accepted it'}
                                    </AppText>

                                    <AppText variant="caption" style={{ lineHeight: normalize(18) }}>
                                        {item.pickupAddress || 'Nearby charities were notified'}
                                    </AppText>

                                    {item.foodClaims?.[0]?.driverName && (
                                        <AppText
                                            variant="caption"
                                            style={[styles.driverText, { lineHeight: normalize(18) }]}
                                        >
                                            Driver: {item.driverName}
                                        </AppText>
                                    )}
                                </View>

                                <View>
                                    <AppText variant='label'
                                        style={[
                                            styles.statusText,
                                            item.status === 'expired' &&
                                            styles.statusText,
                                        ]}
                                    >
                                        {prettyStatus(item.status)}
                                    </AppText>
                                </View>
                            </View>

                            {/* 3 CARDS */}
                            <View style={styles.metaRow}>
                                <View style={styles.metaCard}>
                                    <AppText variant="caption">Items</AppText>

                                    <Pressable
                                        style={styles.viewBtn}
                                        onPress={() => {
                                            setSelectedItems(item.foodItems);
                                            setSelectedStatus(item.status);
                                            setModalVisible(true);
                                        }}
                                    >
                                        <AppText style={styles.viewText}>
                                            View
                                        </AppText>
                                    </Pressable>
                                </View>

                                <View style={styles.metaCard}>
                                    <AppText variant="caption" style={{ textAlign: 'center' }}>
                                        Pickup Date
                                    </AppText>

                                    <AppText variant="bodyBold" style={{ textAlign: 'center' }}>
                                        {new Date(item.pickupFromTime || item.createdAt).toLocaleDateString('en-US', {
                                            day: '2-digit',
                                            month: 'long',
                                        })}
                                    </AppText>
                                </View>

                                <View style={styles.metaCard}>
                                    <AppText variant="caption" style={{ textAlign: 'center' }}>
                                        Pickup Time
                                    </AppText>

                                    <AppText variant="bodyBold" style={{ textAlign: 'center' }}>
                                        {item.pickupFromTime
                                            ? `${new Date(item.pickupFromTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${new Date(item.pickupByTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                            : '—'}
                                    </AppText>
                                </View>
                            </View>
                        </View>
                    )}
                />

            </View>


            <Modal
                visible={modalVisible}
                transparent
                animationType="fade"
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalTopBar}>
                            <AppText variant="subheading">
                                Listed Food
                            </AppText>

                            <Pressable
                                style={styles.closeIconBtn}
                                onPress={() =>
                                    setModalVisible(false)
                                }
                            >
                                <Ionicons
                                    name="close"
                                    size={normalize(20)}
                                    color={palette.black}
                                />
                            </Pressable>
                        </View>

                        <View style={styles.modalHeaderRow}>
                            <AppText variant='label' style={{ flex: 1 }}>
                                Item Name
                            </AppText>

                            <AppText variant='label' style={styles.modalCol}>
                                Available
                            </AppText>

                            {(selectedStatus === 'claimed' ||
                                selectedStatus ===
                                'partial claimed') && (
                                    <AppText variant='label' style={styles.modalCol}>
                                        Claimed
                                    </AppText>
                                )}
                        </View>

                        {selectedItems.map((it, idx) => (
                            <View
                                key={idx}
                                style={styles.modalItemRow}
                            >
                                <AppText variant='bodySmall' style={{ flex: 2 }}>
                                    {it.category}
                                </AppText>

                                <AppText variant='bodySmall' style={styles.modalCol}>
                                    {it.totalQtyKg}kg
                                </AppText>

                                {(selectedStatus === 'claimed' ||
                                    selectedStatus ===
                                    'partial claimed') && (
                                        <AppText variant='bodySmall' style={styles.modalCol} >
                                            {'claimed' in it
                                                ? it.claimed
                                                : it.qty}
                                            kg
                                        </AppText>
                                    )}
                            </View>
                        ))}
                    </View>
                </View>
            </Modal>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    headerBg: {
        width: '100%',
        height: hp(18),
        justifyContent: 'center',
    },

    backButton: {
        position: 'absolute',
        left: wp(5),
        top: hp(2.5),
        zIndex: 10,
    },

    headerTitle: {
        color: palette.white,
        textAlign: 'center',
        fontSize: normalize(22),
    },

    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginHorizontal: wp(4),
        marginVertical: hp(1.6),
        gap: wp(2.5),
    },

    filterBlock: {
        flex: 1,
    },

    dropdownWrapper: {
        position: 'relative',
    },

    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: palette.white,
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.2),
        borderRadius: normalize(10),
    },

    dropdownList: {
        position: 'absolute',
        top: hp(6),
        left: 0,
        right: 0,
        backgroundColor: palette.white,
        borderRadius: normalize(10),
        elevation: 5,
        zIndex: 1000,
    },

    dropdownItem: {
        paddingHorizontal: wp(3),
        paddingVertical: hp(1.2),
        borderBottomWidth: 0.5,
        borderColor: '#eee',
    },

    card: {
        backgroundColor: palette.white,
        padding: hp(1.6),
        borderRadius: normalize(16),
        marginHorizontal: wp(4),
        marginVertical: hp(0.8),
        elevation: 2,
        gap: hp(1),
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    status: {
        paddingHorizontal: wp(2),
        paddingVertical: hp(0.5),
        borderRadius: normalize(10),
        backgroundColor: '#EEE7FF',
    },

    empty: {
        alignItems: 'center',
        marginTop: hp(6),
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(1.5),
    },

    itemsContainer: {
        marginTop: hp(0.5),
        gap: hp(0.3),
    },

    newCard: {
        backgroundColor: palette.white,
        marginHorizontal: wp(4),
        marginBottom: hp(1.6),
        padding: hp(1.6),
        borderRadius: normalize(20),
        gap: hp(1.4),
        borderWidth: 1,
        borderColor: palette.border,
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: wp(2.5),
    },

    driverText: {
        marginTop: hp(0.5),
        color: palette.textMuted,
    },
    statusText: {
        color: palette.middlegreen,
        fontSize: normalize(16),
    },

    expiredPill: {
        backgroundColor: palette.chilli,
    },

    metaRow: {
        flexDirection: 'row',
        gap: wp(2.2),
        marginTop: hp(0.4),
    },

    metaCard: {
        flex: 1,
        backgroundColor: palette.radish,
        paddingVertical: hp(1),
        paddingHorizontal: wp(1.5),
        borderRadius: normalize(12),
        alignItems: 'center',
        justifyContent: 'center',
        gap: hp(0.8),
        borderWidth: 1,
        borderColor: palette.border,
    },

    viewBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: wp(4.5),
        paddingVertical: hp(0.9),
        borderRadius: 999,
    },

    viewText: {
        color: palette.white,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        padding: wp(5),
    },

    modalCard: {
        backgroundColor: palette.white,
        borderRadius: normalize(20),
        padding: wp(5),
    },

    modalTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: hp(1),
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
        marginTop: hp(1.6),
        paddingBottom: hp(1),
        borderBottomWidth: 1,
        borderColor: '#eee',
    },

    modalItemRow: {
        flexDirection: 'row',
        paddingVertical: hp(0.8),
    },

    modalCol: {
        flex: 1,
        textAlign: 'center',
    },
});