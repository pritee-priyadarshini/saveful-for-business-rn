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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { DateTimePickerAndroid } from '@react-native-community/datetimepicker';


import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';
import { useAppContext } from '../../store/AppContext';

import { spacing } from '../../theme/spacing';
import { palette } from '@/theme/colors';

export function CreateListingScreen({ navigation }: any) {
    const { currentProfile } = useAppContext();

    const isFirstTime = false;

    const [customItem, setCustomItem] = useState('');
    const [location, setLocation] = useState(currentProfile.address);
    const [images, setImages] = useState<string[]>([]);

    const [pickupFrom, setPickupFrom] = useState<Date | null>(null);
    const [pickupTo, setPickupTo] = useState<Date | null>(null);

    const [items, setItems] = useState([
        { name: 'Prepared meals', qty: 0 },
        { name: 'Baked goods', qty: 0 },
        { name: 'Fresh fruit & vegetables', qty: 0 },
        { name: 'Meat & dairy', qty: 0 },
    ]);

    const [foodOptions, setFoodOptions] = useState({
        refrigeration: false,
        reheating: false,
        allergens: false,
        glutenFree: false,
    });

    const [safeFood, setSafeFood] = useState(false);
    const [safeFoodError, setSafeFoodError] = useState(false);

    const updateQty = (index: number, change: number) => {
        const updated = [...items];
        updated[index].qty = Math.max(0, updated[index].qty + change);
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

    const openDateTimePicker = (type: 'from' | 'to') => {
        DateTimePickerAndroid.open({
            value: new Date(),
            mode: 'date',
            is24Hour: true,
            onChange: (_, selectedDate) => {
                if (selectedDate) {
                    DateTimePickerAndroid.open({
                        value: selectedDate,
                        mode: 'time',
                        is24Hour: true,
                        onChange: (_, selectedTime) => {
                            if (selectedTime) {
                                const finalDate = new Date(selectedDate);
                                finalDate.setHours(selectedTime.getHours());
                                finalDate.setMinutes(selectedTime.getMinutes());

                                if (type === 'from') setPickupFrom(finalDate);
                                else setPickupTo(finalDate);
                            }
                        },
                    });
                }
            },
        });
    };

    const toggleFoodOption = (key: keyof typeof foodOptions) => {
        setFoodOptions(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    };

    const handleSubmit = () => {
        if (!safeFood) {
            setSafeFoodError(true);
            return;
        }

        setSafeFoodError(false);

        const hasItems = items.some(item => item.qty > 0);
        if (!hasItems) {
            Alert.alert('Error', 'Please add at least one item');
            return;
        }

        if (!pickupFrom || !pickupTo) {
            Alert.alert('Error', 'Please select pickup time');
            return;
        }

        if (pickupTo <= pickupFrom) {
            Alert.alert(
                'Invalid Time',
                'Pickup end must be after start'
            );
            return;
        }

        if (!location?.trim()) {
            Alert.alert('Error', 'Please enter pickup location');
            return;
        }

        const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);

        if (totalQuantity === 0) {
            Alert.alert('Error', 'Quantity cannot be zero');
            return;
        }

        navigation.replace('ListingConfirmation', {
            items,
            pickupFrom,
            pickupTo,
            location,
            totalKg: totalQuantity.toString(),
        });
    };

    const totalQuantity = items.reduce((sum, item) => sum + item.qty, 0);

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


                {/* SAME AS YESTERDAY */}
                <Card style={[styles.card, styles.centerCard]}>
                    <AppText variant="bodyBold" style={styles.centerText}>Same as yesterday?</AppText>

                    <View style={styles.centerRow}>
                        <Pressable style={styles.primaryBtn}>
                            <AppText variant="caption" style={styles.primaryText}>Yes, list again</AppText>
                        </Pressable>
                    </View>
                </Card>

                {/* WHAT DO YOU HAVE */}
                <View style={styles.section}>
                    <AppText variant="heading">What do you have (in kg)?</AppText>

                    <Card style={styles.card}>
                        {items.map((item, index) => (
                            <View key={index} style={styles.itemRow}>
                                <AppText variant="bodyLarge">{item.name}</AppText>

                                <View style={styles.qtyContainer}>
                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateQty(index, -1)}
                                    >
                                        <AppText variant="bodyLarge">-</AppText>
                                    </Pressable>

                                    <AppText variant="bodyLarge">{item.qty}</AppText>

                                    <Pressable
                                        style={styles.qtyBtn}
                                        onPress={() => updateQty(index, 1)}
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
                                style={styles.input}
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
                                <AppText variant="bodyLarge">Gallery</AppText>
                            </Pressable>

                            <Pressable style={styles.primaryBtn} onPress={takePhoto}>
                                <AppText variant="bodyLarge" style={{ color: 'white' }}>Camera</AppText>
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
                <View style={styles.section}>
                        <AppText variant="heading"> ⏱️ Pickup Time</AppText>
                        <View style={styles.row}>

                            {/* FROM */}
                            <Pressable
                                style={[styles.input, { flex: 1 }]}
                                onPress={() => openDateTimePicker('from')}
                            >
                                <AppText variant="bodyLarge">
                                    {pickupFrom
                                        ? pickupFrom.toLocaleString()
                                        : 'From'}
                                </AppText>
                            </Pressable>

                            {/* TO */}
                            <Pressable
                                style={[styles.input, { flex: 1 }]}
                                onPress={() => openDateTimePicker('to')}
                            >
                                <AppText variant="bodyLarge">
                                    {pickupTo
                                        ? pickupTo.toLocaleString()
                                        : 'To'}
                                </AppText>
                            </Pressable>

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
                            { key: 'glutenFree', label: 'Gluten free 🌾' },
                        ].map((item) => (
                            <Pressable
                                key={item.key}
                                style={styles.checkboxRow}
                                onPress={() => toggleFoodOption(item.key as any)}
                            >
                                <View style={styles.checkbox}>
                                    {foodOptions[item.key as keyof typeof foodOptions] && (
                                        <Ionicons name="checkmark" size={14} color={palette.middlegreen} />
                                    )}
                                </View>
                                <AppText variant="bodyLarge">{item.label}</AppText>
                            </Pressable>
                        ))}
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
                <Pressable style={styles.submitBtn} onPress={handleSubmit}>
                    <AppText variant="h7" style={styles.submitText}>
                        Create Listing
                    </AppText>
                </Pressable>

            </ScrollView>
        </Screen>
    );
}

