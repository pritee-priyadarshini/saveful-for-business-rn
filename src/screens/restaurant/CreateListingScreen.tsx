import React, { useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Pressable,
    Image,
    TextInput,
    Alert,
    ImageBackground,
    Dimensions,
    Platform,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';


import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAppContext } from '../../store/AppContext';

import { palette } from '@/theme/colors';
import { foodListingService } from '@/services/foodListing.service';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export function CreateListingScreen({ navigation }: any) {
    const { currentProfile, authUser } = useAppContext();
    const siteId = authUser?.profile?.sites?.[0]?.id || authUser?.profile?.site?.id || null;

    const [customFoodDetail, setCustomFoodDetail] = useState('');
    const [otherFoodDetail, setOtherFoodDetail] = useState(false);

    const [hasPreviousListing, setHasPreviousListing] = useState<boolean | null>(null);
    const [customItem, setCustomItem] = useState('');
    const [location, setLocation] = useState(currentProfile.address);
    const [images, setImages] = useState<string[]>([]);

    const [bestBefore, setBestBefore] = useState<Date | null>(null);
    const [pickupFrom, setPickupFrom] = useState<Date | null>(null);
    const [pickupTo, setPickupTo] = useState<Date | null>(null);

    const [items, setItems] = useState([
        { name: 'Prepared meals', qty: 0 },
        { name: 'Bread', qty: 0 },
        { name: 'Baked Goods', qty: 0 },
        { name: 'Fresh fruit & vegetables', qty: 0 },
        { name: 'Meat', qty: 0 },
        { name: 'Dairy', qty: 0 },
    ]);

    const [foodOptions, setFoodOptions] = useState<any>({
        refrigeration: false,
        reheating: false,
        allergens: false,
        glutenFree: false,
        safeForDonation: false,
    });

    const [safeFood, setSafeFood] = useState(false);
    const [safeFoodError, setSafeFoodError] = useState(false);

    // DateTimePicker States
    const [showPicker, setShowPicker] = useState(false);
    const [pickerTarget, setPickerTarget] = useState<'from' | 'to' | 'bestBefore' | null>(null);
    const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
    const [tempDate, setTempDate] = useState(new Date());

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

    const pickImage = async () => {
        const res = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
            allowsMultipleSelection: true,
        });

        if (!res.canceled) {
            const newImages = res.assets.map(a => a.uri);
            setImages(prev => [...prev, ...newImages]);
        }
    };

    const takePhoto = async () => {
        const res = await ImagePicker.launchCameraAsync({
            quality: 0.7,
        });

        if (!res.canceled) {
            setImages(prev => [...prev, res.assets[0].uri]);
        }
    };

    const removeImage = (index: number) => {
        setImages(prev => prev.filter((_, i) => i !== index));
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
                // Small delay to ensure the previous picker is gone before opening the next one on Android
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
            // iOS
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
        setPickerTarget(type);
        setTempDate(new Date());
        if (Platform.OS === 'android') {
            setPickerMode('date');
        }
        setShowPicker(true);
    };

    const toggleFoodOption = (key: keyof typeof foodOptions) => {
        setFoodOptions((prev: any) => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSubmit = async () => {
        try {
            if (!safeFood) {
                setSafeFoodError(true);
                return;
            }

            if (!siteId) {
                Alert.alert('Error', 'Site not found');
                return;
            }

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

            const foodItems = items
                .filter(i => i.qty > 0)
                .map(i => ({
                    category: i.name,
                    totalQtyKg: i.qty,
                    remainingQtyKg: i.qty,
                }));

            const payload = {
                siteId: Number(siteId),
                foodItems,
                pickupAddress: location,
                bestBefore: bestBefore.toISOString(),
                pickupFromTime: pickupFrom.toISOString(),
                pickupByTime: pickupTo.toISOString(),
                needsRefrigeration: foodOptions.refrigeration,
                needsReheating: foodOptions.reheating,
                containsAllergens: foodOptions.allergens,
            };

            const response = await foodListingService.createListing(payload);

            if (response.data) {
                navigation.navigate('ListingConfirmation', {
                    listing: response.data, 
                });
            } else {
                throw new Error('No data received from server');
            }

        } catch (error: any) {
            Alert.alert(
                'Error', 
                error?.response?.data?.message || error.message || 'Failed to create listing'
            );
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

    React.useEffect(() => {
        foodListingService.getListings({ page: 1, limit: 1 })
            .then(res => setHasPreviousListing((res.data?.listings?.length ?? 0) > 0))
            .catch(() => setHasPreviousListing(false));
    }, []);

    const handleRelist = async () => {
        try {
            const res = await foodListingService.getListings({
                page: 1,
                limit: 1,
            });

            const latest = res.data?.listings?.[0];

            if (!latest) {
                Alert.alert('No previous listing found');
                return;
            }

            await foodListingService.relist(latest.id, {
                bestBefore: new Date(
                    Date.now() + 4 * 60 * 60 * 1000
                ).toISOString(),
            });

            Alert.alert('Success', 'Listing relisted');
            navigation.goBack();
        } catch (error: any) {
            Alert.alert('Error', error?.response?.data?.message || 'Failed to relist');
        }
    };

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
                        onPress={() => navigation.navigate('RestaurantListings')}
                    >
                        <Ionicons name="arrow-back" size={22} color={palette.white} />
                    </Pressable>

                    <AppText variant="heading" style={styles.headerTitle}>
                        Today's Surplus
                    </AppText>

                    <AppText variant="bodyLarge" style={styles.headerSubText}>
                        Add what’s left and we’ll do the rest - we’ll notify nearby charities to come & collect
                    </AppText>
                </ImageBackground>


                {/* SAME AS YESTERDAY - only show when a previous listing exists */}
                {hasPreviousListing && (
                    <Card style={[styles.card, styles.centerCard]}>
                        <AppText variant="bodyBold" style={styles.centerText}>Same as yesterday?</AppText>

                        <View style={styles.centerRow}>
                            <Pressable style={styles.primaryBtn} onPress={handleRelist}>
                                <AppText variant="caption" style={styles.primaryText}>Yes, list again</AppText>
                            </Pressable>
                        </View>
                    </Card>
                )}

                {/* WHAT DO YOU HAVE */}
                <View style={styles.section}>
                    <AppText variant="heading">What do you have?</AppText>

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
                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateQty(index, -0.5)}
                                    >
                                        <AppText variant="bodyLarge">-</AppText>
                                    </Pressable>

                                    <AppText variant="bodyLarge" style={styles.qtyValue}>
                                        {item.qty % 1 === 0 ? item.qty.toFixed(0) : item.qty.toFixed(1)}
                                    </AppText>

                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateQty(index, 0.5)}
                                    >
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
                            <AppText variant="h2">
                                {totalQuantity} kg
                            </AppText>

                        </View>

                        <AppText variant="caption">
                            Estimate total weight of surplus food
                        </AppText>
                    </Card>
                </View>

                {/* PHOTO */}
                <View style={styles.section}>
                    <AppText variant="heading">Add Photo (optional)</AppText>

                    <Card style={styles.card}>
                        <View style={styles.imageGrid}>
                            {images.map((img, index) => (
                                <View key={index}>
                                    <View style={styles.imageWrapper}>
                                        <Image source={{ uri: img }} style={styles.previewSmall} />
                                        <Pressable
                                            style={styles.removeIcon}
                                            onPress={() => removeImage(index)}
                                        >
                                            <Ionicons name="close" size={12} color="white" />
                                        </Pressable>
                                    </View>
                                </View>
                            ))}

                            <Pressable style={styles.addImageBox} onPress={pickImage}>
                                <AppText>+</AppText>
                            </Pressable>
                        </View>
                        <View style={styles.row}>
                            <Pressable style={styles.secondaryBtn} onPress={pickImage}>
                                <AppText variant="bodyLarge" style={styles.btnTextCenter}>Gallery</AppText>
                            </Pressable>

                            <Pressable style={styles.primaryBtn} onPress={takePhoto}>
                                <AppText variant="bodyLarge" style={[styles.btnTextCenter, { color: 'white' }]}>Camera</AppText>
                            </Pressable>
                        </View>

                        <AppText variant="caption">
                            Photos help charities plan collections
                        </AppText>
                    </Card>
                </View>

                {/* LOCATION */}
                <View style={styles.section}>
                    <AppText variant="heading"> 📍 Pickup Location</AppText>

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
                    <Pressable
                        style={styles.timeInputFull}
                        onPress={() => openDateTimePicker('bestBefore')}
                    >
                        <Ionicons name="time-outline" size={20} color={palette.middlegreen} style={{ marginRight: wp(2) }} />
                        <AppText variant='bodyLarge'>
                            {bestBefore ? formatDateTime(bestBefore) : 'Select best before date & time'}
                        </AppText>
                    </Pressable>
                </View>

                {/* PICKUP WINDOW */}
                <View style={styles.section}>
                    <AppText variant="bodyBold" style={{ marginBottom: hp(0.5) }}>Pickup Window</AppText>
                    <View style={styles.pickupCard}>
                        <View style={styles.pickupTimeRow}>
                            <Pressable 
                                style={styles.timePart} 
                                onPress={() => openDateTimePicker('from')}
                            >
                                <AppText variant="caption" color={palette.midgray}>From</AppText>
                                <AppText variant="bodyBold" style={{ fontSize: normalize(12) }}>
                                    {pickupFrom ? formatDate(pickupFrom) : 'Date'}
                                </AppText>
                                <AppText variant="bodyBold">{pickupFrom ? formatTime(pickupFrom) : '--:--'}</AppText>
                            </Pressable>

                            <View style={styles.verticalDivider} />

                            <Pressable 
                                style={styles.timePart} 
                                onPress={() => openDateTimePicker('to')}
                            >
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
                            {
                                key: 'refrigeration',
                                label: 'Needs refrigeration ❄',
                            },
                            {
                                key: 'reheating',
                                label: 'Needs reheating 🔥',
                            },
                            {
                                key: 'allergens',
                                label: 'Contains allergens ⚠',
                            },
                            {
                                key: 'glutenFree',
                                label: 'Gluten-free ✅',
                            }
                        ].map((item) => (
                            <Pressable
                                key={item.key}
                                style={styles.checkboxRow}
                                onPress={() =>
                                    toggleFoodOption(
                                        item.key as keyof typeof foodOptions
                                    )
                                }
                            >
                                <View style={styles.checkbox}>
                                    {foodOptions[
                                        item.key as keyof typeof foodOptions
                                    ] && (
                                            <Ionicons
                                                name="checkmark"
                                                size={14}
                                                color={palette.middlegreen}
                                            />
                                        )}
                                </View>

                                <AppText variant="bodyLarge">
                                    {item.label}
                                </AppText>
                            </Pressable>
                        ))}

                        {/* OTHER BUTTON */}
                        <Pressable
                            style={styles.checkboxRow}
                            onPress={() =>
                                setOtherFoodDetail(prev => !prev)
                            }
                        >
                            <View style={styles.checkbox}>
                                {otherFoodDetail && (
                                    <Ionicons
                                        name="checkmark"
                                        size={14}
                                        color={palette.middlegreen}
                                    />
                                )}
                            </View>

                            <AppText variant="bodyLarge">
                                Other
                            </AppText>
                        </Pressable>

                        {otherFoodDetail && (
                            <TextInput
                                placeholder="Add custom food details (optional)..."
                                value={customFoodDetail}
                                onChangeText={setCustomFoodDetail}
                                multiline
                                textAlignVertical="top"
                                style={styles.commentInputa}
                            />
                        )}


                    </Card>
                </View>

                {/* SAFETY CHECK */}
                <Pressable
                    style={styles.checkboxRow}
                    onPress={() => {
                        setSafeFood(!safeFood);
                        if (safeFoodError) setSafeFoodError(false);
                    }}
                >
                    <View style={styles.checkbox}>
                        {safeFood && (
                            <Ionicons name="checkmark" size={14} color={palette.eggplant} />
                        )}
                    </View>

                    <AppText variant="bodyLarge" style={styles.subtext}>
                        This food has been stored safely and is suitable for donation
                    </AppText>
                </Pressable>

                {safeFoodError && (
                    <AppText variant="h6" style={styles.errorText}>
                        You must confirm food safety before creating a listing.
                    </AppText>
                )}

                {/* SUBMIT */}
                <Pressable
                    style={[
                        styles.submitBtn,
                        !safeFood && { backgroundColor: palette.midgray, opacity: 0.7 }
                    ]}
                    onPress={handleSubmit}
                    disabled={!safeFood}
                >
                    <AppText variant="h7" style={styles.submitText}>
                        Create Listing
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
                        is24Hour={false}
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

    centerCard: {
        marginHorizontal: wp(4),
        alignItems: 'center',
    },

    centerText: {
        textAlign: 'center',
    },

    centerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
    },

    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: wp(2),
    },

    backBtn: {
        padding: 4,
        marginTop: 4,
    },

    subtext: {
        opacity: 0.7,
        fontSize: normalize(14),
        width: wp(85),
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

    row: {
        flexDirection: 'row',
        gap: wp(4),
    },

    primaryBtn: {
        backgroundColor: palette.middlegreen,
        padding: hp(1.8),
        borderRadius: normalize(12),
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    primaryText: {
        color: 'white',
        fontSize: normalize(14),
        textAlign: 'center',
    },

    secondaryBtn: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: hp(1.2),
        borderRadius: normalize(12),
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    btnTextCenter: {
        textAlign: 'center',
    },

    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: wp(3),
    },
    kgHeader: {
        width: normalize(32) * 2 + normalize(40) + wp(6),
        textAlign: 'center',
        opacity: 0.5,
        fontSize: normalize(12),
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
        borderColor: palette.black,
        alignItems: 'center',
        justifyContent: 'center',
    },
    input: {
        borderWidth: 1,
        borderColor: palette.black,
        backgroundColor: 'white',
        borderRadius: normalize(12),
        padding: wp(3),
        justifyContent: 'center',
        minHeight: hp(6),
    },

    customInput: {
        width: wp(40),
        borderWidth: 1,
        borderColor: palette.black,
        backgroundColor: 'white',
        borderRadius: normalize(12),
        padding: wp(3),
        justifyContent: 'center',
        minHeight: hp(6),
    },

    quantityBox: {
        backgroundColor: '#F3EEFF',
        padding: wp(4),
        borderRadius: normalize(12),
        alignItems: 'center',
    },

    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: wp(4),
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

    addRow: {
        flexDirection: 'row',
        gap: wp(3),
    },

    addBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: wp(4),
        borderRadius: normalize(8),
        justifyContent: 'center',
    },

    commentInput: {
        borderWidth: 1,
        borderColor: palette.black,
        backgroundColor: palette.white,
        borderRadius: normalize(12),
        padding: wp(4),
        minHeight: hp(12),
        maxWidth: wp(60),
        marginTop: hp(1),
        fontSize: normalize(14),
    },
    commentInputa: {
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
    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: wp(2),
    },

    previewSmall: {
        width: wp(18),
        height: wp(18),
        borderRadius: normalize(8),
    },

    addImageBox: {
        width: wp(18),
        height: wp(18),
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: normalize(8),
    },

    imageWrapper: {
        position: 'relative',
    },

    removeIcon: {
        position: 'absolute',
        top: -normalize(6),
        right: -normalize(6),
        backgroundColor: '#7B3FE4',
        width: normalize(20),
        height: normalize(20),
        borderRadius: normalize(10),
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },

    errorText: {
        color: palette.chilli,
        fontSize: normalize(12),
        marginHorizontal: wp(4),
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
    },
    pickupCard: {
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: normalize(12),
        overflow: 'hidden',
    },
    pickupDateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: wp(4),
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
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
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
    },
    pickupRow: {
        flexDirection: 'row',
        padding: wp(4),
        alignItems: 'center',
    },
    pickupLabelSide: {
        width: wp(15),
        alignItems: 'center',
        borderRightWidth: 1,
        borderRightColor: '#F1F5F9',
        paddingRight: wp(2),
    },
    pickupActionSide: {
        flex: 1,
        paddingLeft: wp(4),
    },
    pickupSubButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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