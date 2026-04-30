import React, { useMemo, useState } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ImageBackground,
    TextInput,
    Image,
    ScrollView,
} from 'react-native';

import * as ImagePicker from 'expo-image-picker';

import { Screen } from '../../components/Screen';
import { AppText } from '../../components/AppText';
import { Button } from '../../components/Button';

import { palette } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { DriverStackParamList } from '@/navigation/types';

type PickupItem = {
    name: string;
    qty: number;
};

type Props = NativeStackScreenProps<DriverStackParamList, 'DriverPickupConfirm'>;

export function DriverPickupConfirmScreen({ route, navigation }: Props) {
    const { pickup, onConfirm } = route.params;

    const [items, setItems] = useState<PickupItem[]>(
        pickup.items.map((i: PickupItem) => ({ ...i }))
    );

    const [photos, setPhotos] = useState<string[]>([]);
    const [notes, setNotes] = useState<string>('');
    const [rating, setRating] = useState<number>(0);

    const totalQty = useMemo(() => {
        return items.reduce((sum: number, item: PickupItem) => {
            return sum + item.qty;
        }, 0);
    }, [items]);

    const updateQty = (index: number, val: number) => {
        setItems((prev: PickupItem[]) =>
            prev.map((item: PickupItem, i: number) =>
                i === index
                    ? {
                        ...item,
                        qty: Math.max(
                            0,
                            Math.min(val, pickup.items[i].qty)
                        ),
                    }
                    : item
            )
        );
    };

    /* IMAGE PICKER */
    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.7,
        });

        if (!result.canceled) {
            setPhotos((prev) => [...prev, result.assets[0].uri]);
        }
    };

    const removeImage = (uri: string) => {
        setPhotos((prev) => prev.filter((p) => p !== uri));
    };

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView contentContainerStyle={{ paddingBottom: spacing.lg }}>

                {/* HEADER */}
                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.headerBg}
                >
                    <TouchableOpacity
                        style={styles.backBtn}
                        onPress={() => {
                            onConfirm?.(pickup.id);
                            navigation.goBack();
                        }}
                    >
                        <Ionicons name="arrow-back" size={22} color={"#fff"} />
                    </TouchableOpacity>

                    <AppText variant="h5" style={styles.headerText}>
                        Today Pickup
                    </AppText>
                </ImageBackground>

                <View style={{ padding: spacing.md }}>

                    {/* LOCATION */}
                    <View style={styles.card}>
                        <AppText variant='label'>Pickup Location</AppText>

                        <View style={styles.locationPill}>
                            <AppText variant='bodySmall'>{pickup.title}</AppText>
                        </View>

                        <AppText variant="bodySmall"> 📍 {pickup.address}</AppText>
                    </View>

                    {/* ITEMS */}
                    <View style={styles.card}>
                        <AppText variant='label'>📦 What did you pickup?</AppText>

                        {items.map((item: PickupItem, i: number) => (
                            <View key={i} style={styles.rowBetween}>
                                <AppText variant='bodyLarge'>{item.name}</AppText>

                                <View style={styles.counterPill}>
                                    <TouchableOpacity
                                        onPress={() => updateQty(i, item.qty - 1)}
                                    >
                                        <AppText variant='h6'>−</AppText>
                                    </TouchableOpacity>

                                    <View style={styles.qtyPill}>
                                        <AppText variant='label'>{item.qty}</AppText>
                                    </View>

                                    <TouchableOpacity
                                        onPress={() => updateQty(i, item.qty + 1)}
                                    >
                                        <AppText variant='h6'>+</AppText>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ))}

                        <View style={styles.divider} />

                        <View style={styles.rowBetween}>
                            <AppText variant="bodyBold">Total</AppText>
                            <AppText variant="bodyBold">{totalQty} kg</AppText>
                        </View>
                    </View>

                    {/* PHOTOS */}
                    <View style={styles.card}>
                        <AppText variant='label'>📷 Upload Photos</AppText>

                        <View style={styles.imageRow}>
                            {photos.map((uri, i) => (
                                <View key={i}>
                                    <Image source={{ uri }} style={styles.image} />
                                    <TouchableOpacity
                                        style={styles.removeBtn}
                                        onPress={() => removeImage(uri)}
                                    >
                                        <AppText style={{ color: palette.white }}>✕</AppText>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </View>

                        <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
                            <AppText variant='label'>Add Photo</AppText>
                        </TouchableOpacity>
                    </View>

                    {/* NOTES */}
                    <View style={styles.card}>
                        <AppText variant='label'>Notes</AppText>

                        <TextInput
                            placeholder="Add notes..."
                            value={notes}
                            onChangeText={setNotes}
                            style={styles.input}
                            multiline
                        />
                    </View>

                    {/* RATING */}
                    <View style={styles.card}>
                        <AppText variant='label'>How was your pickup?</AppText>

                        <View style={styles.ratingRow}>
                            {[1, 2, 3, 4, 5].map((i: number) => (
                                <TouchableOpacity
                                    key={i}
                                    onPress={() => setRating(i)}
                                    activeOpacity={0.7}
                                >
                                    <AppText
                                        style={[
                                            styles.tomato,
                                            {
                                                opacity: i <= rating ? 1 : 0.3,
                                                transform: [{ scale: i <= rating ? 1.1 : 1 }],
                                            },
                                        ]}
                                    >
                                        🍅
                                    </AppText>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* CTA */}
                    <Button
                        label="Confirm Pickup"
                        style={styles.confirmBtn}
                        onPress={() => {
                            onConfirm?.(pickup.id);
                            navigation.goBack();
                        }}
                    />
                </View>
            </ScrollView>
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

    backBtn: {
        position: 'absolute',
        left: spacing.md,
        top: spacing.lg,
    },

    card: {
        backgroundColor: palette.white,
        borderWidth: 1,
        borderColor: palette.border,
        borderRadius: 16,
        padding: spacing.md,
        marginBottom: spacing.md,
        gap: spacing.sm,
    },

    locationPill: {
        backgroundColor: palette.radish,
        padding: spacing.sm,
        borderRadius: 10,
    },

    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    counterPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: palette.radish,
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 10,
    },

    qtyPill: {
        backgroundColor: palette.white,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
    },

    divider: {
        height: 1,
        backgroundColor: palette.border,
        marginVertical: spacing.sm,
    },

    imageRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },

    image: {
        width: 70,
        height: 70,
        margin: 4,
        borderRadius: 10,
    },

    removeBtn: {
        position: 'absolute',
        right: 2,
        top: 2,
        backgroundColor: palette.primary,
        borderRadius: 10,
        padding: 2,
    },

    addPhotoBtn: {
        marginTop: spacing.sm,
        backgroundColor: palette.middlegreen,
        padding: spacing.sm,
        borderRadius: 10,
        alignItems: 'center',
    },

    input: {
        backgroundColor: palette.radish,
        borderRadius: 12,
        padding: spacing.sm,
        minHeight: 80,
    },

    ratingRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: spacing.sm,
    },


    tomato: {
        fontSize: 28,
        lineHeight: 34,
    },

    confirmBtn: {
        marginTop: spacing.md,
        backgroundColor: palette.middlegreen,
    },
});