const styles = StyleSheet.create({
    container: {
        gap: spacing.lg,
    },

    headerBg: {
        width: '100%',
        height: 160,
        justifyContent: 'center',
        alignItems: 'center',
    },

    backButton: {
        position: 'absolute',
        top: spacing.lg,
        left: spacing.lg,
    },

    headerTitle: {
        color: palette.white,
        textAlign: 'center',
        margin: 4,
    },

    headerSubText: {
        color: palette.white,
        opacity: 0.9,
        margin: 4,
        textAlign: 'center',
    },

    centerCard: {
        marginHorizontal: spacing.md,
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
        gap: spacing.sm,
    },

    backBtn: {
        padding: 4,
        marginTop: 4,
    },

    subtext: {
        opacity: 0.7,
    },

    section: {
        marginHorizontal: spacing.md,
        gap: spacing.sm,
    },

    card: {
        padding: spacing.md,
        borderRadius: 16,
        gap: spacing.md,
    },

    row: {
        flexDirection: 'row',
        gap: spacing.md,
    },

    primaryBtn: {
        backgroundColor: palette.middlegreen,
        padding: spacing.md,
        borderRadius: 12,
    },

    primaryText: {
        color: 'white',
    },

    secondaryBtn: {
        borderWidth: 1,
        borderColor: '#ccc',
        padding: spacing.sm,
        borderRadius: 12,
    },

    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    qtyContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },

    qtyBtn: {
        width: 30,
        height: 30,
        borderRadius: 8,
        backgroundColor: '#EEE7FF',
        borderColor: palette.black,
        alignItems: 'center',
        justifyContent: 'center',
    },

    input: {
        borderWidth: 1,
        borderColor: palette.black,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: spacing.sm,
        justifyContent: 'center',
        minHeight: 46,
    },

    quantityBox: {
        backgroundColor: '#F3EEFF',
        padding: spacing.md,
        borderRadius: 12,
        alignItems: 'center',
    },

    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: spacing.md,
        gap: spacing.sm,
    },

    checkbox: {
        width: 18,
        height: 18,
        borderWidth: 1,
        borderRadius: 4,
        borderColor: palette.black,
        backgroundColor: palette.white,
        alignItems: 'center',
        justifyContent: 'center',
    },

    submitBtn: {
        backgroundColor: palette.middlegreen,
        padding: spacing.md,
        marginHorizontal: spacing.md,
        borderRadius: 16,
        alignItems: 'center',
    },

    submitText: {
        color: 'white',
    },

    addRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },

    addBtn: {
        backgroundColor: palette.middlegreen,
        paddingHorizontal: 12,
        borderRadius: 8,
        justifyContent: 'center',
    },

    imageGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
    },

    previewSmall: {
        width: 70,
        height: 70,
        borderRadius: 8,
    },

    addImageBox: {
        width: 70,
        height: 70,
        borderWidth: 1,
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 8,
    },

    imageWrapper: {
        position: 'relative',
    },

    removeIcon: {
        position: 'absolute',
        top: -6,
        right: -6,
        backgroundColor: '#7B3FE4',
        width: 18,
        height: 18,
        borderRadius: 9,
        alignItems: 'center',
        justifyContent: 'center',
    },

    errorText: {
        color: palette.chilli,
        fontSize: 12,
        marginHorizontal: spacing.md,
    },

});