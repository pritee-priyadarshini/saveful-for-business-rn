import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    TextInput,
    Alert,
    ImageBackground,
    Dimensions,
    Platform,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { Skeleton } from '../../components/Skeleton';

import { palette } from '@/theme/colors';
import { foodListingService } from '@/services/foodListing.service';

const DEFAULT_FOOD_ITEMS = [
    'Prepared meals',
    'Bread',
    'Baked Goods',
    'Fresh fruit & vegetables',
    'Meat',
    'Dairy',
];

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
    const scale = width / 375;
    return Math.round(size * scale);
};

export function EditListingScreen({ navigation, route }: any) {
    const { listingId } = route.params;

    const [loadingListing, setLoadingListing] = useState(true);

    const [customFoodDetail, setCustomFoodDetail] = useState('');
    const [otherFoodDetail, setOtherFoodDetail] = useState(false);
    const [customItem, setCustomItem] = useState('');
    const [location, setLocation] = useState('');

    const [bestBefore, setBestBefore] = useState<Date | null>(null);
    const [pickupFrom, setPickupFrom] = useState<Date | null>(null);
    const [pickupTo, setPickupTo] = useState<Date | null>(null);

    const [items, setItems] = useState<{ name: string; qty: number }[]>(
        DEFAULT_FOOD_ITEMS.map(name => ({ name, qty: 0 }))
    );

    const [foodOptions, setFoodOptions] = useState({
        refrigeration: false,
        reheating: false,
        allergens: false,
        glutenFree: false,
    });

    // DateTimePicker States
    const [showPicker, setShowPicker] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | 'bestBefore' | null>(null);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [tempDate, setTempDate] = useState(new Date());

    useEffect(() => {
        fetchListing();
    }, []);

    const fetchListing = async () => {
        try {
            setLoadingListing(true);
            const res = await foodListingService.getListingById(listingId);
            const data = res.data;

            if (!data) return;

            setLocation(data.pickupAddress || '');

            const parseDateSafe = (val: any) => {
                if (!val) return null;
                const d = new Date(val);
                return isNaN(d.getTime()) ? null : d;
            };

            const bb = parseDateSafe(data.bestBefore);
            const pf = parseDateSafe(data.pickupFromTime ?? data.pickupFrom ?? data.startTime);
            const pt = parseDateSafe(data.pickupByTime ?? data.pickupTo ?? data.endTime);

            if (bb) setBestBefore(bb);
            if (pf) setPickupFrom(pf);
            if (pt) setPickupTo(pt);

            setFoodOptions({
                refrigeration: !!data.needsRefrigeration,
                reheating: !!data.needsReheating,
                allergens: !!data.containsAllergens,
                glutenFree: !!data.isGlutenFree,
            });

            // Start with all default categories (qty 0), then overlay API values.
            // Any API category not in the defaults is appended as a custom item.
            const apiItems: { name: string; qty: number }[] = (data.foodItems ?? []).map(
                (fi: any) => ({ name: fi.category, qty: fi.totalQtyKg ?? 0 })
            );

            const merged = DEFAULT_FOOD_ITEMS.map(name => {
                const found = apiItems.find(
                    i => i.name.toLowerCase() === name.toLowerCase()
                );
                return { name, qty: found ? found.qty : 0 };
            });

            // Append any custom categories not present in defaults
            const extras = apiItems.filter(
                i => !DEFAULT_FOOD_ITEMS.some(
                    d => d.toLowerCase() === i.name.toLowerCase()
                )
            );

            setItems([...merged, ...extras]);
        } catch (error: any) {
            Alert.alert('Error', 'Failed to load listing details');
            navigation.goBack();
        } finally {
            setLoadingListing(false);
        }
    };

    const updateQty = (index: number, change: number) => {
        const updated = [...items];
        updated[index].qty = Math.max(0, Math.round((updated[index].qty + change) * 10) / 10);
        setItems(updated);
    };

    const addCustomItem = () => {
        if (!customItem.trim()) return;
        setItems([...items, { name: customItem, qty: 0 }]);
        setCustomItem('');
    };

    const handlePickerChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowPicker(false);
            if (event.type === 'dismissed' || !selectedDate) {
                setPickerTarget(null);
                return;
            }
            if (pickerMode === 'date') {
                setTempDate(selectedDate);
                setPickerMode('time');
                setTimeout(() => setShowPicker(true), 100);
            } else {
                const finalDate = new Date(tempDate);
                finalDate.setHours(selectedDate.getHours());
                finalDate.setMinutes(selectedDate.getMinutes());
                if (pickerTarget === 'from') setPickupFrom(finalDate);
                else if (pickerTarget === 'to') setPickupTo(finalDate);
                else if (pickerTarget === 'bestBefore') setBestBefore(finalDate);
                setPickerTarget(null);
            }
        } else {
            if (selectedDate) setTempDate(selectedDate);
        }
    };

    const confirmIOSDate = () => {
        if (pickerTarget === 'from') setPickupFrom(tempDate);
        else if (pickerTarget === 'to') setPickupTo(tempDate);
        else if (pickerTarget === 'bestBefore') setBestBefore(tempDate);
        setShowPicker(false);
        setPickerTarget(null);
    };

    const openDateTimePicker = (type: 'from' | 'to' | 'bestBefore') => {
        const current =
            type === 'from' ? pickupFrom :
            type === 'to' ? pickupTo :
            bestBefore;
        setPickerTarget(type);
        setTempDate(current ?? new Date());
        if (Platform.OS === 'android') setPickerMode('date');
        setShowPicker(true);
    };

    const toggleFoodOption = (key: keyof typeof foodOptions) => {
        setFoodOptions(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleSubmit = async () => {
        const hasItems = items.some(i => i.qty > 0);
        if (!hasItems) {
            Alert.alert('Error', 'Please add at least one item');
            return;
        }
        if (!bestBefore) {
            Alert.alert('Error', 'Select best before time');
            return;
        }
        if (!pickupFrom || !pickupTo) {
            Alert.alert('Error', 'Select pickup window');
            return;
        }
        if (pickupTo <= pickupFrom) {
            Alert.alert('Invalid Time', 'Pickup end must be after pickup start');
            return;
        }
        if (!location.trim()) {
            Alert.alert('Error', 'Pickup address required');
            return;
        }

        try {
            const foodItems = items
                .filter(i => i.qty > 0)
                .map(i => ({
                    category: i.name,
                    totalQtyKg: i.qty,
                    remainingQtyKg: i.qty,
                }));

            await foodListingService.updateListing(listingId, {
                foodItems,
                bestBefore: bestBefore.toISOString(),
                pickupFromTime: pickupFrom.toISOString(),
                pickupByTime: pickupTo.toISOString(),
                needsRefrigeration: foodOptions.refrigeration,
                needsReheating: foodOptions.reheating,
                containsAllergens: foodOptions.allergens,
                isGlutenFree: foodOptions.glutenFree,
            });

            Alert.alert('Updated', 'Listing updated successfully', [
                { text: 'OK', onPress: () => navigation.navigate('RestaurantListings') },
            ]);
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || error.message || 'Failed to update listing');
        }
    };

    const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);

    const formatDateTime = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString([], { day: '2-digit', month: 'short' }) + ' @ ' +
            date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    const formatDate = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleDateString([], { day: '2-digit', month: 'long', year: 'numeric' });
    };

    const formatTime = (date: Date | null) => {
        if (!date) return '';
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    if (loadingListing) {
        return (
            <Screen backgroundColor={palette.creme}>
                <ScrollView contentContainerStyle={styles.container}>
                    {/* Header skeleton */}
                    <Skeleton width="100%" height={hp(20)} borderRadius={0} />

                    {/* Food items card skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={wp(40)} height={normalize(20)} borderRadius={normalize(6)} />
                        <View style={[styles.card, { backgroundColor: 'white', gap: hp(1.5) }]}>
                            {DEFAULT_FOOD_ITEMS.map((_, i) => (
                                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Skeleton width={wp(40)} height={normalize(16)} borderRadius={normalize(4)} />
                                    <Skeleton width={wp(28)} height={normalize(32)} borderRadius={normalize(8)} />
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Quantity skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={wp(35)} height={normalize(20)} borderRadius={normalize(6)} />
                        <Skeleton width="100%" height={hp(8)} borderRadius={normalize(12)} />
                    </View>

                    {/* Location skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={wp(45)} height={normalize(20)} borderRadius={normalize(6)} />
                        <Skeleton width="100%" height={hp(7)} borderRadius={normalize(12)} />
                    </View>

                    {/* Best before skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={wp(40)} height={normalize(18)} borderRadius={normalize(6)} />
                        <Skeleton width="100%" height={hp(6.5)} borderRadius={normalize(12)} />
                    </View>

                    {/* Pickup window skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={wp(38)} height={normalize(18)} borderRadius={normalize(6)} />
                        <Skeleton width="100%" height={hp(10)} borderRadius={normalize(12)} />
                    </View>

                    {/* Food details skeleton */}
                    <View style={styles.section}>
                        <Skeleton width={wp(35)} height={normalize(20)} borderRadius={normalize(6)} />
                        <View style={[styles.card, { backgroundColor: 'white', gap: hp(1.5) }]}>
                            {[1,2,3,4].map(i => (
                                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: wp(3) }}>
                                    <Skeleton width={normalize(20)} height={normalize(20)} borderRadius={normalize(4)} />
                                    <Skeleton width={wp(50)} height={normalize(16)} borderRadius={normalize(4)} />
                                </View>
                            ))}
                        </View>
                    </View>

                    {/* Submit button skeleton */}
                    <Skeleton
                        width="100%"
                        height={hp(6.5)}
                        borderRadius={normalize(16)}
                        style={{ marginHorizontal: wp(4), alignSelf: 'center', width: wp(92) }}
                    />
                </ScrollView>
            </Screen>
        );
    }

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView contentContainerStyle={styles.container}>

                {/* HEADER */}
                <ImageBackground
                    source={require('../../../assets/placeholder/kale-header.png')}
                    style={styles.headerBg}
                    resizeMode="cover"
                >
                    <Pressable
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={22} color={palette.white} />
                    </Pressable>

                    <AppText variant="heading" style={styles.headerTitle}>
                        Edit Listing
                    </AppText>

                    <AppText variant="bodyLarge" style={styles.headerSubText}>
                        Update your surplus details below
                    </AppText>
                </ImageBackground>

                {/* WHAT DO YOU HAVE */}
                <View style={styles.section}>
                    <AppText variant="heading">Food Items</AppText>

                    <Card style={styles.card}>
                        {/* Column header */}
                        <View style={styles.itemRow}>
                            <View style={{ flex: 1 }} />
                            <AppText variant="caption" style={styles.kgHeader}>kg</AppText>
                        </View>

                        {items.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <AppText variant="bodyLarge">{item.name}</AppText>

                                <View style={styles.qtyContainer}>
                                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(index, -0.5)}>
                                        <AppText variant="bodyLarge">-</AppText>
                                    </Pressable>

                                    <AppText variant="bodyLarge" style={styles.qtyValue}>
                                        {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                                    </AppText>

                                    <Pressable style={styles.qtyBtn} onPress={() => updateQty(index, 0.5)}>
                                        <AppText variant="bodyLarge">+</AppText>
                                    </Pressable>
                                </View>
                            </View>
                        ))}

                        <View style={styles.addRow}>
                            <TextInput
                                placeholder="Add other item..."
                                value={customItem}
                                onChangeText={setCustomItem}
                                style={styles.customInput}
                                numberOfLines={1}
                            />
                            <Pressable style={styles.addBtn} onPress={addCustomItem}>
                                <AppText variant="bodyLarge" style={{ color: 'white' }}>+</AppText>
                            </Pressable>
                        </View>
                    </Card>
                </View>

                {/* TOTAL WEIGHT */}
                <View style={styles.section}>
                    <AppText variant="heading">Quantity (kg)</AppText>
                    <Card style={styles.card}>
                        <View style={styles.quantityBox}>
                            <AppText variant="h2">{totalQuantity} kg</AppText>
                        </View>
                        <AppText variant="caption">Estimate total weight of surplus food</AppText>
                    </Card>
                </View>

                {/* LOCATION */}
                <View style={styles.section}>
                    <AppText variant="heading">📍 Pickup Location</AppText>
                    <Card style={styles.card}>
                        <TextInput
                            value={location}
                            onChangeText={setLocation}
                            style={styles.input}
                        />
                    </Card>
                </View>

                {/* BEST BEFORE */}
                <View style={[styles.section, { marginTop: hp(1) }]}>
                    <AppText variant="bodyBold" style={{ marginBottom: hp(0.5) }}>Food Best Before</AppText>
                    <Pressable style={styles.timeInputFull} onPress={() => openDateTimePicker('bestBefore')}>
                        <Ionicons name="time-outline" size={20} color={palette.middlegreen} style={{ marginRight: wp(2) }} />
                        <AppText variant="bodyLarge">
                            {bestBefore ? formatDateTime(bestBefore) : 'Select best before date & time'}
                        </AppText>
                    </Pressable>
                </View>

                {/* PICKUP WINDOW */}
                <View style={styles.section}>
                    <AppText variant="bodyBold" style={{ marginBottom: hp(0.5) }}>Pickup Window</AppText>
                    <View style={styles.pickupCard}>
                        <View style={styles.pickupTimeRow}>
                            <Pressable style={styles.timePart} onPress={() => openDateTimePicker('from')}>
                                <AppText variant="caption" color={palette.midgray}>From</AppText>
                                <AppText variant="bodyBold" style={{ fontSize: normalize(12) }}>
                                    {pickupFrom ? formatDate(pickupFrom) : 'Date'}
                                </AppText>
                                <AppText variant="bodyBold">{pickupFrom ? formatTime(pickupFrom) : '--:--'}</AppText>
                            </Pressable>

                            <View style={styles.verticalDivider} />

                            <Pressable style={styles.timePart} onPress={() => openDateTimePicker('to')}>
                                <AppText variant="caption" color={palette.midgray}>To</AppText>
                                <AppText variant="bodyBold" style={{ fontSize: normalize(12) }}>
                                    {pickupTo ? formatDate(pickupTo) : 'Date'}
                                </AppText>
                                <AppText variant="bodyBold">{pickupTo ? formatTime(pickupTo) : '--:--'}</AppText>
                            </Pressable>
                        </View>
                    </View>
                </View>

                {/* FOOD DETAILS */}
                <View style={styles.section}>
                    <AppText variant="heading">Food Details</AppText>
                    <Card style={styles.card}>
                        {[
                            { key: 'refrigeration', label: 'Needs refrigeration ❄' },
                            { key: 'reheating', label: 'Needs reheating 🔥' },
                            { key: 'allergens', label: 'Contains allergens ⚠' },
                            { key: 'glutenFree', label: 'Gluten-free ✅' },
                        ].map((item) => (
                            <Pressable
                                key={item.key}
                                style={styles.checkboxRow}
                                onPress={() => toggleFoodOption(item.key as keyof typeof foodOptions)}
                            >
                                <View style={styles.checkbox}>
                                    {foodOptions[item.key as keyof typeof foodOptions] && (
                                        <Ionicons name="checkmark" size={14} color={palette.middlegreen} />
                                    )}
                                </View>
                                <AppText variant="bodyLarge">{item.label}</AppText>
                            </Pressable>
                        ))}

                        <Pressable style={styles.checkboxRow} onPress={() => setOtherFoodDetail(prev => !prev)}>
                            <View style={styles.checkbox}>
                                {otherFoodDetail && (
                                    <Ionicons name="checkmark" size={14} color={palette.middlegreen} />
                                )}
                            </View>
                            <AppText variant="bodyLarge">Other</AppText>
                        </Pressable>

                        {otherFoodDetail && (
                            <TextInput
                                placeholder="Add custom food details (optional)..."
                                value={customFoodDetail}
                                onChangeText={setCustomFoodDetail}
                                multiline
                                textAlignVertical="top"
                                style={styles.commentInput}
                            />
                        )}
                    </Card>
                </View>

                {/* SUBMIT */}
                <Pressable style={styles.submitBtn} onPress={handleSubmit}>
                    <AppText variant="h7" style={styles.submitText}>
                        Save Changes
                    </AppText>
                </Pressable>

            </ScrollView>

            {showPicker && (
                Platform.OS === 'ios' ? (
                    <Modal transparent visible={showPicker} animationType="slide">
                        <View style={styles.iosPickerModal}>
                            <View style={styles.iosPickerContainer}>
                                <View style={styles.iosPickerHeader}>
                                    <Pressable onPress={() => setShowPicker(false)}>
                                        <AppText color={palette.radish} variant="bodyLarge">Cancel</AppText>
                                    </Pressable>
                                    <Pressable onPress={confirmIOSDate}>
                                        <AppText color={palette.primary} variant="bodyBold">Done</AppText>
                                    </Pressable>
                                </View>
                                <DateTimePicker
                                    value={tempDate}
                                    mode="datetime"
                                    display="spinner"
                                    onChange={handlePickerChange}
                                    textColor={palette.black}
                                />
                            </View>
                        </View>
                    </Modal>
                ) : (
                    <DateTimePicker
                        value={tempDate}
                        mode={pickerMode}
                        is24Hour={true}
                        display="default"
                        onChange={handlePickerChange}
                    />
                )
            )}
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: hp(2),
        paddingBottom: hp(4),
    },

    headerBg: {
        width: '100%',
        height: hp(20),
        justifyContent: 'center',
        alignItems: 'center',
    },

    backButton: {
        position: 'absolute',
        top: hp(2),
        left: wp(4),
    },

    headerTitle: {
        color: palette.white,
        textAlign: 'center',
        margin: normalize(4),
        fontSize: normalize(24),
    },

    headerSubText: {
        color: palette.white,
        opacity: 0.9,
        margin: normalize(4),
        textAlign: 'center',
        fontSize: normalize(14),
    },

    section: {
        marginHorizontal: wp(4),
        gap: hp(1),
    },

    card: {
        padding: wp(4),
        borderRadius: normalize(16),
        gap: hp(2),
    },

    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    kgHeader: {
        width: normalize(32) * 2 + normalize(40) + wp(6),
        textAlign: 'center',
        opacity: 0.5,
        fontSize: normalize(12),
    },

    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(3),
    },

    qtyValue: {
        minWidth: normalize(32),
        textAlign: 'center',
    },

    qtyBtn: {
        width: normalize(32),
        height: normalize(32),
        borderRadius: normalize(8),
        backgroundColor: '#EEE7FF',
        alignItems: 'center',
        justifyContent: 'center',
    },

    addRow: {
        flexDirection: 'row',
        gap: wp(3),
    },

    customInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: palette.black,
        backgroundColor: 'white',
        borderRadius: normalize(12),
        padding: wp(3),
        minHeight: hp(6),
    },

    addBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: wp(4),
        borderRadius: normalize(8),
        justifyContent: 'center',
    },

    quantityBox: {
        backgroundColor: '#F3EEFF',
        padding: wp(4),
        borderRadius: normalize(12),
        alignItems: 'center',
    },

    input: {
        borderWidth: 1,
        borderColor: palette.black,
        backgroundColor: 'white',
        borderRadius: normalize(12),
        padding: wp(3),
        minHeight: hp(6),
    },

    timeInputFull: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: normalize(12),
        padding: wp(4),
        minHeight: hp(6.5),
        marginHorizontal: wp(4),
    },

    pickupCard: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: normalize(12),
        overflow: 'hidden',
    },

    pickupTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: hp(1.5),
    },

    timePart: {
        flex: 1,
        alignItems: 'center',
        gap: hp(0.2),
    },

    verticalDivider: {
        width: 1,
        height: '80%',
        backgroundColor: '#F1F5F9',
    },

    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(3),
    },

    checkbox: {
        width: normalize(20),
        height: normalize(20),
        borderWidth: 1,
        borderRadius: normalize(4),
        borderColor: palette.black,
        backgroundColor: palette.white,
        alignItems: 'center',
        justifyContent: 'center',
    },

    commentInput: {
        borderWidth: 1,
        borderColor: palette.black,
        backgroundColor: palette.white,
        borderRadius: normalize(12),
        padding: wp(4),
        minHeight: hp(12),
        width: '100%',
        marginTop: hp(1),
        fontSize: normalize(14),
    },

    submitBtn: {
        backgroundColor: palette.middlegreen,
        padding: hp(2),
        marginHorizontal: wp(4),
        borderRadius: normalize(16),
        alignItems: 'center',
        marginTop: hp(2),
    },

    submitText: {
        color: 'white',
        fontSize: normalize(16),
    },

    iosPickerModal: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },

    iosPickerContainer: {
        backgroundColor: 'white',
        borderTopLeftRadius: normalize(20),
        borderTopRightRadius: normalize(20),
        paddingBottom: hp(4),
    },

    iosPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: wp(4),
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
});
