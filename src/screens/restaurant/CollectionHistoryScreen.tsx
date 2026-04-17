import React, { useMemo, useState } from 'react';
import { View, StyleSheet, FlatList, Pressable, ImageBackground } from 'react-native';
import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Ionicons } from '@expo/vector-icons';
import { spacing } from '../../theme/spacing';
import { palette } from '../../theme/colors';

const DATA = [
    {
        id: '1',
        collected_by: 'Food Rescue Org',
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
        ngo: null,
        date: new Date('2026-04-06'),
        time: '1:00 PM',
        status: 'cancelled',
        items: [
            { name: 'Meat', qty: 4 },
        ],
    },
    {
        id: '3',
        collected_by: 'Food Rescue Org',
        date: new Date('2025-08-10'),
        time: '2:30 PM',
        status: 'claimed',
        items: [
            { name: 'Baked Goods', qty: 3 },
            { name: 'Fruits', qty: 2 },
        ],
    },
    {
        id: '4',
        collected_by: 'Food Rescue Org',
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
        collected_by: 'Food Rescue Org',
        date: new Date('2026-04-07'),
        time: '2:30 PM',
        status: 'claimed',
        items: [
            { name: 'Baked Goods', qty: 3 },
            { name: 'Fruits', qty: 2 },
        ],
    },
    {
        id: '6',
        collected_by: 'Food Rescue Org',
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


    const months = getMonthsForYear(selectedYear);
    const years = ['All', '2026', '2025'];


    // FILTER LOGIC
    const filteredData = useMemo(() => {
        return DATA.filter(item => {
            const itemMonth = item.date.toLocaleString('default', { month: 'short' });
            const itemYear = item.date.getFullYear().toString();

            const yearMatch =
                selectedYear === 'All' || itemYear === selectedYear;

            const monthMatch =
                selectedMonth === 'All' || itemMonth === selectedMonth;

            return yearMatch && monthMatch;
        });
    }, [selectedMonth, selectedYear]);

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
                        <AppText variant="bodyLarge">Year</AppText>

                        <View style={styles.dropdownWrapper}>
                            <Pressable
                                style={styles.dropdown}
                                onPress={() => setShowYearDropdown(!showYearDropdown)}
                            >
                                <AppText variant="body" >{selectedYear}</AppText>
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
                                            <AppText variant="body">{y}</AppText>
                                        </Pressable>
                                    ))}
                                </View>
                            )}
                        </View>
                    </View>

                    {/* MONTH */}
                    <View style={styles.filterBlock}>
                        <AppText variant="bodyLarge" >Month</AppText>

                        <View style={styles.dropdownWrapper}>
                            <Pressable
                                style={styles.dropdown}
                                onPress={() => setShowMonthDropdown(!showMonthDropdown)}
                            >
                                <AppText variant="body" >{selectedMonth}</AppText>
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
                                            <AppText variant="body">{m}</AppText>
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
                        <View style={styles.card}>

                            {/* TOP */}
                            <View style={styles.row}>
                                <View>
                                    <AppText variant="bodyBold">Collected By: {item.collected_by ? item.collected_by : 'None'}</AppText>
                                    <AppText variant="caption">
                                        {item.date.toDateString()} • {item.time}
                                    </AppText>
                                </View>

                                <View style={styles.statusRow}>
                                    <View
                                        style={[
                                            styles.dot,
                                            item.status === 'claimed' ? styles.greenDot : styles.redDot,
                                        ]}
                                    />
                                    <AppText variant="caption">
                                        {item.status}
                                    </AppText>
                                </View>
                            </View>

                            {/* ITEMS */}
                            <View style={styles.itemsContainer}>
                                {item.items.map((it: any, idx: number) => (
                                    <AppText key={idx} variant="caption">
                                        • {it.name} ({it.qty} kg)
                                    </AppText>
                                ))}
                            </View>

                            {/* MEALS CALCULATION */}
                            <AppText style={styles.meals}>
                                ~{Math.round(
                                    item.items.reduce((acc: number, it: any) => acc + it.qty, 0) / 0.3
                                )} meals
                            </AppText>

                        </View>
                    )}
                />

            </View>
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

    impact: {
        fontSize: 12,
        opacity: 0.7,
    },

    status: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 10,
        backgroundColor: '#EEE7FF',
    },

    completed: {
        color: '#2E7D32',
        fontWeight: '600',
    },

    cancelled: {
        color: '#D32F2F',
        fontWeight: '600',
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

    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },

    greenDot: {
        backgroundColor: '#2E7D32',
    },

    redDot: {
        backgroundColor: '#D32F2F',
    },

    itemsContainer: {
        marginTop: spacing.xs,
        gap: 2,
    },

    meals: {
        marginTop: spacing.xs,
        opacity: 0.7,
        fontSize: 12,
    },
});