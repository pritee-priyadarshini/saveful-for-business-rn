import React from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
    ImageBackground,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';

import { spacing } from '../../theme/spacing';
import { palette } from '@/theme/colors';

export function ListingConfirmationScreen({ navigation, route }: any) {
    const { items, pickupFrom, pickupTo, location, totalKg } = route.params;

    const meals = Math.floor((totalKg * 1000) / 300);

    const formatDateTime = (date: Date) => {
        return new Date(date).toLocaleString([], {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Screen backgroundColor={palette.creme}>
            <ScrollView contentContainerStyle={styles.container}>

                {/* HEADER */}
                <ImageBackground
                    source={require('../../../assets/placeholder/feed-bg.png')}
                    style={styles.headerBg}
                    resizeMode="cover"
                >
                    <AppText variant="h4" style={styles.headerTitle}>
                        Surplus Listed
                    </AppText>
                </ImageBackground>

                <View style={styles.subHeader}>
                    <AppText variant="bodyLarge" style={styles.center}>
                        Your surplus is now live and we have notified nearby charities.
                    </AppText>

                    <AppText variant="bodyLarge" style={styles.center}>
                        We’ll let you know as soon as someone claims it.
                    </AppText>
                </View>

                {/* SUMMARY CARD */}
                <Card style={styles.card}>

                    {/* ITEMS */}
                    <View style={styles.section}>
                        <AppText variant="bodyBold">Items</AppText>

                        {items
                            .filter((i: any) => i.qty > 0)
                            .map((item: any, index: number) => (
                                <View key={index} style={styles.itemRow}>
                                    <AppText variant="caption">
                                        {item.name}
                                    </AppText>

                                    <AppText variant="caption" style={styles.qtyText}>
                                        {item.qty} kg
                                    </AppText>
                                </View>
                            ))}
                    </View>

                    {/* PICKUP */}
                    <View style={styles.section}>
                        <AppText variant="bodyBold">Pickup Time</AppText>
                        <AppText variant="caption">
                            {formatDateTime(pickupFrom)} - {formatDateTime(pickupTo)}
                        </AppText>
                    </View>

                    {/* LOCATION */}
                    <View style={styles.section}>
                        <AppText variant="bodyBold">Pickup Location</AppText>
                        <AppText variant="caption">{location}</AppText>
                    </View>

                </Card>

                {/* IMPACT */}
                <Card style={styles.impactCard}>

                    <View style={styles.impactContainer}>

                        {/* LEFT SIDE */}
                        <View style={styles.impactLeft}>
                            <AppText variant="bodyBold">
                                Your Listing can create up to
                            </AppText>

                            <View style={styles.mealPill}>
                                <AppText variant="h5" style={styles.mealText}>
                                    {meals} meals
                                </AppText>
                            </View>

                            <AppText variant="caption">
                                (300g = 1 meal)
                            </AppText>
                        </View>

                        {/* RIGHT SIDE */}
                        <Image
                            source={require('../../../assets/placeholder/bowl.png')}
                            style={styles.bowlImage}
                            resizeMode="contain"
                        />

                    </View>

                </Card>

                {/* ACTIONS */}
                <View style={styles.actions}>

                    <Pressable
                        style={styles.primaryBtn}
                        onPress={() => navigation.navigate('CreateListing')}
                    >
                        <AppText variant="caption" style={styles.primaryText}>
                            + List More Surplus
                        </AppText>
                    </Pressable>

                    <Pressable
                        style={styles.secondaryBtn}
                        onPress={() => navigation.navigate('RestaurantListings')}
                    >
                        <AppText variant="caption">Go to Listing</AppText>
                    </Pressable>

                </View>

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

    headerTitle: {
        color: palette.white,
        textAlign: 'center',
    },

    subHeader: {
        alignItems: 'center',
        gap: spacing.xs,
    },

    center: {
        textAlign: 'center',
    },

    card: {
        padding: spacing.md,
        marginHorizontal: spacing.md,
        borderRadius: 16,
        gap: spacing.md,
    },

    section: {
        gap: spacing.xs,
    },

    impactCard: {
        padding: spacing.lg,
        marginHorizontal: spacing.md,
        borderRadius: 20,
        alignItems: 'center',
        backgroundColor: '#EEE7FF',
    },

    impactContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    impactLeft: {
        flex: 1,
        gap: spacing.sm,
    },

    mealPill: {
        backgroundColor: palette.middlegreen,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 999,
        alignSelf: 'flex-start',
    },

    mealText: {
        color: palette.white,
    },

    bowlImage: {
        width: 80,
        height: 80,
    },

    actions: {
        gap: spacing.md,
    },

    primaryBtn: {
        backgroundColor: palette.middlegreen,
        borderColor: palette.black,
        marginHorizontal: spacing.md,
        padding: spacing.md,
        borderRadius: 16,
        alignItems: 'center',
    },

    primaryText: {
        color: 'white',
    },

    secondaryBtn: {
        borderWidth: 1,
        borderColor: palette.black,
        padding: spacing.md,
        marginHorizontal: spacing.md,
        borderRadius: 16,
        alignItems: 'center',
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    qtyText: {
        fontWeight: '600',
    },
});