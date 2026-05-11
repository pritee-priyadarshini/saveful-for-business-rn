import React from 'react';
import {
    View,
    StyleSheet,
    Pressable,
    ScrollView,
    Image,
    ImageBackground,
    Dimensions,
} from 'react-native';

import { AppText } from '../../components/AppText';
import { Screen } from '../../components/Screen';
import { Card } from '../../components/Card';

import { spacing } from '../../theme/spacing';
import { palette } from '@/theme/colors';

const { width, height } = Dimensions.get('window');
const wp = (p: number) => (width * p) / 100;
const hp = (p: number) => (height * p) / 100;
const normalize = (size: number) => {
  const scale = width / 375;
  return Math.round(size * scale);
};

export function ListingConfirmationScreen({ navigation, route }: any) {
    const { listing } = route.params || {};

    if (!listing) {
        return (
            <Screen backgroundColor={palette.creme}>
                <View style={styles.container}>
                    <AppText>No listing data found.</AppText>
                    <Pressable onPress={() => navigation.navigate('RestaurantHomeScreen')}>
                        <AppText color={palette.primary}>Back to Home</AppText>
                    </Pressable>
                </View>
            </Screen>
        );
    }

    const totalKg = listing?.totalQtyKg || 
                  listing?.foodItems?.reduce((sum: number, item: any) => sum + (item.totalQtyKg || 0), 0) || 0;
    const meals = Math.floor((totalKg * 1000) / 300);

    const formatDateTime = (date: any) => {
        if (!date) return 'N/A';
        try {
            return new Date(date).toLocaleString([], {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch (e) {
            return 'N/A';
        }
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

                        {listing?.foodItems?.map((item: any, index: number) => (
                            <View key={index} style={styles.itemRow}>
                                <AppText variant="caption">
                                    {item.category}
                                </AppText>

                                <AppText
                                    variant="caption"
                                    style={styles.qtyText}
                                >
                                    {item.totalQtyKg} kg
                                </AppText>
                            </View>
                        ))}
                    </View>

                    {/* PICKUP */}
                    <View style={styles.section}>
                        <AppText variant="bodyBold">Pickup Time</AppText>
                        <AppText variant="caption">
                            {listing?.pickupFromTime ? formatDateTime(listing.pickupFromTime) : '--'} - {listing?.pickupByTime ? formatDateTime(listing.pickupByTime) : '--'}
                        </AppText>
                    </View>

                    {/* LOCATION */}
                    <View style={styles.section}>
                        <AppText variant="bodyBold">Pickup Location</AppText>
                        <AppText variant="caption">{listing?.pickupAddress || 'N/A'}</AppText>
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
        gap: hp(2),
        paddingBottom: hp(4),
    },

    headerBg: {
        width: '100%',
        height: hp(20),
        justifyContent: 'center',
        alignItems: 'center',
    },

    headerTitle: {
        color: palette.white,
        textAlign: 'center',
        fontSize: normalize(24),
    },

    subHeader: {
        alignItems: 'center',
        paddingHorizontal: wp(5),
        gap: hp(1),
        marginVertical: hp(2),
    },

    center: {
        textAlign: 'center',
        fontSize: normalize(14),
    },

    card: {
        padding: wp(4),
        marginHorizontal: wp(4),
        borderRadius: normalize(16),
        gap: hp(2),
    },

    section: {
        gap: hp(0.5),
    },

    impactCard: {
        padding: wp(5),
        marginHorizontal: wp(4),
        borderRadius: normalize(20),
        alignItems: 'center',
        backgroundColor: '#EEE7FF',
    },

    impactContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
    },

    impactLeft: {
        flex: 1,
        gap: hp(1),
    },

    mealPill: {
        backgroundColor: palette.middlegreen,
        paddingVertical: hp(0.8),
        paddingHorizontal: wp(3.5),
        borderRadius: normalize(20),
        alignSelf: 'flex-start',
    },

    mealText: {
        color: palette.white,
        fontSize: normalize(18),
    },

    bowlImage: {
        width: wp(20),
        height: wp(20),
    },

    actions: {
        gap: hp(2),
        marginVertical: hp(2),
    },

    primaryBtn: {
        backgroundColor: palette.middlegreen,
        marginHorizontal: wp(4),
        padding: hp(1.8),
        borderRadius: normalize(16),
        alignItems: 'center',
    },

    primaryText: {
        color: 'white',
        fontSize: normalize(16),
    },

    secondaryBtn: {
        borderWidth: 1,
        borderColor: palette.black,
        padding: hp(1.8),
        marginHorizontal: wp(4),
        borderRadius: normalize(16),
        alignItems: 'center',
    },

    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    qtyText: {
        fontWeight: '600',
        fontSize: normalize(14),
    },
});