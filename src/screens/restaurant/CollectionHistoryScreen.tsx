import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, ImageBackground, Modal } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';

const DATA = [
    {
        id: '1',
        collected_by: 'Food Rescue Org',
        location: 'Patia, Bhubaneswar',
        driverName: 'Rakesh Sahu',
        date: new Date('2026-04-07'),
        time: '2:30 PM',
        status: 'claimed',
        items: [
            { name: 'Baked Goods', qty: 3 },
            { name: 'Fruits', qty: 2 },
        ],
    },
    {
        id: '2',
        collected_by: null,
        location: null,
        driverName: null,
        date: new Date('2026-04-06'),
        time: '1:00 PM',
        status: 'expired',
        items: [
            { name: 'Meat', qty: 4 },
        ],
    },
    {
        id: '3',
        collected_by: 'Food Rescue Org',
        location: 'Khandagiri, Bhubaneswar',
        driverName: 'Amit Das',
        date: new Date('2025-08-10'),
        time: '2:30 PM',
        status: 'partial claimed',
        items: [
            { name: 'Baked Goods', qty: 3, claimed: 2, left: 1 },
            { name: 'Fruits', qty: 2, claimed: 1, left: 1 },
        ],
    },
    {
        id: '4',
        collected_by: 'Food Rescue Org',
        location: 'Saheed Nagar, Bhubaneswar',
        driverName: 'Suman Nayak',
        date: new Date('2025-12-07'),
        time: '5:30 PM',
        status: 'claimed',
        items: [
            { name: 'Baked Goods', qty: 3 },
            { name: 'Fruits', qty: 2 },
        ],
    },
    {
        id: '5',
        collected_by: null,
        location: null,
        driverName: null,
        date: new Date('2026-04-07'),
        time: '2:30 PM',
        status: 'expired',
        items: [
            { name: 'Baked Goods', qty: 3 },
            { name: 'Fruits', qty: 2 },
        ],
    },
    {
        id: '6',
        collected_by: 'Food Rescue Org',
        location: 'Jaydev Vihar, Bhubaneswar',
        driverName: 'Prakash Rout',
        date: new Date('2026-02-03'),
        time: '2:30 PM',
        status: 'claimed',
        items: [
            { name: 'Baked Goods', qty: 3 },
            { name: 'Fruits', qty: 2 },
        ],
    },
];

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

    const months = getMonthsForYear(selectedYear);
    const years = ['All', '2026', '2025'];

    const filteredData = useMemo(() => {
        return DATA
            .filter(item => {
                const itemMonth =
                    item.date.toLocaleString('default', {
                        month: 'short',
                    });

                const itemYear =
                    item.date.getFullYear().toString();

                const yearMatch =
                    selectedYear === 'All' ||
                    itemYear === selectedYear;

                const monthMatch =
                    selectedMonth === 'All' ||
                    itemMonth === selectedMonth;

                return yearMatch && monthMatch;
            })
            .sort(
                (a, b) =>
                    b.date.getTime() - a.date.getTime()
            );
    }, [selectedMonth, selectedYear]);

    function prettyStatus(status: string) {
        return status.replace(/\b\w/g, c => c.toUpperCase());
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
                            <Ionicons name="arrow-back" size={22} color={palette.white} />
                        </Pressable>

                        <AppText variant="h5" style={styles.headerTitle}>
                            Collection History
                        </AppText>
                        <View style={{ width: 22 }} />
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
                                <Ionicons name="chevron-down" size={16} />
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
                                <Ionicons name="chevron-down" size={16} />
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
                    contentContainerStyle={{ paddingBottom: 40 }}
                    ListEmptyComponent={
                        <View style={styles.empty}>
                            <AppText variant="body">No Collection Found For This Month</AppText>
                        </View>
                    }
                    renderItem={({ item }) => (
                        <View style={styles.newCard}>
                            {/* TOP */}
                            <View style={styles.topRow}>
                                <View style={{ flex: 1 }}>
                                    <AppText variant="bodyBold">
                                        {item.collected_by || 'No charity accepted it'}
                                    </AppText>

                                    <AppText variant="caption">
                                        {item.location || 'Nearby charities were notified'}
                                    </AppText>

                                    {item.driverName && (
                                        <AppText
                                            variant="caption"
                                            style={styles.driverText}
                                        >
                                            Driver: {item.driverName}
                                        </AppText>
                                    )}
                                </View>

                                <View
                                    style={[
                                        styles.statusPill,
                                        item.status === 'expired' &&
                                        styles.expiredPill,
                                    ]}
                                >
                                    <AppText
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
                                            setSelectedItems(item.items);
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
                                    <AppText variant="caption">
                                        Pickup Date
                                    </AppText>

                                    <AppText variant="bodyBold">
                                        {item.date.toLocaleDateString('en-US', {
                                            month: 'long',
                                            day: '2-digit',
                                            year: 'numeric',
                                        })}
                                    </AppText>
                                </View>

                                <View style={styles.metaCard}>
                                    <AppText variant="caption">
                                        Pickup Time
                                    </AppText>

                                    <AppText variant="bodyBold">
                                        {item.time}
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
                                    size={20}
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
                                    {it.name}
                                </AppText>

                                <AppText variant='bodySmall' style={styles.modalCol}>
                                    {it.qty}kg
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
        height: 140,
        justifyContent: 'center',
    },

    backButton: {
        position: 'absolute',
        left: spacing.lg,
        top: spacing.lg,
        zIndex: 10,
    },

    headerTitle: {
        color: palette.white,
        textAlign: 'center',
    },

    filterContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        margin: spacing.md,
        gap: spacing.sm,
    },

    filterBlock: {
        flex: 1,
        marginRight: spacing.sm,
    },

    dropdownWrapper: {
        position: 'relative',
    },

    dropdown: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: palette.white,
        padding: spacing.sm,
        borderRadius: 10,
    },

    dropdownList: {
        position: 'absolute',
        top: 48,
        left: 0,
        right: 0,
        backgroundColor: palette.white,
        borderRadius: 10,
        elevation: 5,
        zIndex: 1000,
    },

    dropdownItem: {
        padding: spacing.sm,
        borderBottomWidth: 0.5,
        borderColor: '#eee',
    },

    card: {
        backgroundColor: palette.white,
        padding: spacing.md,
        borderRadius: 16,
        marginHorizontal: spacing.md,
        marginVertical: spacing.sm,
        elevation: 2,
        gap: spacing.sm,
    },

    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    status: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: '#EEE7FF',
    },

    empty: {
        alignItems: 'center',
        marginTop: 50,
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    itemsContainer: {
        marginTop: spacing.xs,
        gap: 2,
    },

    newCard: {
        backgroundColor: palette.white,
        marginHorizontal: spacing.md,
        marginBottom: spacing.md,
        padding: spacing.md,
        borderRadius: 20,
        gap: spacing.md,

        borderWidth: 1,
        borderColor: palette.black,
    },

    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },

    driverText: {
        marginTop: 4,
        color: palette.textMuted,
    },

    statusPill: {
        minWidth: 90,
        minHeight: 38,
        borderRadius: 999,
        paddingHorizontal: 12,
        backgroundColor: palette.middlegreen,
        alignItems: 'center',
        justifyContent: 'center',
    },

    statusText: {
        color: palette.white,
    },

    expiredPill: {
        backgroundColor: palette.chilli,
    },

    metaRow: {
        flexDirection: 'row',
        gap: spacing.sm,
        marginTop: spacing.xs,
    },

    metaCard: {
        flex: 1,
        backgroundColor: palette.radish,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.sm,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.sm,
        borderWidth: 1,
        borderColor: palette.border,
    },

    viewBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: 18,
        paddingVertical: 8,
        borderRadius: 999,
    },

    viewText: {
        color: palette.white,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        padding: spacing.lg,
    },

    modalCard: {
        backgroundColor: palette.white,
        borderRadius: 20,
        padding: spacing.md,
    },

    modalTopBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    closeIconBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: palette.creme,
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalHeaderRow: {
        flexDirection: 'row',
        marginTop: spacing.md,
        paddingBottom: spacing.sm,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },

    modalItemRow: {
        flexDirection: 'row',
        paddingVertical: spacing.sm,
    },

    modalCol: {
        flex: 1,
        textAlign: 'center',
    },
});